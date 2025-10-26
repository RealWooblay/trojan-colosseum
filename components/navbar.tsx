"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConnectButton } from "@/components/wallet/connect-button"

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Home" },
    { href: "/markets", label: "Markets" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/create", label: "Create" },
    { href: "/docs", label: "Docs" },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-cyan-400/30 bg-black/90 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* TRON Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-cyan-400 transform rotate-45 group-hover:rotate-0 transition-transform duration-300"></div>
              <div className="absolute inset-1 border border-cyan-400/50 transform rotate-45"></div>
            </div>
            <div className="text-2xl font-bold font-mono tracking-wider">
              <span className="text-cyan-400 neon-glow">DIG</span>
            </div>
          </Link>

          {/* TRON Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  className={`px-4 py-2 font-mono tracking-wider text-sm transition-all duration-300 relative group ${pathname === link.href
                      ? "text-cyan-400 bg-cyan-400/10 neon-border"
                      : "text-white hover:text-cyan-300 hover:bg-cyan-400/5"
                    }`}
                >
                  <span className="relative z-10">{link.label.toUpperCase()}</span>
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </Link>
            ))}
          </div>

          {/* Connect Wallet */}
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}
