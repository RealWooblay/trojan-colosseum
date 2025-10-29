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
    return PublicKey.findProgramAddressSync(
        [Buffer.from('MARKET'), new BN(marketId).toArrayLike(Buffer, "le", 8)],
        programId
    )[0];
}

export function findTicketPda(marketId: string, ticketId: string) {
    const marketPda = findMarketPda(marketId);
    return PublicKey.findProgramAddressSync([
        Buffer.from('TICKET'), 
        marketPda.toBuffer(), 
        new BN(ticketId).toArrayLike(Buffer, "le", 8)
    ], programId)[0];
}

export function findMarketPoolPda(marketId: string) {
    const marketPda = findMarketPda(marketId);
    return PublicKey.findProgramAddressSync([
        Buffer.from('MARKET_POOL'),
        marketPda.toBuffer()
    ], programId)[0];
}