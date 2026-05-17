"use client";

import "@solana/wallet-adapter-react-ui/styles.css";
import { Cluster, clusterApiUrl } from "@solana/web3.js";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { localnet } from "@/config/chains";
import { useMemo } from "react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint =
    process.env.NEXT_SOLANA_CLUSTER == "localnet"
    ? localnet
    : clusterApiUrl(process.env.NEXT_SOLANA_CLUSTER as Cluster, true);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider autoConnect={true} wallets={wallets}>
        <WalletModalProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={true}
            disableTransitionOnChange
          >
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </ThemeProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
