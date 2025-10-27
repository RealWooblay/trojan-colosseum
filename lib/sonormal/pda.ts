import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey(process.env.SONORMAL_PROGRAM_ID!);

export function findControllerPda() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('CONTROLLER')],
        programId
    )[0];
}

export function findMarketPda(marketId: string) {
    // marketId is a u64, needs to be serialized as 8 bytes in little-endian format
    const marketIdBN = new BN(marketId);
    const marketIdBuffer = marketIdBN.toArrayLike(Buffer, "le", 8);
    
    return PublicKey.findProgramAddressSync(
        [Buffer.from('MARKET'), marketIdBuffer],
        programId
    )[0];
}