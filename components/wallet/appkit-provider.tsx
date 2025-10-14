"use client"

import { useEffect } from "react"
import { createAppKit } from "@reown/appkit/react"
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react"
import { solana, solanaTestnet, solanaDevnet } from "@reown/appkit/networks"

type Props = {
    children: React.ReactNode
}

export function AppKitProvider({ children }: Props) {
    useEffect(() => {
        const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
        if (!projectId) {
            // In dev we keep rendering, but log a useful error
            console.error("Missing NEXT_PUBLIC_REOWN_PROJECT_ID for Reown AppKit")
            return
        }

        const solanaWeb3JsAdapter = new SolanaAdapter()

        const metadata = {
            name: "Trojan Colosseum",
            description: "Trade continuous outcomes on Solana",
            url: typeof window !== "undefined" ? window.location.origin : "https://example.com",
            icons: ["https://avatars.githubusercontent.com/u/179229932"],
        }

        // Initialize modal once on mount
        createAppKit({
            adapters: [solanaWeb3JsAdapter],
            networks: [solana, solanaTestnet, solanaDevnet],
            metadata,
            projectId,
            features: { analytics: true },
        })
    }, [])

    return <>{children}</>
}


