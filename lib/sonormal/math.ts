"use server"

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
        const result = await fetch(`${process.env.NEXT_PUBLIC_MATH_SERVER!}/math/sell`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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

export async function fetchClaimMath(
    k: number,
    l: number,
    h: number,
    xStar: number,
    boundaryMarginEta: number,
    tolCoeffSum: number,
    epsDens: number,
    tauGate: number,
    gammaTemp: number,
    epsSum: number,
    lambdaS: number,
    lambdaD: number,
    totalPoolAmount: number,
    pTrade: number[],
    m: number,
): Promise<{ success: true, payout: number } | { success: false, error: any }> {
    try {
        const result = await fetch(`${process.env.NEXT_PUBLIC_MATH_SERVER!}/math/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                k: k,
                l: l,
                h: h,
                x_star: xStar,
                boundary_margin_eta: boundaryMarginEta,
                tol_coeff_sum: tolCoeffSum,
                eps_dens: epsDens,
                tau_gate: tauGate,
                gamma_temp: gammaTemp,
                eps_sum: epsSum,
                lambda_s: lambdaS,
                lambda_d: lambdaD,
                total_pool_amount: totalPoolAmount,
                p_trade: pTrade,
                m: m,
            }),
        });

        if (!result.ok) {
            return {
                success: false,
                error: result.statusText
            };
        }

        const data = await result.json();
        return { success: true, payout: data.payout };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error
        };
    }
}