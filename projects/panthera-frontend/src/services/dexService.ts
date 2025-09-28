import { PublicClient } from "viem";
import { SUSHI_CONFIG } from "../config/chains";

export interface DEXQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  slippage: number;
  minimumReceived: string;
  route: string[];
  gasEstimate?: bigint;
  method: "sushi";
  confidence: "high" | "medium" | "low";
}

// Professional DEX Service for Core Testnet
export class DEXService {
  static readonly SUSHI_ROUTER_V2_CORE = SUSHI_CONFIG.CORE_MAINNET.ROUTER_V2;
  static readonly NATIVE = SUSHI_CONFIG.NATIVE_PLACEHOLDER;

  private publicClient: PublicClient;
  private tokenAddress: string;

  // Removed DEX router configs; using Sushi HTTP API

  constructor(publicClient: PublicClient, tokenAddress: string) {
    this.publicClient = publicClient;
    this.tokenAddress = tokenAddress;
  }

  /**
   * Professional DEX quote with multiple fallback methods
   */
  async getDEXQuote(amount: string, isBuy: boolean, slippageTolerance: number = 2): Promise<DEXQuote> {
    console.log(`🔄 Getting DEX quote: ${amount} ${isBuy ? "ALGO -> TOKEN" : "TOKEN -> ALGO"}`);

    // Only real DEX router is allowed (no simulation, no fallback)
    const realQuote = await this.getRealDEXQuote(amount, isBuy, slippageTolerance);
    if (realQuote) {
      console.log("✅ Real DEX quote successful");
      return realQuote;
    }

    throw new Error("DEX router not available or pair not found for this token");
  }

  /**
   * Try to get quote from real DEX router
   */
  private async getRealDEXQuote(amount: string, isBuy: boolean, slippageTolerance: number): Promise<DEXQuote | null> {
    // Switch to Sushi HTTP API quote
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const chainId = this.publicClient?.chain?.id ?? SUSHI_CONFIG.CORE_MAINNET.CHAIN_ID;
    const tokenIn = isBuy ? SUSHI_CONFIG.NATIVE_PLACEHOLDER : this.tokenAddress;
    const tokenOut = isBuy ? this.tokenAddress : SUSHI_CONFIG.NATIVE_PLACEHOLDER;
    const url = new URL(`/api/dex/quote/${chainId}`, window.location.origin);
    url.searchParams.set("tokenIn", tokenIn);
    url.searchParams.set("tokenOut", tokenOut);
    url.searchParams.set("amount", amountWei.toString());
    url.searchParams.set("maxSlippage", (slippageTolerance / 100).toString());

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data: any = await res.json();

    const amountOutWeiStr: string | undefined = data?.amountOut ?? data?.toAmount ?? data?.route?.amountOut;
    if (!amountOutWeiStr) return null;

    const outputAmount = (Number(amountOutWeiStr) / 1e18).toString();
    const minimumReceived = (parseFloat(outputAmount) * (1 - slippageTolerance / 100)).toString();
    let priceImpact = 0;
    if (typeof data?.priceImpact === "number") priceImpact = data.priceImpact;
    else if (typeof data?.priceImpactBps === "number") priceImpact = data.priceImpactBps / 100;

    const route: string[] = Array.isArray(data?.route?.path) ? data.route.path : [tokenIn, tokenOut];

    return {
      inputAmount: amount,
      outputAmount,
      priceImpact,
      slippage: slippageTolerance,
      minimumReceived,
      route,
      method: "sushi",
      confidence: "high",
    };
  }

  /**
   * Professional fallback quote for when DEX is not available
   */
  // Fallback method removed: real quotes only

  /**
   * Get current token price from various sources
   */
  // Removed: all quotes are derived from on-chain reserves

  /**
   * Check if DEX is available for this token
   */
  async isDEXAvailable(): Promise<boolean> {
    try {
      const chainId = this.publicClient?.chain?.id ?? SUSHI_CONFIG.CORE_MAINNET.CHAIN_ID;
      const url = new URL(`/api/dex/quote/${chainId}`, window.location.origin);
      url.searchParams.set("tokenIn", SUSHI_CONFIG.NATIVE_PLACEHOLDER);
      url.searchParams.set("tokenOut", this.tokenAddress);
      url.searchParams.set("amount", "1");
      const res = await fetch(url.toString());
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get on-chain swap transaction payload from Sushi API
   */
  async getSwapTx(amount: string, isBuy: boolean, slippageTolerance: number = 2): Promise<{ to: string; data: string; value: string }> {
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const chainId = this.publicClient?.chain?.id ?? SUSHI_CONFIG.CORE_MAINNET.CHAIN_ID;
    const tokenIn = isBuy ? SUSHI_CONFIG.NATIVE_PLACEHOLDER : this.tokenAddress;
    const tokenOut = isBuy ? this.tokenAddress : SUSHI_CONFIG.NATIVE_PLACEHOLDER;
    const url = new URL(`/api/dex/swap/${chainId}`, window.location.origin);
    url.searchParams.set("tokenIn", tokenIn);
    url.searchParams.set("tokenOut", tokenOut);
    url.searchParams.set("amount", amountWei.toString());
    url.searchParams.set("maxSlippage", (slippageTolerance / 100).toString());

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Sushi swap failed (${res.status}): ${errText}`);
    }
    const data: any = await res.json();

    const to: string = data?.tx?.to || data?.to;
    const callData: string = data?.tx?.data || data?.data;
    const value: string = data?.tx?.value || data?.value || "0x0";
    if (!to || !callData) throw new Error("Sushi swap response missing tx payload");

    return { to, data: callData, value };
  }
}

// Export factory function
export const createDEXService = (publicClient: PublicClient, tokenAddress: string) => {
  return new DEXService(publicClient, tokenAddress);
};
