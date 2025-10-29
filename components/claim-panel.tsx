"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fmtUSD, fmtPct } from "@/lib/formatters"
import { useToast } from "@/hooks/use-toast"
import type { Market, Ticket } from "@/lib/types"
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react"
import type { Provider } from "@reown/appkit-adapter-solana/react"
import { VersionedTransaction } from "@solana/web3.js"
import { findStoredTicketsByAuthorityAndMarketId, updateStoredTicket } from "@/lib/storage"
import { CheckCircle, AlertCircle, Coins } from "lucide-react"
import { claimTransaction } from "@/lib/sonormal/program"

interface ClaimPanelProps {
	market: Market
}

export function ClaimPanel({ market }: ClaimPanelProps) {
	const { walletProvider } = useAppKitProvider<Provider>("solana");
	const { address, isConnected } = useAppKitAccount();

	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [selectedTicket, setSelectedTicket] = useState<string>("");
	const [claiming, setClaiming] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (!address) return;
		findStoredTicketsByAuthorityAndMarketId(address, market.id)
			.then((tickets) => {
				// Only show tickets that have claimable amounts
				setTickets(tickets.filter(ticket => ticket.claimAmount > 0))
			})
			.catch((error) => {
				console.error(error)
			})
	}, [address, market.id])

	const handleTicketSelect = (ticketId: string) => {
		setSelectedTicket(ticketId === selectedTicket ? "" : ticketId);
	};

	const selectAllTickets = () => {
		if (tickets.length > 0) {
			setSelectedTicket(tickets[0].id);
		}
	};

	const deselectAllTickets = () => {
		setSelectedTicket("");
	};

	const getTotalClaimAmount = () => {
		const ticket = tickets.find(t => t.id === selectedTicket);
		return ticket ? ticket.claimAmount : 0;
	};

	const handleClaim = async () => {
		if (!address || !isConnected) {
			toast({
				title: "Not connected",
				description: "Please connect your wallet to claim tickets.",
				variant: "destructive",
			})
			return
		}

		if (!selectedTicket) {
			toast({
				title: "No ticket selected",
				description: "Please select a ticket to claim.",
				variant: "destructive",
			})
			return
		}

		setClaiming(true);

		try {
			const ticket = tickets.find(t => t.id === selectedTicket);
			if (!ticket) {
				toast({
					title: "Ticket not found",
					description: "The selected ticket could not be found.",
					variant: "destructive",
				})
				return;
			}

			const transaction = await claimTransaction(Number(market.id), Number(ticket.id), address, address);

			if (!transaction.success) {
				toast({
					title: "Claim failed",
					description: typeof transaction.error === 'string' ? transaction.error : transaction.error?.message || 'Transaction failed',
					variant: "destructive",
				})
				return
			}

			const versionedTransaction = VersionedTransaction.deserialize(transaction.transaction);

			const result = await walletProvider.signAndSendTransaction(versionedTransaction, {
				skipPreflight: false,
				maxRetries: 3,
				preflightCommitment: 'confirmed',
			});

			// Update the ticket to mark it as fully claimed
			const updatedTicket = {
				...ticket,
				claimAmount: 0,
				realizedAmount: ticket.realizedAmount + ticket.claimAmount,
			}
			await updateStoredTicket(updatedTicket);

			toast({
				title: "Claim successful",
				description: (
					<a
						href={`https://solscan.io/tx/${result}?cluster=devnet`}
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-cyan-400"
					>
						View on Solscan
					</a>
				),
				variant: "default",
			})

			// Refresh tickets after claiming
			const updatedTickets = await findStoredTicketsByAuthorityAndMarketId(address, market.id);
			setTickets(updatedTickets.filter(ticket => ticket.claimAmount > 0));
			setSelectedTicket("");
		} catch (error) {
			console.error("Claim error:", error);
			toast({
				title: "Claim failed",
				description: error instanceof Error ? error.message : "Please try again",
				variant: "destructive",
			})
		} finally {
			setClaiming(false);
		}
	};

	const resolvedOutcome = market.resolvedOutcome || market.oracle?.resolvedOutcome;
	const resolutionConfidence = market.resolutionConfidence;

	return (
		<div className="glass-card p-6 space-y-6 sticky top-20">
			<div className="space-y-1">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Coins className="w-5 h-5 text-green-400" />
					Claim Your Winnings
				</h2>
				<p className="text-xs text-muted-foreground">
					This market has been resolved. Select your winning tickets to claim your rewards.
				</p>
			</div>

			{/* Market Resolution Info */}
			<div className="space-y-3 p-4 rounded-lg bg-green-500/10 border border-green-400/20">
				<div className="flex items-center gap-2">
					<CheckCircle className="w-4 h-4 text-green-400" />
					<span className="text-sm font-semibold text-green-300">Market Resolved</span>
				</div>
				<div className="space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Outcome:</span>
						<span className="font-mono font-bold text-green-300">
							{resolvedOutcome || "Unknown"}
						</span>
					</div>
					{resolutionConfidence && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Confidence:</span>
							<span className="font-mono font-bold text-green-300">
								{fmtPct(resolutionConfidence)}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Ticket Selection */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label className="text-sm font-semibold">Select Ticket to Claim</Label>
					<div className="flex gap-2">
						<Button
							onClick={selectAllTickets}
							size="sm"
							variant="outline"
							className="text-xs h-7"
							disabled={tickets.length === 0}
						>
							Select First
						</Button>
						<Button
							onClick={deselectAllTickets}
							size="sm"
							variant="outline"
							className="text-xs h-7"
							disabled={!selectedTicket}
						>
							Deselect
						</Button>
					</div>
				</div>

				{tickets.length === 0 ? (
					<div className="text-center py-6 text-muted-foreground">
						<AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
						<p className="text-sm">No claimable tickets found</p>
						<p className="text-xs mt-1">You may not have any winning positions in this market</p>
					</div>
				) : (
					<div className="space-y-2 max-h-64 overflow-y-auto">
						{tickets.map((ticket) => (
							<div
								key={ticket.id}
								className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTicket === ticket.id
									? 'border-green-400 bg-green-400/10'
									: 'border-white/10 hover:border-white/20'
									}`}
								onClick={() => handleTicketSelect(ticket.id)}
							>
								<div className="flex justify-between items-center">
									<div>
										<div className="text-sm font-mono">Ticket #{ticket.id}</div>
										<div className="text-xs text-muted-foreground">
											Claimable: {fmtUSD(ticket.claimAmount / (10 ** 6))} • {new Date(ticket.createdAt).toLocaleDateString()}
										</div>
									</div>
									<div className="text-xs text-green-300">
										{selectedTicket === ticket.id ? '✓' : ''}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Claim Summary */}
			{selectedTicket && (
				<div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
					<div className="text-sm font-semibold">Claim Summary</div>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Selected Ticket:</span>
							<span className="font-mono font-bold">#{selectedTicket}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Claim Amount:</span>
							<span className="font-mono font-bold text-green-300">
								{fmtUSD(getTotalClaimAmount() / (10 ** 6))}
							</span>
						</div>
					</div>
				</div>
			)}

			<Button
				onClick={handleClaim}
				className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
				size="lg"
				disabled={!selectedTicket || claiming}
			>
				{claiming ? "Claiming..." : selectedTicket ? `Claim Ticket #${selectedTicket}` : "Select Ticket First"}
			</Button>
		</div>
	)
}
