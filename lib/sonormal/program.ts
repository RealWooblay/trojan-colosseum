"use server";

import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Signer, TransactionInstruction, TransactionMessage, VersionedTransaction, SendTransactionError } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Sonormal } from "../../sonormal";
import SonormalIdl from "../../sonormal.json";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findControllerPda, findMarketPda } from "./pda";

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
 * @param alpha - The alpha values for the market (length must be 8)
 * @param expiry - The expiry date of the market (seconds since unix epoch)
 */
export async function newMarket(
    alpha: number[],
    expiry: number
): Promise<{ success: true, signature: string } | { success: false, error: any }> {
    try {
        if (alpha.length !== 8) {
            return {
                success: false,
                error: 'Alpha length must be 8'
            };
        }

        if (expiry <= Date.now() / 1000) {
            return {
                success: false,
                error: 'Expiry must be in the future'
            };
        }

        const marketFee = 0;
        const params = {
            k: Buffer.from([7]),
            l: 0.0,
            h: 100.0,
            unitMapKind: { linear: {} },
            epsAlpha: 1e-8,
            tolCoeffSum: 1e-10,
            tolProbSum: 1e-6,
            boundaryMarginEta: 1e-4,
            epsDens: 1e-10,
            muDefault: 1.0,
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

        return {
            success: true,
            signature: result.signature
        };
    } catch (error) {
        console.error("[sonormal] newMarket failed", error)
        if (error instanceof SendTransactionError) {
            let logs: string[] | null = null
            try {
                logs = await error.getLogs(solanaRpc)
            } catch (logError) {
                console.error("[sonormal] failed fetching logs for newMarket", logError)
            }
            return {
                success: false,
                error: {
                    message: error.message,
                    logs,
                    cause: error,
                }
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
            let logs: string[] | null = null
            try {
                logs = await error.getLogs(solanaRpc)
            } catch (logError) {
                console.error("[sonormal] failed fetching logs for buyTransaction", logError)
            }
            return {
                success: false,
                error: {
                    message: error.message,
                    logs,
                    cause: error,
                }
            }
        }
        return {
            success: false,
            error: error
        };
    }
}

export async function getTotalTickets(marketId: string): Promise<number | undefined> {
    try {
        const marketPda = findMarketPda(marketId);
        const market = await sonormalProgram.account.market.fetch(marketPda);

        return market.totalTickets.toNumber();
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
        if(signers.length > 0) {
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
            const logs = confirmation.value?.logs
            return {
                success: false,
                error: {
                    message: "Transaction confirmation error",
                    logs,
                    cause: confirmation.value.err,
                }
            };
        }

        return {
            success: true,
            signature: signature
        };
    } catch (error) {
        console.error("[sonormal] sendTransaction failed", error)
        if (error instanceof SendTransactionError) {
            let logs: string[] | null = null
            try {
                logs = await error.getLogs(solanaRpc)
            } catch (logError) {
                console.error("[sonormal] failed to fetch transaction logs", logError)
            }
            return {
                success: false,
                error: {
                    message: error.message,
                    logs,
                    cause: error,
                }
            }
        }
        return {
            success: false,
            error: error
        };
    }
}
