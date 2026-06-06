.PHONY: crossbar-up localnet localnet-deploy airdrop-localnet dev

crossbar-up:
	SOLANA_DEVNET_RPC_URL=http://host.docker.internal:8899 docker compose -f docker/switchboard-crossbar.yml up

localnet:
	anchor build && anchor localnet --validator legacy

localnet-deploy:
	anchor deploy -u localhost

airdrop-localnet:
	solana airdrop -u localhost 20 $$(solana address)

dev:
	bun run dev
