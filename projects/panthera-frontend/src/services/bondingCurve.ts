/**
 * PANTHERA Bonding Curve Service
 * Real implementation for PANTHERA platform bonding curve trading
 * Integrates with AgentToken smart contracts and PANTHERA backend
 */

import { apiService } from "./api";

// PANTHERA Chain Configuration
export const PANTHERA_CHAIN_CONFIG = {
  CORE_DAO_MAINNET: 1116,
  CORE_DAO_TESTNET: 1115,
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
};

// AgentToken Contract ABI (essential functions)
export const AGENT_TOKEN_ABI = [
  "function getCurrentPrice() view returns (uint256)",
  "function getBondingCurveInfo() view returns (uint256 currentSupply_, uint256 reserveBalance_, uint256 price, uint256 marketCap, bool isGraduated_)",
  "function getBuyQuote(uint256 coreAmount) view returns (uint256 tokenAmount, uint256 currentPrice, uint256 newPrice, uint256 priceImpact)",
  "function getSellQuote(uint256 tokenAmount) view returns (uint256 coreAmount, uint256 currentPrice, uint256 newPrice, uint256 priceImpact)",
  "function calculatePurchaseReturn(uint256 coreAmount) view returns (uint256)",
  "function calculateSaleReturn(uint256 tokenAmount) view returns (uint256)",
  "function buyTokens() payable",
  "function sellTokens(uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function currentSupply() view returns (uint256)",
  "function reserveBalance() view returns (uint256)",
  "function isGraduated() view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function getAgentInfo() view returns (string description, string instructions, string model, address creator, uint256 timestamp)",
  "function recordInteraction(string message)",
  "event TokensPurchased(address indexed buyer, uint256 coreAmount, uint256 tokensReceived)",
  "event TokensSold(address indexed seller, uint256 tokensAmount, uint256 coreReceived)",
  "event TokenGraduated(address indexed token, uint256 reserveAmount, uint256 liquidityTokens)",
];

// Trading Response Interfaces
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

export class BondingCurveError extends Error {
  code: string;
  details?: any;
  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = "BondingCurveError";
    this.code = code;
    this.details = details;
  }
}

const ethers = {};

class BondingCurveService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // this.provider = new ethers.BrowserProvider(window.ethereum);
      }
    } catch (error) {
      console.error("Failed to initialize provider:", error);
    }
  }

  async setSigner(signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider;
  }

  private getContract(tokenAddress: string): ethers.Contract {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }
    return new ethers.Contract(tokenAddress, AGENT_TOKEN_ABI, this.provider);
  }

  private getSignedContract(tokenAddress: string): ethers.Contract {
    if (!this.signer) {
      throw new Error("Signer not available");
    }
    return new ethers.Contract(tokenAddress, AGENT_TOKEN_ABI, this.signer);
  }

  /**
   * Mock buy quote for development
   */
  private getMockBuyQuote(coreAmount: string): BondingCurveQuote {
    const coreAmountNum = parseFloat(coreAmount);
    const basePrice = 0.001; // Base price in CORE
    const tokenAmount = coreAmountNum / basePrice;
    const priceImpact = Math.min(coreAmountNum * 0.1, 5); // Max 5% impact
    const newPrice = basePrice * (1 + priceImpact / 100);
    const platformFee = coreAmountNum * 0.01; // 1% fee
    const slippage = 0.5;
    const minimumReceived = tokenAmount * (1 - slippage / 100);

    return {
      tokenAmount: tokenAmount.toString(),
      coreAmount,
      currentPrice: basePrice.toString(),
      newPrice: newPrice.toString(),
      priceImpact,
      platformFee: platformFee.toString(),
      slippage,
      minimumReceived: minimumReceived.toString(),
      gasEstimate: "0.002",
      riskLevel: priceImpact > 3 ? "medium" : "low",
    };
  }

  /**
   * Mock sell quote for development
   */
  private getMockSellQuote(tokenAmount: string): BondingCurveQuote {
    const tokenAmountNum = parseFloat(tokenAmount);
    const basePrice = 0.001; // Base price in CORE
    const coreAmount = tokenAmountNum * basePrice;
    const priceImpact = Math.min(tokenAmountNum * 0.0001, 5); // Max 5% impact
    const newPrice = basePrice * (1 - priceImpact / 100);
    const platformFee = coreAmount * 0.01; // 1% fee
    const slippage = 0.5;
    const minimumReceived = coreAmount * (1 - slippage / 100);

    return {
      tokenAmount,
      coreAmount: coreAmount.toString(),
      currentPrice: basePrice.toString(),
      newPrice: newPrice.toString(),
      priceImpact,
      platformFee: platformFee.toString(),
      slippage,
      minimumReceived: minimumReceived.toString(),
      gasEstimate: "0.002",
      riskLevel: priceImpact > 3 ? "medium" : "low",
    };
  }

  /**
   * Get comprehensive token information
   */
  async getTokenInfo(tokenAddress: string): Promise<AgentTokenInfo> {
    try {
      const contract = this.getContract(tokenAddress);

      // Try consolidated call first
      try {
        const [name, symbol, decimals, agentInfo, bondingCurveInfo, totalSupply] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.getAgentInfo(),
          contract.getBondingCurveInfo(),
          contract.totalSupply(),
        ]);

        const [description, instructions, model, creator, createdAt] = agentInfo;
        const [currentSupply, reserveBalance, currentPrice, marketCap, isGraduated] = bondingCurveInfo;

        return {
          address: tokenAddress,
          name,
          symbol,
          decimals,
          description,
          instructions,
          model,
          creator,
          createdAt: Number(createdAt),
          currentSupply: currentSupply.toString(),
          totalSupply: totalSupply.toString(),
          reserveBalance: reserveBalance.toString(),
          currentPrice: currentPrice.toString(),
          marketCap: marketCap.toString(),
          isGraduated,
        };
      } catch (consolidatedErr) {
        // Fallback to individual calls if ABI/order mismatch
        const [name, symbol, decimals] = await Promise.all([contract.name(), contract.symbol(), contract.decimals()]);

        const agentInfo = await (async () => {
          try {
            return await contract.getAgentInfo();
          } catch {
            return ["", "", "", "0x0000000000000000000000000000000000000000", 0];
          }
        })();
        const [description, instructions, model, creator, createdAt] = agentInfo;

        const [currentSupply, totalSupply, reserveBalance, currentPrice, isGraduated] = await (async () => {
          const cs = await contract.currentSupply?.().catch(() => null);
          const ts = await contract.totalSupply?.().catch(() => null);
          const rb = await contract.reserveBalance?.().catch(() => null);
          const cp = await contract.getCurrentPrice?.().catch(() => null);
          let grad = false;
          try {
            grad = await contract.isGraduated?.();
          } catch {
            grad = false;
          }
          return [cs ?? 0n, ts ?? 0n, rb ?? 0n, cp ?? 0n, grad] as const;
        })();

        // Compute market cap if possible: price * supply
        let marketCap = 0n;
        try {
          if (currentSupply && currentPrice) {
            // Both are wei-based bigints
            marketCap = (BigInt(currentSupply) * BigInt(currentPrice)) / 10n ** 18n;
          }
        } catch {}

        return {
          address: tokenAddress,
          name,
          symbol,
          decimals,
          description,
          instructions,
          model,
          creator,
          createdAt: Number(createdAt || 0),
          currentSupply: currentSupply?.toString?.() ?? String(currentSupply ?? 0),
          totalSupply: (totalSupply as any)?.toString?.() ?? String(totalSupply ?? 0),
          reserveBalance: (reserveBalance as any)?.toString?.() ?? String(reserveBalance ?? 0),
          currentPrice: (currentPrice as any)?.toString?.() ?? String(currentPrice ?? 0),
          marketCap: marketCap.toString(),
          isGraduated: Boolean(isGraduated),
        };
      }
    } catch (error) {
      console.error("Error getting token info:", error);
      throw new BondingCurveError("TOKEN_INFO_ERROR", "Failed to get token information", error);
    }
  }

  /**
   * Get buy quote from smart contract
   */
  async getBuyQuote(tokenAddress: string, coreAmount: string): Promise<BondingCurveQuote> {
    try {
      // Development fallback: return mock quote if provider issues
      if (!this.provider || import.meta.env.DEV) {
        console.log("🔄 Using mock bonding curve quote for development");
        return this.getMockBuyQuote(coreAmount);
      }

      const contract = this.getContract(tokenAddress);
      const coreAmountWei = ethers.parseEther(coreAmount);

      // Guard: if token is graduated, bonding curve is no longer active
      try {
        const [, , , , isGraduated] = await contract.getBondingCurveInfo();
        if (isGraduated) {
          throw new BondingCurveError("GRADUATED_TOKEN", "Token has graduated to DEX");
        }
      } catch (e) {
        // If getBondingCurveInfo is not available, continue and rely on quote call
      }

      try {
        const [tokenAmount, currentPrice, newPrice, priceImpact] = await contract.getBuyQuote(coreAmountWei);

        // Calculate additional quote details
        const platformFee = (BigInt(coreAmountWei) * BigInt(100)) / BigInt(10000); // 1% platform fee
        const slippage = 0.5; // 0.5% default slippage
        const minimumReceived = (BigInt(tokenAmount) * BigInt(9950)) / BigInt(10000); // 0.5% slippage

        // Determine risk level based on price impact
        let riskLevel: "low" | "medium" | "high" = "low";
        let warning: string | undefined;

        const priceImpactPercent = Number(priceImpact) / 100; // Convert from basis points

        if (priceImpactPercent > 10) {
          riskLevel = "high";
          warning = "Very high price impact detected. Consider reducing trade size.";
        } else if (priceImpactPercent > 5) {
          riskLevel = "medium";
          warning = "High price impact detected.";
        }

        return {
          tokenAmount: ethers.formatEther(tokenAmount),
          coreAmount,
          currentPrice: ethers.formatEther(currentPrice),
          newPrice: ethers.formatEther(newPrice),
          priceImpact: priceImpactPercent,
          platformFee: ethers.formatEther(platformFee),
          slippage,
          minimumReceived: ethers.formatEther(minimumReceived),
          gasEstimate: "0.002",
          riskLevel,
          warning,
        };
      } catch (primaryErr) {
        // Fallback to exact on-chain math functions (no simulation)
        const [, , currentPrice] = await (async () => {
          try {
            const info = await contract.getBondingCurveInfo();
            return [info[0], info[1], info[2]] as const;
          } catch {
            const s = (await contract.currentSupply?.()) ?? (await contract.totalSupply());
            const r = await contract.reserveBalance?.();
            const p = await contract.getCurrentPrice?.();
            return [s, r, p] as const;
          }
        })();

        const tokenAmount = await contract.calculatePurchaseReturn(coreAmountWei);
        const effectivePrice = Number(coreAmount) / Number(ethers.formatEther(tokenAmount));
        const priceImpactPercent = currentPrice
          ? Math.max(0, (effectivePrice - Number(ethers.formatEther(currentPrice))) / Number(ethers.formatEther(currentPrice))) * 100
          : 0;

        const platformFee = (BigInt(coreAmountWei) * BigInt(100)) / BigInt(10000); // 1%
        const slippage = 0.5;
        const minimumReceived = (BigInt(tokenAmount) * BigInt(9950)) / BigInt(10000);

        return {
          tokenAmount: ethers.formatEther(tokenAmount),
          coreAmount,
          currentPrice: currentPrice ? ethers.formatEther(currentPrice) : effectivePrice.toString(),
          newPrice: effectivePrice.toString(),
          priceImpact: priceImpactPercent,
          platformFee: ethers.formatEther(platformFee),
          slippage,
          minimumReceived: ethers.formatEther(minimumReceived),
          gasEstimate: "0.002",
          riskLevel: priceImpactPercent > 10 ? "high" : priceImpactPercent > 5 ? "medium" : "low",
        };
      }
    } catch (error) {
      if (error instanceof BondingCurveError && error.code === "GRADUATED_TOKEN") throw error;
      console.error("Error getting buy quote:", error);
      throw new BondingCurveError("BUY_QUOTE_ERROR", "Failed to get buy quote", error);
    }
  }

  /**
   * Get sell quote from smart contract
   */
  async getSellQuote(tokenAddress: string, tokenAmount: string): Promise<BondingCurveQuote> {
    try {
      // Development fallback: return mock quote if provider issues
      if (!this.provider || import.meta.env.DEV) {
        console.log("🔄 Using mock bonding curve sell quote for development");
        return this.getMockSellQuote(tokenAmount);
      }

      const contract = this.getContract(tokenAddress);
      const tokenAmountWei = ethers.parseEther(tokenAmount);

      // Guard graduated
      try {
        const [, , , , isGraduated] = await contract.getBondingCurveInfo();
        if (isGraduated) {
          throw new BondingCurveError("GRADUATED_TOKEN", "Token has graduated to DEX");
        }
      } catch (e) {}

      try {
        const [coreAmount, currentPrice, newPrice, priceImpact] = await contract.getSellQuote(tokenAmountWei);

        // Calculate additional quote details
        const platformFee = (BigInt(coreAmount) * BigInt(100)) / BigInt(10000); // 1% platform fee
        const slippage = 0.5; // 0.5% default slippage
        const minimumReceived = (BigInt(coreAmount) * BigInt(9950)) / BigInt(10000); // 0.5% slippage

        // Determine risk level based on price impact
        let riskLevel: "low" | "medium" | "high" = "low";
        let warning: string | undefined;

        const priceImpactPercent = Number(priceImpact) / 100; // Convert from basis points

        if (priceImpactPercent > 10) {
          riskLevel = "high";
          warning = "Very high price impact detected. Consider reducing trade size.";
        } else if (priceImpactPercent > 5) {
          riskLevel = "medium";
          warning = "High price impact detected.";
        }

        return {
          tokenAmount,
          coreAmount: ethers.formatEther(coreAmount),
          currentPrice: ethers.formatEther(currentPrice),
          newPrice: ethers.formatEther(newPrice),
          priceImpact: priceImpactPercent,
          platformFee: ethers.formatEther(platformFee),
          slippage,
          minimumReceived: ethers.formatEther(minimumReceived),
          gasEstimate: "0.002",
          riskLevel,
          warning,
        };
      } catch (primaryErr) {
        // Fallback to exact on-chain math (no simulation)
        const [, , currentPrice] = await (async () => {
          try {
            const info = await contract.getBondingCurveInfo();
            return [info[0], info[1], info[2]] as const;
          } catch {
            const s = (await contract.currentSupply?.()) ?? (await contract.totalSupply());
            const r = await contract.reserveBalance?.();
            const p = await contract.getCurrentPrice?.();
            return [s, r, p] as const;
          }
        })();

        const coreAmount = await contract.calculateSaleReturn(tokenAmountWei);
        const effectivePrice = Number(ethers.formatEther(coreAmount)) / Number(tokenAmount);
        const priceImpactPercent = currentPrice
          ? Math.max(0, (Number(ethers.formatEther(currentPrice)) - effectivePrice) / Number(ethers.formatEther(currentPrice))) * 100
          : 0;

        const platformFee = (BigInt(coreAmount) * BigInt(100)) / BigInt(10000); // 1%
        const slippage = 0.5;
        const minimumReceived = (BigInt(coreAmount) * BigInt(9950)) / BigInt(10000);

        return {
          tokenAmount,
          coreAmount: ethers.formatEther(coreAmount),
          currentPrice: currentPrice ? ethers.formatEther(currentPrice) : effectivePrice.toString(),
          newPrice: effectivePrice.toString(),
          priceImpact: priceImpactPercent,
          platformFee: ethers.formatEther(platformFee),
          slippage,
          minimumReceived: ethers.formatEther(minimumReceived),
          gasEstimate: "0.002",
          riskLevel: priceImpactPercent > 10 ? "high" : priceImpactPercent > 5 ? "medium" : "low",
        };
      }
    } catch (error) {
      if (error instanceof BondingCurveError && error.code === "GRADUATED_TOKEN") throw error;
      console.error("Error getting sell quote:", error);
      throw new BondingCurveError("SELL_QUOTE_ERROR", "Failed to get sell quote", error);
    }
  }

  /**
   * Execute buy transaction
   */
  async buyTokens(tokenAddress: string, coreAmount: string): Promise<BondingCurveTrade> {
    try {
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      const contract = this.getSignedContract(tokenAddress);
      const coreAmountWei = ethers.parseEther(coreAmount);

      // Get quote first for validation
      const quote = await this.getBuyQuote(tokenAddress, coreAmount);

      // Execute transaction
      const tx = await contract.buyTokens({ value: coreAmountWei });
      const receipt = await tx.wait();

      // Parse events to get actual amounts
      let actualTokenAmount = quote.tokenAmount;
      let actualCoreAmount = coreAmount;

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog?.name === "TokensPurchased") {
            actualCoreAmount = ethers.formatEther(parsedLog.args.coreAmount);
            actualTokenAmount = ethers.formatEther(parsedLog.args.tokensReceived);
          }
        } catch (e) {
          // Ignore parsing errors for non-contract logs
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenAmount: actualTokenAmount,
        coreAmount: actualCoreAmount,
        gasUsed: receipt.gasUsed.toString(),
        effectivePrice: (Number(actualCoreAmount) / Number(actualTokenAmount)).toString(),
      };
    } catch (error: any) {
      console.error("Error buying tokens:", error);
      return {
        success: false,
        error: error.message || "Transaction failed",
      };
    }
  }

  /**
   * Execute sell transaction
   */
  async sellTokens(tokenAddress: string, tokenAmount: string): Promise<BondingCurveTrade> {
    try {
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      const contract = this.getSignedContract(tokenAddress);
      const tokenAmountWei = ethers.parseEther(tokenAmount);

      // Get quote first for validation
      const quote = await this.getSellQuote(tokenAddress, tokenAmount);

      // Execute transaction
      const tx = await contract.sellTokens(tokenAmountWei);
      const receipt = await tx.wait();

      // Parse events to get actual amounts
      let actualTokenAmount = tokenAmount;
      let actualCoreAmount = quote.coreAmount;

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog?.name === "TokensSold") {
            actualTokenAmount = ethers.formatEther(parsedLog.args.tokensAmount);
            actualCoreAmount = ethers.formatEther(parsedLog.args.coreReceived);
          }
        } catch (e) {
          // Ignore parsing errors for non-contract logs
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenAmount: actualTokenAmount,
        coreAmount: actualCoreAmount,
        gasUsed: receipt.gasUsed.toString(),
        effectivePrice: (Number(actualCoreAmount) / Number(actualTokenAmount)).toString(),
      };
    } catch (error: any) {
      console.error("Error selling tokens:", error);
      return {
        success: false,
        error: error.message || "Transaction failed",
      };
    }
  }

  /**
   * Get user token balance
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const contract = this.getContract(tokenAddress);
      const balance = await contract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting token balance:", error);
      return "0";
    }
  }

  /**
   * Record agent interaction on-chain
   */
  async recordInteraction(tokenAddress: string, message: string): Promise<boolean> {
    try {
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      const contract = this.getSignedContract(tokenAddress);
      const tx = await contract.recordInteraction(message);
      await tx.wait();

      return true;
    } catch (error) {
      console.error("Error recording interaction:", error);
      return false;
    }
  }

  /**
   * Get current price from contract
   */
  async getCurrentPrice(tokenAddress: string): Promise<string> {
    try {
      const contract = this.getContract(tokenAddress);
      const price = await contract.getCurrentPrice();
      return ethers.formatEther(price);
    } catch (error) {
      console.error("Error getting current price:", error);
      return "0";
    }
  }

  /**
   * Check if token has graduated to DEX
   */
  async isGraduated(tokenAddress: string): Promise<boolean> {
    try {
      const contract = this.getContract(tokenAddress);
      return await contract.isGraduated();
    } catch (error) {
      console.error("Error checking graduation status:", error);
      return false;
    }
  }

  /**
   * Get bonding curve progress
   */
  async getBondingCurveProgress(tokenAddress: string): Promise<{
    currentSupply: string;
    maxSupply: string;
    progressPercentage: number;
    reserveBalance: string;
    graduationThreshold: string;
    remainingToGraduation: string;
  }> {
    try {
      const contract = this.getContract(tokenAddress);
      const [currentSupply, reserveBalance, , ,] = await contract.getBondingCurveInfo();

      // Constants from contract
      const BONDING_CURVE_SUPPLY = ethers.parseEther("800000000"); // 800M tokens
      const GRADUATION_THRESHOLD = ethers.parseEther("30000"); // 30,000 CORE

      const progressPercentage = (Number(reserveBalance) / Number(GRADUATION_THRESHOLD)) * 100;
      const remainingToGraduation = GRADUATION_THRESHOLD - reserveBalance;

      return {
        currentSupply: ethers.formatEther(currentSupply),
        maxSupply: ethers.formatEther(BONDING_CURVE_SUPPLY),
        progressPercentage: Math.min(progressPercentage, 100),
        reserveBalance: ethers.formatEther(reserveBalance),
        graduationThreshold: ethers.formatEther(GRADUATION_THRESHOLD),
        remainingToGraduation: ethers.formatEther(remainingToGraduation > 0 ? remainingToGraduation : BigInt(0)),
      };
    } catch (error) {
      console.error("Error getting bonding curve progress:", error);
      return {
        currentSupply: "0",
        maxSupply: "800000000",
        progressPercentage: 0,
        reserveBalance: "0",
        graduationThreshold: "30000",
        remainingToGraduation: "30000",
      };
    }
  }

  /**
   * Get trading history from backend
   */
  async getTradingHistory(tokenAddress: string, limit = 50): Promise<any[]> {
    try {
      const response = await apiService.get<{ trades: any[] }>(`/agents/${tokenAddress}/trades?limit=${limit}`);
      return response.data.trades || [];
    } catch (error) {
      console.error("Error getting trading history:", error);
      return [];
    }
  }

  /**
   * Get price history from backend
   */
  async getPriceHistory(tokenAddress: string, interval = "1h", limit = 100): Promise<any[]> {
    try {
      const response = await apiService.get<{ priceHistory: any[] }>(
        `/agents/${tokenAddress}/price-history?interval=${interval}&limit=${limit}`
      );
      return response.data.priceHistory || [];
    } catch (error) {
      console.error("Error getting price history:", error);
      return [];
    }
  }
}

// Create singleton instance
export const bondingCurveService = new BondingCurveService();
export default bondingCurveService;
