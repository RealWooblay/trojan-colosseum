"use server";

import { Connection, Keypair, PublicKey, Signer, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Sonormal } from "../../sonormal";
import SonormalIdl from "../../sonormal.json";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
 * @param alpha - The alpha values for the market
 * @param expiry - The expiry date of the market (seconds since unix epoch)
 * @returns {Promise<{ success: boolean, error: string | undefined }>} - The result of the transaction
 */
export async function newMarket(
    alpha: number[], 
    expiry: number
): Promise<{ success: true, tx: string } | { success: false, error: any }> {
    try {
        const marketFee = 0;
        const params = {
            k: Buffer.from([3]),
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

        const transaction = await sonormalProgram.methods
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
            .transaction();

        const result = await sendTransaction(transaction);
        if(!result.success) {
            return {
                success: false,
                error: result.error
            };
        }

        return {
            success: true,
            tx: result.tx
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}

async function sendTransaction(transaction: Transaction): Promise<{ success: true, tx: string } | { success: false, error: any }> {
    try {
        const blockhash = await solanaRpc.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;

        transaction.feePayer = marketAuthorityKeypair.publicKey;
        transaction.sign(marketAuthoritySigner);

        const tx = await solanaRpc.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
        });

        const confirmation = await solanaRpc.confirmTransaction({
            signature: tx,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        }, 'confirmed');
        if(confirmation.value.err) {
            return {
                success: false,
                error: confirmation.value.err
            };
        }

        return {
            success: true,
            tx: tx
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}