import { apiService } from "./api";

export interface BondingCurveQuote {
  tokenAmount: string;
  coreAmount: string;
  currentPrice: string;
  newPrice: string;
  priceImpact: number;
  platformFee: string;
  slippage: number;
  minimumReceived: string;
  gasEstimate: string;
  riskLevel: "low" | "medium" | "high";
  warning?: string;
}

export interface BondingCurveTrade {
  success: boolean;
  transactionHash?: string;
  tokenAmount?: string;
  coreAmount?: string;
  gasUsed?: string;
  effectivePrice?: string;
  error?: string;
}

export interface AgentTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  instructions: string;
  model: string;
  creator: string;
  createdAt: number;
  currentSupply: string;
  totalSupply: string;
  reserveBalance: string;
  currentPrice: string;
  marketCap: string;
  isGraduated: boolean;
}

export interface GraduationStatus {
  isGraduated: boolean;
  currentPrice: number;
  reserveBalance: number;
  marketCap: number;
  lastUpdate: number;
  error?: string;
}

export class BondingCurveError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "BondingCurveError";
    this.code = code;
    this.details = details;
  }
}

type TradeType = "buy" | "sell";

const MICRO_ALGO = 1_000_000;

const formatMicroAlgo = (value: number): string => (value / MICRO_ALGO).toFixed(6);

class BondingCurveService {
  private mockQuote(type: TradeType, amount: number): BondingCurveQuote {
    const basePrice = 0.25; // in ALGO
    const priceImpact = Math.min(amount * 0.05, 10);
    const newPrice = type === "buy" ? basePrice * (1 + priceImpact / 100) : basePrice * (1 - priceImpact / 100);
    const platformFee = amount * 0.01;
    const slippage = 0.5;
    const minimumReceived = type === "buy" ? amount / newPrice : (amount - platformFee) * basePrice;

    return {
      tokenAmount: type === "buy" ? (amount / basePrice).toFixed(6) : amount.toFixed(6),
      coreAmount: type === "buy" ? amount.toFixed(6) : (amount * basePrice).toFixed(6),
      currentPrice: basePrice.toFixed(6),
      newPrice: newPrice.toFixed(6),
      priceImpact,
      platformFee: platformFee.toFixed(6),
      slippage,
      minimumReceived: minimumReceived.toFixed(6),
      gasEstimate: (0.002).toFixed(6),
      riskLevel: priceImpact > 7 ? "high" : priceImpact > 3 ? "medium" : "low",
      warning: priceImpact > 7 ? "High price impact due to low liquidity" : undefined,
    };
  }

  async getTokenInfo(tokenAddress: string): Promise<AgentTokenInfo> {
    try {
      const response = await apiService.get(`/agents/${tokenAddress}`);
      if (response.data) {
        const data: any = response.data;
        return {
          address: tokenAddress,
          name: data.tokenName ?? "Agent Token",
          symbol: data.tokenSymbol ?? "AGNT",
          decimals: 6,
          description: data.agentInfo?.description ?? "",
          instructions: data.agentInfo?.instructions ?? "",
          model: data.agentInfo?.model ?? "",
          creator: data.metadata?.creator ?? "",
          createdAt: data.metadata?.createdAt ?? Date.now(),
          currentSupply: data.totalSupply ?? "0",
          totalSupply: data.totalSupply ?? "0",
          reserveBalance: data.bondingCurveInfo?.reserve ?? "0",
          currentPrice: data.currentPrice ?? "0",
          marketCap: data.bondingCurveInfo?.marketCap ?? "0",
          isGraduated: Boolean(data.metadata?.isGraduated ?? false),
        };
      }
    } catch (error) {
      console.warn("Failed to fetch agent info from backend", error);
    }

    return {
      address: tokenAddress,
      name: "Agent Token",
      symbol: "AGNT",
      decimals: 6,
      description: "",
      instructions: "",
      model: "",
      creator: "",
      createdAt: Date.now(),
      currentSupply: "0",
      totalSupply: "0",
      reserveBalance: "0",
      currentPrice: "0",
      marketCap: "0",
      isGraduated: false,
    };
  }

  async getBuyQuote(tokenAddress: string, algoAmount: string): Promise<BondingCurveQuote> {
    const amount = Number(algoAmount);
    if (!tokenAddress || !Number.isFinite(amount) || amount <= 0) {
      throw new BondingCurveError("INVALID_AMOUNT", "Amount must be greater than zero");
    }
    return this.mockQuote("buy", amount);
  }

  async getSellQuote(tokenAddress: string, tokenAmount: string): Promise<BondingCurveQuote> {
    const amount = Number(tokenAmount);
    if (!tokenAddress || !Number.isFinite(amount) || amount <= 0) {
      throw new BondingCurveError("INVALID_AMOUNT", "Amount must be greater than zero");
    }
    return this.mockQuote("sell", amount);
  }

  async buyTokens(_tokenAddress: string, _algoAmount: string): Promise<BondingCurveTrade> {
    throw new BondingCurveError("NOT_IMPLEMENTED", "Algorand trading is not implemented yet");
  }

  async sellTokens(_tokenAddress: string, _tokenAmount: string): Promise<BondingCurveTrade> {
    throw new BondingCurveError("NOT_IMPLEMENTED", "Algorand trading is not implemented yet");
  }

  async getTokenBalance(_tokenAddress: string, _walletAddress: string): Promise<string> {
    return "0";
  }

  async getGraduationStatus(tokenAddress: string): Promise<GraduationStatus> {
    try {
      const response = await apiService.get(`/agents/${tokenAddress}/graduation`);
      if (response.data) {
        const data: any = response.data;
        return {
          isGraduated: Boolean(data.isGraduated),
          currentPrice: Number(data.currentPrice ?? 0),
          reserveBalance: Number(data.reserveBalance ?? 0),
          marketCap: Number(data.marketCap ?? 0),
          lastUpdate: Date.now(),
        };
      }
    } catch (error) {
      console.warn("Failed to fetch graduation status", error);
    }

    return {
      isGraduated: false,
      currentPrice: 0,
      reserveBalance: 0,
      marketCap: 0,
      lastUpdate: Date.now(),
      error: "Graduation status unavailable",
    };
  }

  async getTradingHistory(_tokenAddress: string): Promise<any[]> {
    return [];
  }

  async getPriceHistory(_tokenAddress: string): Promise<any[]> {
    return [];
  }

  async recordInteraction(_tokenAddress: string, _message: string): Promise<boolean> {
    return false;
  }

  async getBondingCurveProgress(_tokenAddress: string): Promise<{
    currentSupply: string;
    maxSupply: string;
    reserveBalance: string;
    graduationThreshold: string;
    remainingToGraduation: string;
  } | null> {
    return null;
  }
}

export default new BondingCurveService();
