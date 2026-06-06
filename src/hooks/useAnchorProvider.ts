"use client"

import { AnchorProvider } from "@coral-xyz/anchor"
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react"
import { useMemo } from "react"

export function useAnchorProvider() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  return useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
  }, [connection, wallet])
}
