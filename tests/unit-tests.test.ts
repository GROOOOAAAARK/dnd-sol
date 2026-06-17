import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { expect } from 'chai';
import type { DndSol } from '../target/types/dnd_sol';
import type { DiceRolling } from '../target/types/dice_rolling';

describe('dnd-sol', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DndSol as Program<DndSol>;
  const diceProgram = anchor.workspace.DiceRolling as Program<DiceRolling>;

  const airdrop = async (player: anchor.web3.Keypair) => {
    const sig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);
  };

  const characterPda = (player: anchor.web3.PublicKey, name: string) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('character'), player.toBuffer(), Buffer.from(name)],
      program.programId,
    )[0];

  const diceRollingPda = (player: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('dice_rolling'), player.toBuffer()],
      diceProgram.programId,
    )[0];

  it('initializes the contract', async () => {
    await program.methods
      .initialize()
      .accounts({
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it('rejects a character with stats that are too high', async () => {
    const player = anchor.web3.Keypair.generate();
    const name = 'Cheated Character';
    await airdrop(player);

    try {
      await program.methods
        .createCharacter(name, 'Wizard', 'Elf', 8, 12, 14, 16, 10, 9)
        .accounts({
          character: characterPda(player.publicKey, name),
          player: player.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player])
        .rpc();
      expect.fail('Expected stats-too-high rejection');
    } catch (error: any) {
      expect(error.toString()).to.include('Character stats are too high');
    }
  });

  it('rejects a character with stats that are too low', async () => {
    const player = anchor.web3.Keypair.generate();
    const name = 'Weak Character';
    await airdrop(player);

    try {
      await program.methods
        .createCharacter(name, 'Weak wacko', 'Orc', 1, 2, 1, 2, 1, 1)
        .accounts({
          character: characterPda(player.publicKey, name),
          player: player.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player])
        .rpc();
      expect.fail('Expected stats-too-low rejection');
    } catch (error: any) {
      expect(error.toString()).to.include('Character stats are too low');
    }
  });

  it('creates a character at the player/name PDA', async () => {
    const player = anchor.web3.Keypair.generate();
    const name = 'Peaceful Character';
    const character = characterPda(player.publicKey, name);
    await airdrop(player);

    await program.methods
      .createCharacter(name, 'Wizard', 'Elf', 3, 2, 1, 2, 1, 1)
      .accounts({
        character,
        player: player.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const characterAccount = await program.account.characterAccount.fetch(character);
    expect(characterAccount.player.toString()).to.equal(player.publicKey.toString());
    expect(characterAccount.character.attributes.name).to.equal(name);
    expect(Object.keys(characterAccount.character.attributes.class)[0]).to.equal('wizard');
    expect(characterAccount.character.stats.strength).to.equal(3);
    expect(characterAccount.character.stats.dexterity).to.equal(2);
    expect(characterAccount.character.stats.constitution).to.equal(1);
    expect(characterAccount.character.stats.intelligence).to.equal(2);
    expect(characterAccount.character.stats.wisdom).to.equal(1);
    expect(characterAccount.character.stats.charisma).to.equal(1);
    expect(characterAccount.character.attributes.level).to.equal(1);
    expect(characterAccount.character.attributes.experience).to.equal(0);
    expect(characterAccount.character.stats.health).to.equal(11);
    expect(characterAccount.character.stats.maxHealth).to.equal(11);
  });

  it('initializes dice state as a player PDA', async () => {
    const player = anchor.web3.Keypair.generate();
    await airdrop(player);

    const diceRolling = diceRollingPda(player.publicKey);
    await diceProgram.methods
      .initialize()
      .accounts({
        diceRolling,
        user: player.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const diceState = await diceProgram.account.diceRollingState.fetch(diceRolling);
    expect(diceState.allowedUser.toString()).to.equal(player.publicKey.toString());
    expect(diceState.latestRollResult).to.equal(0);
    expect(diceState.successFloor).to.equal(20);
  });

  it('builds a dnd action instruction with dice CPI accounts', async () => {
    const player = anchor.web3.Keypair.generate();
    const name = 'Instruction Character';
    const character = characterPda(player.publicKey, name);
    const diceRolling = diceRollingPda(player.publicKey);

    const ix = await program.methods
      .doAction(20, 15, 2)
      .accounts({
        player: player.publicKey,
        character,
        diceRollingState: diceRolling,
        randomnessAccountData: anchor.web3.Keypair.generate().publicKey,
        diceRollingProgram: diceProgram.programId,
      })
      .instruction();

    expect(ix.programId.toString()).to.equal(program.programId.toString());
    expect(ix.keys.map((key) => key.pubkey.toString())).to.include(diceRolling.toString());
  });
});
