export async function fetchSellMath(
    k: number,
    tolCoeffSum: number,
    epsAlpha: number,
    muDefault: number,
    alpha: number[],
    pTrade: number[],
    claimAmount: number,
): Promise<{ success: true, alphaPrime: number[], tStar: number } | { success: false, error: any }> {
    try {
        const result = await fetch(`${process.env.MATH_SERVER!}/math/sell`, {
            method: 'POST',
            body: JSON.stringify({
                k: k,
                tol_coeff_sum: tolCoeffSum,
                eps_alpha: epsAlpha,
                mu_default: muDefault,
                alpha: alpha,
                p_trade: pTrade,
                m: claimAmount,
            }),
        });

        if (!result.ok) {
            return {
                success: false,
                error: result.statusText
            };
        }

        const data = await result.json();
        return { success: true, alphaPrime: data.alpha_prime, tStar: data.t_star };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}