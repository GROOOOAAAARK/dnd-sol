"use client"

import Link from "next/link"
import { Scroll, Sword, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

export default function Header() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: <Sword className="mr-2 h-4 w-4" /> },
    { href: "/create-character", label: "Create My Character", icon: <User className="mr-2 h-4 w-4" /> },
    { href: "/adventures", label: "Adventures", icon: <Scroll className="mr-2 h-4 w-4" /> },
  ]

  return (
    <header className="border-b border-accent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tighter text-primary">DnD Sol</h1>
        </Link>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/account">My Characters</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <WalletMultiButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav className="container flex h-10 items-center border-t border-accent">
        <ul className="flex gap-6">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
