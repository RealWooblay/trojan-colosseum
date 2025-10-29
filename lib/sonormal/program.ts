"use server";

import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Signer, TransactionInstruction, TransactionMessage, VersionedTransaction, SendTransactionError } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Sonormal } from "../../sonormal";
import SonormalIdl from "../../sonormal.json";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { appendStoredMarket, findStoredMarket } from "../storage";
import { createDefaultAiOracleState } from "../oracle/market-oracle";
import { coefficientsToRanges } from "../trade-utils";
import { findControllerPda, findMarketPda, findTicketPda } from "./pda";
import { fetchClaimMath, fetchSellMath } from "./math";
import { BN } from "bn.js";

const marketAuthorityKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.MARKET_AUTHORITY!)));
const marketAuthorityWallet = new anchor.Wallet(marketAuthorityKeypair);
const marketAuthoritySigner: Signer = {
    publicKey: marketAuthorityKeypair.publicKey,
    secretKey: marketAuthorityKeypair.secretKey
};

const solanaRpc = new Connection(process.env.SOLANA_RPC!, 'confirmed');

const provider = new anchor.AnchorProvider(solanaRpc, marketAuthorityWallet, {
    commitment: 'confirmed',
});

const idl = (SonormalIdl as anchor.Idl);
idl.address = process.env.SONORMAL_PROGRAM_ID!;
const sonormalProgram = new anchor.Program<Sonormal>(idl, provider);

/**
 * Create a new market
 * @param title - The title of the market
 * @param description - The description of the market
 * @param unit - The unit of the market
 * @param category - The category of the market
 * @param alpha - The alpha values for the market (length must be 8)
 * @param expiry - The expiry date of the market (seconds since unix epoch)
 */
export async function newMarket(
    title: string,
    description: string,
    unit: "%" | "USD" | "°C" | "other",
    category: string,
    alpha: number[],
    expiry: number,
    ranges?: [number, number][]
): Promise<{ success: true, signature: string } | { success: false, error: any }> {
    try {
        if (expiry <= Date.now() / 1000) {
            return {
                success: false,
                error: 'Expiry must be in the future'
            };
        }

        const k = alpha.length - 1;
        const tolCoeffSum = 1e-10;
        const epsAlpha = 1e-8;
        const muDefault = 1.0;

        const marketFee = 0;
        const params = {
            k: Buffer.from([k]),
            l: 0.0,
            h: 100.0,
            unitMapKind: { linear: {} },
            epsAlpha: epsAlpha,
            tolCoeffSum: tolCoeffSum,
            tolProbSum: 1e-6,
            boundaryMarginEta: 1e-4,
            epsDens: 1e-10,
            muDefault: muDefault,
        };

        const liquidityMint = new PublicKey(process.env.USDC_MINT!);

        const feeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const instruction = await sonormalProgram.methods
            .newMarket(
                marketFee,
                alpha,
                params,
                new anchor.BN(expiry)
            )
            .accounts({
                payer: marketAuthorityKeypair.publicKey,
                liquidityMint: liquidityMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                marketAuthority: marketAuthorityKeypair.publicKey,
                feeReceiverAta: feeReceiverAta
            })
            .instruction();

        const blockhash = await solanaRpc.getLatestBlockhash('confirmed');

        const transaction = await buildTransaction(
            [instruction],
            blockhash.blockhash,
            marketAuthorityKeypair.publicKey,
            [marketAuthoritySigner]
        );
        if (!transaction.success) {
            return {
                success: false,
                error: transaction.error
            };
        }

        const result = await sendTransaction(
            transaction.versionedTransaction,
            blockhash.blockhash,
            blockhash.lastValidBlockHeight
        );
        if (!result.success) {
            return {
                success: false,
                error: result.error
            };
        }

        const controllerPda = findControllerPda();
        const controller = await sonormalProgram.account.controller.fetch(controllerPda);

        const marketId = (controller.totalMarkets.toNumber() - 1).toString();
        const expiryIso = new Date(expiry * 1000).toISOString();
        const domain = { min: 0, max: 100 };
        const normalizeInputRange = (value: any): [number, number] | null => {
            if (!value) return null;
            const raw = Array.isArray(value)
                ? value
                : typeof value === 'object' && value !== null
                    ? [value['0' as keyof typeof value], value['1' as keyof typeof value]]
                    : null;
            if (!raw) return null;
            const start = Number(raw[0]);
            const end = Number(raw[1]);
            if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
            return [start, end];
        };

        const normalizedRanges = (ranges ?? [])
            .map(normalizeInputRange)
            .filter((tuple): tuple is [number, number] => Array.isArray(tuple))
            .map(([startRaw, endRaw]) => {
                const start = startRaw ?? domain.min;
                const end = endRaw ?? startRaw ?? domain.min;
                const low = Math.max(domain.min, Math.min(start, end));
                const high = Math.min(domain.max, Math.max(start, end));
                if (high - low <= 0) {
                    const epsilon = (domain.max - domain.min) * 0.01;
                    return [low, Math.min(domain.max, low + epsilon)] as [number, number];
                }
                return [low, high] as [number, number];
            });
        const storedRanges = normalizedRanges.length > 0 ? normalizedRanges : coefficientsToRanges(alpha, domain);

        await appendStoredMarket({
            id: marketId,
            title: title,
            description: description,
            unit: unit,
            domain: domain,
            prior: {
                kind: "normal",
                params: {}
            },
            liquidityUSD: 0,
            vol24hUSD: 0,
            category: category,
            expiry: expiryIso,
            resolvesAt: expiryIso,
            alpha: alpha,
            k: k,
            tolCoeffSum: tolCoeffSum,
            epsAlpha: epsAlpha,
            muDefault: muDefault,
            coefficients: alpha,
            ranges: storedRanges,
            createdAt: new Date().toISOString(),
            stats: {
                mean: 0,
                variance: 0,
                skew: 0,
                kurtosis: 0
            },
            txSignature: result.signature,
            oracle: createDefaultAiOracleState({
                id: marketId,
                title,
                category,
                description,
                expiry: expiryIso,
                unit,
                domain,
            }),
        });

        return {
            success: true,
            signature: result.signature
        };
    } catch (error) {
        console.error(error);
        if (error instanceof SendTransactionError) {
            try {
                const logs = await error.getLogs(solanaRpc);
                const signature =
                    typeof (error as any).signature === 'string'
                        ? (error as any).signature
                        : undefined;
                return {
                    success: false,
                    error: {
                        type: 'SendTransactionError',
                        message: error.message,
                        logs: logs ?? undefined,
                        signature,
                    }
                };
            } catch (logError) {
                console.error('Failed to fetch transaction logs', logError);
            }
        }
        return {
            success: false,
            error: error
        };
    }
}

export async function buyTransaction(
    marketId: number,
    buyerAuthority: string,
    payer: string,
    coefficients: number[],
    amount: number
): Promise<{ success: true, transaction: Uint8Array } | { success: false, error: any }> {
    try {
        const coefficientsSum = coefficients.reduce((acc, curr) => acc + curr, 0);
        if (!Number.isFinite(coefficientsSum) || Math.abs(coefficientsSum - 1) > 1e-9) {
            return {
                success: false,
                error: 'Coefficients must sum to 1'
            };
        }

        const liquidityMint = new PublicKey(process.env.USDC_MINT!);

        const buyerAta = getAssociatedTokenAddressSync(
            liquidityMint,
            new PublicKey(buyerAuthority)
        );

        const protocolFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const marketFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const instruction = await sonormalProgram.methods
            .buy(new anchor.BN(marketId), coefficients, new anchor.BN(amount))
            .accounts({
                buyerAuthority: new PublicKey(buyerAuthority),
                payer: new PublicKey(payer),
                liquidityMint: liquidityMint,
                buyerAta: buyerAta,
                protocolFeeReceiverAta: protocolFeeReceiverAta,
                marketFeeReceiverAta: marketFeeReceiverAta,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        const blockhash = await solanaRpc.getLatestBlockhash('confirmed');

        const transaction = await buildTransaction(
            [instruction],
            blockhash.blockhash,
            new PublicKey(payer),
            []
        );
        if (!transaction.success) {
            return {
                success: false,
                error: transaction.error
            };
        }

        return {
            success: true,
            transaction: transaction.versionedTransaction.serialize()
        };
    } catch (error) {
        console.error(error);
        if (error instanceof SendTransactionError) {
            try {
                const logs = await error.getLogs(solanaRpc);
                const signature =
                    typeof (error as any).signature === 'string'
                        ? (error as any).signature
                        : undefined;
                return {
                    success: false,
                    error: {
                        type: 'SendTransactionError',
                        message: error.message,
                        logs: logs ?? undefined,
                        signature,
                    }
                };
            } catch (logError) {
                console.error('Failed to fetch transaction logs', logError);
            }
        }
        return {
            success: false,
            error: error
        };
    }
}

export async function sellTransaction(
    marketId: number,
    ticketId: number,
    sellerAuthority: string,
    payer: string,
    claimAmount: number
): Promise<{ success: true, transaction: Uint8Array, tStar: number } | { success: false, error: any }> {
    try {
        const [market, ticket] = await Promise.all([
            sonormalProgram.account.market.fetch(findMarketPda(marketId.toString())),
            sonormalProgram.account.ticket.fetch(findTicketPda(marketId.toString(), ticketId.toString()))
        ]);
        if (!market || !ticket) {
            return {
                success: false,
                error: 'Market or ticket not found'
            };
        }

        const sellMath = await fetchSellMath(
            new anchor.BN(market.params.k).toNumber(),
            market.params.tolCoeffSum,
            market.params.epsAlpha,
            market.params.muDefault,
            market.alpha,
            ticket.coefficients,
            claimAmount
        );
        if (!sellMath.success) {
            return {
                success: false,
                error: sellMath.error
            };
        }

        const liquidityMint = new PublicKey(process.env.USDC_MINT!);

        const sellerAta = getAssociatedTokenAddressSync(
            liquidityMint,
            new PublicKey(sellerAuthority)
        );

        const protocolFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const marketFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const instruction = await sonormalProgram.methods
            .sell(
                new anchor.BN(marketId),
                new anchor.BN(ticketId),
                claimAmount,
                new anchor.BN(Math.trunc(sellMath.tStar * (10 ** 6))),
                sellMath.alphaPrime
            )
            .accounts({
                sellerAuthority: new PublicKey(sellerAuthority),
                marketAuthority: marketAuthorityKeypair.publicKey,
                payer: new PublicKey(payer),
                liquidityMint: liquidityMint,
                sellerAta: sellerAta,
                protocolFeeReceiverAta: protocolFeeReceiverAta,
                marketFeeReceiverAta: marketFeeReceiverAta,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        const blockhash = await solanaRpc.getLatestBlockhash('confirmed');

        const transaction = await buildTransaction(
            [instruction],
            blockhash.blockhash,
            new PublicKey(payer),
            [marketAuthoritySigner]
        );
        if (!transaction.success) {
            return {
                success: false,
                error: transaction.error
            };
        }

        return {
            success: true,
            transaction: transaction.versionedTransaction.serialize(),
            tStar: sellMath.tStar
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}

export async function claimTransaction(
    marketId: number,
    ticketId: number,
    claimerAuthority: string,
    payer: string,
): Promise<{ success: true, transaction: Uint8Array, payout: number } | { success: false, error: any }> {
    try {
        const [onchainMarket, onchainticket, dbMarket] = await Promise.all([
            sonormalProgram.account.market.fetch(findMarketPda(marketId.toString())),
            sonormalProgram.account.ticket.fetch(findTicketPda(marketId.toString(), ticketId.toString())),
            findStoredMarket(marketId.toString())
        ]);
        if (!onchainMarket || !onchainticket) {
            return {
                success: false,
                error: 'Market or ticket not found onchain'
            };
        }
        if (!dbMarket) {
            return {
                success: false,
                error: 'Market not found in database'
            };
        }
        if (dbMarket?.resolvedOutcome === undefined || dbMarket.resolvedOutcome === 'INVALID' || dbMarket.resolvedOutcome === 'PENDING') {
            return {
                success: false,
                error: 'Market not resolved'
            };
        }

        const claimMath = await fetchClaimMath(
            new BN(onchainMarket.params.k).toNumber(),
            onchainMarket.params.l,
            onchainMarket.params.h,
            dbMarket.resolvedOutcome,
            onchainMarket.params.boundaryMarginEta,
            onchainMarket.params.tolCoeffSum,
            onchainMarket.params.epsDens,
            0.05,
            1.0,
            1e-18,
            1.0,
            1.0,
            Math.trunc(onchainMarket.totalPoolAmount.toNumber() / (10 ** 6)),
            onchainticket.coefficients,
            onchainticket.claim
        );
        if (!claimMath.success) {
            return {
                success: false,
                error: claimMath.error
            };
        }

        const liquidityMint = new PublicKey(process.env.USDC_MINT!);

        const claimerAta = getAssociatedTokenAddressSync(
            liquidityMint,
            new PublicKey(claimerAuthority)
        );

        const protocolFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const marketFeeReceiverAta = getAssociatedTokenAddressSync(
            liquidityMint,
            marketAuthorityKeypair.publicKey
        );

        const instruction = await sonormalProgram.methods
            .claim(
                new anchor.BN(marketId),
                new anchor.BN(ticketId),
                new anchor.BN(Math.trunc(claimMath.payout * (10 ** 6))),
            )
            .accounts({
                claimerAuthority: new PublicKey(claimerAuthority),
                marketAuthority: marketAuthorityKeypair.publicKey,
                payer: new PublicKey(payer),
                claimerAta: claimerAta,
                liquidityMint: liquidityMint,
                protocolFeeReceiverAta: protocolFeeReceiverAta,
                marketFeeReceiverAta: marketFeeReceiverAta,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        const blockhash = await solanaRpc.getLatestBlockhash('confirmed');

        const transaction = await buildTransaction(
            [instruction],
            blockhash.blockhash,
            new PublicKey(payer),
            [marketAuthoritySigner]
        );
        if (!transaction.success) {
            return {
                success: false,
                error: transaction.error
            };
        }

        return {
            success: true,
            transaction: transaction.versionedTransaction.serialize(),
            payout: claimMath.payout
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}

export async function getMarket(marketId: string) {
    try {
        const marketPda = findMarketPda(marketId);
        const market = await sonormalProgram.account.market.fetch(marketPda);
        return market;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function getTotalTickets(marketId: string): Promise<number | undefined> {
    try {
        const market = await getMarket(marketId);
        if (!market) {
            console.error('Market not found');
            return undefined;
        }
        return market.totalTickets.toNumber();
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function getTicket(marketId: string, ticketId: string) {
    try {
        const ticketPda = findTicketPda(marketId, ticketId);
        const ticket = await sonormalProgram.account.ticket.fetch(ticketPda);
        return ticket;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

async function buildTransaction(
    instructions: TransactionInstruction[],
    blockhash: string,
    payer: PublicKey,
    signers: Signer[]
): Promise<{ success: true, versionedTransaction: VersionedTransaction } | { success: false, error: any }> {
    try {
        const message = new TransactionMessage({
            payerKey: payer,
            recentBlockhash: blockhash,
            instructions: [
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 1_000_000
                }),
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1
                }),
                ...instructions
            ]
        }).compileToV0Message();

        const versionedTransaction = new VersionedTransaction(message);
        if (signers.length > 0) {
            versionedTransaction.sign(signers);
        }

        return {
            success: true,
            versionedTransaction: versionedTransaction
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}

async function sendTransaction(
    transaction: VersionedTransaction,
    blockhash: string,
    lastValidBlockHeight: number
): Promise<{ success: true, signature: string } | { success: false, error: any }> {
    try {
        const signature = await solanaRpc.sendTransaction(transaction, {
            skipPreflight: false,
            maxRetries: 3,
        });

        const confirmation = await solanaRpc.confirmTransaction({
            signature: signature,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight
        }, 'confirmed');
        if (confirmation.value.err) {
            return {
                success: false,
                error: confirmation.value.err
            };
        }

        return {
            success: true,
            signature: signature
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}
