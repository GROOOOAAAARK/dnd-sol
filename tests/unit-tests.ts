import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { DndSol } from '../target/types/dnd_sol';
import { expect } from 'chai';

describe('dnd-sol', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DndSol as Program<DndSol>;

  it('Initialize the contract', async() => {
    const [dnd, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('dnd_sol')],
        program.programId,
    )

    await program.methods
        .initialize()
        .accounts({
            payer: provider.wallet.publicKey,
        })
        .rpc()
  })

  it('Cannot create a character with stats that are too high', async () => {
    // Generate keypairs
    const player = anchor.web3.Keypair.generate();
    const character = anchor.web3.Keypair.generate();

    // Airdrop SOL to the player
    const airdropSig = await provider.connection.requestAirdrop(
        player.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Character data
    const name = "Cheated Character";
    const characterClass = "Wizard";
    const characterRace = "Elf";
    const strength = 8;
    const dexterity = 12;
    const constitution = 14;
    const intelligence = 16;
    const wisdom = 10;
    const charisma = 9;

    try {

      // Create the character
      await program.methods
          .createCharacter(
              name,
              characterClass,
              characterRace,
              strength,
              dexterity,
              constitution,
              intelligence,
              wisdom,
              charisma
          )
          .accounts({
              character: character.publicKey,
              player: player.publicKey,
          })
          .signers([player, character])
          .rpc();

    } catch (error) {
      // Verify the error is the one we expect
      expect(error.toString()).to.include("Character stats are too high");
    }
  });

  it('Cannot create a character with stats that are too low', async () => {

    // Generate keypairs
    const player = anchor.web3.Keypair.generate();
    const character = anchor.web3.Keypair.generate();

    // Airdrop SOL to the player
    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Character data with low stats (sum < 10)
    const name = "Weak Character";
    const characterClass = "Weak wacko";
    const characterRace = "Orc";
    const strength = 1;
    const dexterity = 2;
    const constitution = 1;
    const intelligence = 2;
    const wisdom = 1;
    const charisma = 1;

    try {
      // This should fail
      await program.methods.createCharacter(
        name,
        characterClass,
        characterRace,
        strength,
        dexterity,
        constitution,
        intelligence,
        wisdom,
        charisma
      )
      .accounts({
        character: character.publicKey,
        player: player.publicKey,
      })
      .signers([player, character])
      .rpc();

    } catch (error) {
      // Verify the error is the one we expect
      expect(error.toString()).to.include("Character stats are too low");
    }
  });

  it('Can create a character with valid stats', async () => {
    // Generate keypairs
    const player = anchor.web3.Keypair.generate();
    const character = anchor.web3.Keypair.generate();

    // Airdrop SOL to the player
    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Character data
    const name = "Peaceful Character";
    const characterClass = "Wizard";
    const characterRace = "Elf";
    const strength = 3;
    const dexterity = 2;
    const constitution = 1;
    const intelligence = 2;
    const wisdom = 1;
    const charisma = 1;

    // Create the character
    await program.methods.createCharacter(
      name,
      characterClass,
      characterRace,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma
    )
    .accounts({
      character: character.publicKey,
      player: player.publicKey,
    })
    .signers([character, player])
    .rpc();

    // Fetch the character account data
    const characterAccount = await program.account.characterAccount.fetch(character.publicKey);

    // Verify the character data
    expect(characterAccount.player.toString()).to.equal(player.publicKey.toString());
    expect(characterAccount.character.name).to.equal(name);
    expect(characterAccount.character.characterClass).to.equal(characterClass);
    expect(characterAccount.character.strength).to.equal(strength);
    expect(characterAccount.character.dexterity).to.equal(dexterity);
    expect(characterAccount.character.constitution).to.equal(constitution);
    expect(characterAccount.character.intelligence).to.equal(intelligence);
    expect(characterAccount.character.wisdom).to.equal(wisdom);
    expect(characterAccount.character.charisma).to.equal(charisma);
    expect(characterAccount.character.level).to.equal(1);
    expect(characterAccount.character.experience).to.equal(0);
    expect(characterAccount.character.health).to.equal(10 + constitution);
    expect(characterAccount.character.maxHealth).to.equal(10 + constitution);
  });
});
