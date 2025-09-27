import { AlertTriangle, ArrowLeft, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAgentFactory } from "../hooks/useAgentFactory";
import { useAgentDetails } from "../hooks/useAgents";
import { useBondingCurveTrading } from "../hooks/useBondingCurveTrading";
import { useDEXTrading } from "../hooks/useDEXTrading";
import { useGraduationStatus } from "../hooks/useGraduationStatus";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useWallet } from "../hooks/useWallet";
import { useAgentRealtime, type AgentEvent } from "../hooks/useWebSocket";
import { apiService } from "../services/api";
import { formatNumber } from "../utils/formatters";
import { BondingCurveProgress } from "./BondingCurveProgress";
import { ProfessionalQuoteDisplay } from "./ProfessionalQuoteDisplay";
import { ProfessionalTradingStatus } from "./ProfessionalTradingStatus";

interface TradingQuote {
  coreAmount?: string;
  tokensReceived?: string;
  tokenAmount?: string;
  coreReceived?: string;
  currentPrice: string;
  newPrice: string;
  priceImpact: number;
  slippage: number;
  fees: {
    platformFee: string;
    creatorFee: string;
    totalFees: string;
  };
  minimumReceived: string;
  marketCap: string;
  reserve: string;
  error?: string;
}

const TradingInterface: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, address, connectWallet, isConnecting, isOnCoreNetwork, switchToCore, connectError, balance } = useWallet();
  const { buyTokens, sellTokens, isCreating } = useAgentFactory();

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<TradingQuote | null>(null);

  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format price with decimal notation (no scientific notation)
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;

    if (numPrice === 0) return "0.000000000000";
    if (isNaN(numPrice)) return "0.000000000000";

    // Always use decimal format with appropriate precision based on value size
    if (numPrice < 0.000000000001) {
      return numPrice.toFixed(18);
    } else if (numPrice < 0.000000001) {
      return numPrice.toFixed(15);
    } else if (numPrice < 0.000001) {
      return numPrice.toFixed(12);
    } else if (numPrice < 0.001) {
      return numPrice.toFixed(9);
    } else if (numPrice < 1) {
      return numPrice.toFixed(6);
    } else {
      return numPrice.toFixed(4);
    }
  };

  // Fetch agent data
  const { agent, loading: agentLoading } = useAgentDetails(id);
  const { balance: tokenBalance } = useTokenBalance(id);

  // Graduation status and DEX trading
  const graduationStatus = useGraduationStatus(id || "", true);
  const dexTrading = useDEXTrading(id || "", address);

  // PANTHERA Bonding Curve Trading
  const bondingCurveTrading = useBondingCurveTrading(id);

  // Real-time WebSocket data
  const { agentStats, recentEvents } = useAgentRealtime(id || "");

  // Fetch balance function
  const fetchBalance = useCallback(async () => {
    try {
      if (!address) {
        console.log("No wallet address available");
        return;
      }

      // Balance fetching would be implemented here
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, [address]);

  // Quote function removed - now handled inline in useEffect
  const getQuoteOld = useCallback(async () => {
    if (!amount || !id) return;

    // Clear previous errors
    setError(null);

    // Enhanced amount validation
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    // Minimum amount validation (aligned with backend)
    if (numAmount < 0.0001) {
      setError("Minimum trade amount is 0.0001 CORE. Please increase your amount.");
      return;
    }

    // Maximum amount validation removed - users can trade any amount

    // Additional validation for sell orders
    if (activeTab === "sell" && tokenBalance && numAmount > parseFloat(tokenBalance)) {
      setError("Insufficient token balance. Please reduce your amount.");
      return;
    }

    try {
      setQuoteLoading(true);
      setError(null);

      console.log("🔄 Professional quote request:", {
        amount: numAmount,
        activeTab,
        tokenAddress: id,
        timestamp: new Date().toISOString(),
      });

      // Check if token is graduated and use appropriate trading method
      console.log("🔍 Graduation Status Debug:", {
        isGraduated: graduationStatus.isGraduated,
        currentReserve: graduationStatus.currentReserve,
        graduationThreshold: graduationStatus.graduationThreshold,
        progressPercentage: graduationStatus.progressPercentage,
        loading: graduationStatus.loading,
        error: graduationStatus.error,
      });

      if (graduationStatus.isGraduated) {
        console.log("🎓 Token is graduated, using DEX quote");

        try {
          const dexQuote = await dexTrading.getDEXQuote(amount, activeTab === "buy", 2);

          // Convert DEX quote to TradingQuote format
          const tradingQuote: TradingQuote = {
            coreAmount: activeTab === "buy" ? amount : dexQuote.outputAmount,
            tokensReceived: activeTab === "buy" ? dexQuote.outputAmount : amount,
            tokenAmount: activeTab === "sell" ? amount : dexQuote.outputAmount,
            coreReceived: activeTab === "sell" ? dexQuote.outputAmount : amount,
            currentPrice: "0", // DEX price is market-driven
            newPrice: "0",
            priceImpact: dexQuote.priceImpact,
            slippage: dexQuote.slippage,
            fees: {
              platformFee: "0.003", // 0.3% DEX fee
              creatorFee: "0",
              totalFees: "0.003",
            },
            minimumReceived: dexQuote.minimumReceived,
            marketCap: "0",
            reserve: "0",
          };

          setQuote(tradingQuote);
        } catch (dexError) {
          console.error("DEX quote error:", dexError);
          setError("DEX quote failed. Please try again.");
        }
      } else {
        console.log("📈 Token is not graduated, using bonding curve quote");

        try {
          // Use bonding curve for non-graduated tokens
          const response = activeTab === "buy" ? await apiService.getBuyQuote(id, amount) : await apiService.getSellQuote(id, amount);

          // Check if backend returned graduation error
          if (response.data?.error && response.data.error.includes("graduated")) {
            console.log("🎓 Backend says token is graduated, switching to DEX");

            try {
              // Token is actually graduated, use DEX quote
              const dexQuote = await dexTrading.getDEXQuote(amount, activeTab === "buy", 2);

              const tradingQuote: TradingQuote = {
                coreAmount: activeTab === "buy" ? amount : dexQuote.outputAmount,
                tokensReceived: activeTab === "buy" ? dexQuote.outputAmount : amount,
                tokenAmount: activeTab === "sell" ? amount : dexQuote.outputAmount,
                coreReceived: activeTab === "sell" ? dexQuote.outputAmount : amount,
                currentPrice: "0",
                newPrice: "0",
                priceImpact: dexQuote.priceImpact,
                slippage: dexQuote.slippage,
                fees: {
                  platformFee: "0.003",
                  creatorFee: "0",
                  totalFees: "0.003",
                },
                minimumReceived: dexQuote.minimumReceived,
                marketCap: "0",
                reserve: "0",
              };

              setQuote(tradingQuote);
              console.log("✅ DEX quote generated successfully:", tradingQuote);
            } catch (dexError) {
              console.error("❌ DEX quote failed:", dexError);
              setError("Token is graduated but DEX quote failed. Please try again.");
            }
          } else {
            // Use PANTHERA bonding curve for quote generation
            try {
              const bondingQuote = await bondingCurveTrading.getQuote(activeTab, amount);

              if (bondingQuote) {
                // Convert bonding curve quote to TradingQuote interface
                const tradingQuote: TradingQuote = {
                  coreAmount: activeTab === "buy" ? bondingQuote.inputAmount : bondingQuote.coreReceived,
                  tokensReceived: bondingQuote.tokensReceived,
                  tokenAmount: activeTab === "sell" ? bondingQuote.inputAmount : bondingQuote.outputAmount,
                  coreReceived: bondingQuote.coreReceived,
                  currentPrice: bondingQuote.currentPrice,
                  newPrice: bondingQuote.newPrice,
                  priceImpact: bondingQuote.priceImpact,
                  slippage: bondingQuote.slippage,
                  fees: bondingQuote.fees,
                  minimumReceived: bondingQuote.minimumReceived,
                  marketCap: String(agentStats?.marketCap || "0"),
                  reserve: "0", // Reserve will be fetched from bonding curve contract
                };

                setQuote(tradingQuote);
                console.log("✅ PANTHERA bonding curve quote generated successfully:", tradingQuote);
              } else {
                // Fallback to API quote if bonding curve fails
                const quoteData = response.data?.quote || ("quote" in response ? (response as { quote: TradingQuote }).quote : response);
                setQuote(quoteData as TradingQuote);
                console.log("✅ Fallback API quote generated successfully");
              }
            } catch (bondingError) {
              console.error("❌ Bonding curve quote failed, using API fallback:", bondingError);
              // Fallback to API quote
              const quoteData = response.data?.quote || ("quote" in response ? (response as { quote: TradingQuote }).quote : response);
              setQuote(quoteData as TradingQuote);
            }
          }
        } catch (apiError) {
          // Enhanced API error handling
          const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
          console.log("🔍 Professional API error analysis:", { errorMessage, apiError });

          // Check for specific error types
          if (errorMessage.includes("GRADUATED_TOKEN") || errorMessage.includes("graduated") || errorMessage.includes("DEX")) {
            console.log("🎓 Professional graduation detection via API error, switching to DEX");

            try {
              const dexQuote = await dexTrading.getDEXQuote(amount, activeTab === "buy", 2);

              const tradingQuote: TradingQuote = {
                coreAmount: activeTab === "buy" ? amount : dexQuote.outputAmount,
                tokensReceived: activeTab === "buy" ? dexQuote.outputAmount : amount,
                tokenAmount: activeTab === "sell" ? amount : dexQuote.outputAmount,
                coreReceived: activeTab === "sell" ? dexQuote.outputAmount : amount,
                currentPrice: "0",
                newPrice: "0",
                priceImpact: dexQuote.priceImpact,
                slippage: dexQuote.slippage,
                fees: {
                  platformFee: "0.003",
                  creatorFee: "0",
                  totalFees: "0.003",
                },
                minimumReceived: dexQuote.minimumReceived,
                marketCap: "0",
                reserve: "0",
              };

              setQuote(tradingQuote);
              console.log("✅ DEX quote generated after API error:", tradingQuote);
            } catch (dexError) {
              console.error("❌ DEX quote failed after API error:", dexError);
              setError("Token appears to be graduated but DEX quote failed. Please try again.");
            }
          } else {
            console.error("❌ Professional API error not related to graduation:", apiError);

            // Enhanced error categorization
            if (errorMessage === "TOKEN_NOT_FOUND") {
              setError("Token not found. Please check the token address.");
            } else if (errorMessage === "SERVER_ERROR") {
              setError("Server temporarily unavailable. Please try again later.");
            } else if (errorMessage.includes("BAD_REQUEST") || errorMessage.includes("Validation failed")) {
              // Check for specific validation errors
              if (errorMessage.includes("Amount must be at least")) {
                setError("Minimum trade amount is 0.0001 CORE. Please increase your amount.");
              } else if (errorMessage.includes("Invalid agent address")) {
                setError("Invalid token address. Please check the address format.");
              } else {
                setError("Invalid request parameters. Please check your input and try again.");
              }
            } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
              setError("Network error. Please check your connection and try again.");
            } else if (errorMessage.includes("timeout")) {
              setError("Request timed out. Please try again.");
            } else {
              setError("Failed to get quote. Please try again.");
            }
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [activeTab, id, amount, graduationStatus.isGraduated]); // Include amount to capture changes
  void getQuoteOld;

  // Fetch user balance
  useEffect(() => {
    if (isConnected && address && id) {
      fetchBalance();
    }
  }, [isConnected, address, id, fetchBalance]);

  // Update balance from real-time events
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0 && address) {
      const userEvents = recentEvents.filter((event: AgentEvent) => {
        const eventData = event.data as { user?: string; buyer?: string; seller?: string };
        return (
          eventData?.user?.toLowerCase() === address.toLowerCase() ||
          eventData?.buyer?.toLowerCase() === address.toLowerCase() ||
          eventData?.seller?.toLowerCase() === address.toLowerCase()
        );
      });

      if (userEvents.length > 0) {
        console.log("📡 User trading events detected, refreshing balance...");
        setTimeout(() => {
          fetchBalance();
        }, 1000);
      }
    }
  }, [recentEvents, address, fetchBalance]);

  // Professional quote management with intelligent debouncing
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && id) {
      const timeoutId = setTimeout(async () => {
        console.log("🔄 Professional quote request with debounce:", { amount, activeTab, id });

        // Inline quote logic to avoid dependency issues
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          setError("Please enter a valid amount greater than 0");
          return;
        }

        if (numAmount < 0.0001) {
          setError("Minimum trade amount is 0.0001 CORE. Please increase your amount.");
          return;
        }

        // Maximum amount validation removed - users can trade any amount

        if (activeTab === "sell" && tokenBalance && numAmount > parseFloat(tokenBalance)) {
          setError("Insufficient token balance. Please reduce your amount.");
          return;
        }

        try {
          setQuoteLoading(true);
          setError(null);

          console.log("🔄 Professional quote request:", {
            amount: numAmount,
            activeTab,
            tokenAddress: id,
            timestamp: new Date().toISOString(),
          });

          if (graduationStatus.isGraduated) {
            console.log("🎓 Token is graduated, using DEX quote");
            // DEX logic would go here
            setError("DEX trading not yet implemented");
          } else {
            console.log("📈 Token is not graduated, using bonding curve quote");

            try {
              const response = activeTab === "buy" ? await apiService.getBuyQuote(id, amount) : await apiService.getSellQuote(id, amount);

              console.log("🔍 API Response Debug:", response);

              // Backend returns direct response: { success: true, quote: {...} }
              if (response && (response as any).success && (response as any).quote) {
                const quote = (response as any).quote;
                const tradingQuote = {
                  coreAmount: activeTab === "buy" ? amount : quote.coreReceived || "0",
                  tokensReceived: activeTab === "buy" ? quote.tokensReceived || quote.tokenAmount || "0" : "0",
                  tokenAmount: activeTab === "sell" ? amount : quote.tokenAmount || "0",
                  coreReceived: activeTab === "sell" ? quote.coreReceived || "0" : "0",
                  currentPrice: quote.currentPrice || "0",
                  newPrice: quote.newPrice || "0",
                  priceImpact: typeof quote.priceImpact === "number" ? quote.priceImpact : parseFloat(quote.priceImpact) || 0,
                  slippage: quote.slippage || 0.5,
                  fees: {
                    platformFee: quote.fees?.platformFee || "0",
                    creatorFee: quote.fees?.creatorFee || "0",
                    totalFees: quote.fees?.totalFees || "0",
                  },
                  minimumReceived: quote.minimumReceived || "0",
                  marketCap: quote.marketCap || "0",
                  reserve: quote.reserve || "0",
                };

                setQuote(tradingQuote);
                console.log("✅ PANTHERA bonding curve quote generated successfully:", tradingQuote);
              } else {
                console.error("❌ API Response Error:", response);
                setError((response as any)?.error || "Failed to get quote. Please try again.");
              }
            } catch (bondingError) {
              console.error("❌ Bonding curve quote failed:", bondingError);
              setError("Failed to get quote. Please try again.");
            }
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : "Failed to get quote");
        } finally {
          setQuoteLoading(false);
        }
      }, 800); // Quick debounce - 0.8 seconds for responsive UX

      return () => clearTimeout(timeoutId);
    } else {
      setQuote(null);
      setError(null);
    }
  }, [amount, activeTab, id, graduationStatus.isGraduated, tokenBalance]);

  // Disabled automatic price updates to prevent constant refreshing
  // useEffect(() => {
  //   if (agentStats && amount && parseFloat(amount) > 0) {
  //     // Only update if price changed significantly (>5%)
  //     const currentPrice = parseFloat(String(agentStats.price || '0'));
  //     const lastPrice = parseFloat(quote?.currentPrice || '0');
  //     const priceChangePercent = lastPrice > 0 ? Math.abs((currentPrice - lastPrice) / lastPrice) * 100 : 100;

  //     if (priceChangePercent > 5) {
  //       console.log('📡 Significant price change detected, refreshing quote...', { priceChangePercent });
  //       setTimeout(() => {
  //         getQuote();
  //       }, 10000); // Much longer delay for price updates
  //     }
  //   }
  // }, [agentStats?.price, agentStats, amount, getQuote, quote?.currentPrice]);

  const safeNumber = (v: any): number => {
    if (v === null || v === undefined) return NaN;
    const s = typeof v === "string" ? v.replace(/,/g, "") : v;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const toDecimalString = (n: number, dp = 18): string => {
    if (!Number.isFinite(n) || n <= 0) return "0";
    // toFixed -> string döner, scientific notation yok
    // son sıfırları ve son noktayı temizliyoruz
    return n.toFixed(dp).replace(/0+$/, "").replace(/\.$/, "") || "0";
  };

  const handleTrade = async () => {
    // Check wallet connection
    if (!isConnected) {
      try {
        console.log("🔗 Wallet not connected, attempting to connect...");
        await connectWallet();
        return;
      } catch (error) {
        console.error("❌ Failed to connect wallet:", error);
        setError(error instanceof Error ? error.message : "Failed to connect wallet");
        return;
      }
    }

    // Check network
    if (!isOnCoreNetwork) {
      try {
        console.log("🔄 Wrong network, switching to Core...");
        switchToCore();
        return;
      } catch (error) {
        console.error("❌ Failed to switch network:", error);
        setError("Please switch to Core network to trade");
        return;
      }
    }

    if (!quote || !amount || !id) {
      setError("Missing trade parameters");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🚀 Professional trade execution initiated:", {
        activeTab,
        amount,
        tokenAddress: id,
        quote,
        graduationStatus: graduationStatus.isGraduated ? "graduated" : "bonding-curve",
        tradingMethod: graduationStatus.isGraduated ? "DEX" : "Bonding Curve",
        slippage: 2,
        timestamp: new Date().toISOString(),
      });

      // Check if token is graduated and use appropriate trading method
      if (graduationStatus.isGraduated) {
        console.log("🎓 Token is graduated, using DEX trading");

        // 1) DEX quote al
        const dexQuote = await dexTrading.getDEXQuote(amount, activeTab === "buy", 2);

        // 2) İşlem yap (TEK satır; kopya yok)
        const txHash = await dexTrading.executeDEXTrade(dexQuote, activeTab === "buy");

        // 3) Backend'e trade kaydı (grafik mumu için)
        try {
          // DEX için miktarları dexQuote'tan alalım
          const coreAmountStr =
            activeTab === "buy"
              ? String(amount) // BUY: harcanan CORE
              : String(dexQuote.outputAmount); // SELL: alınan CORE

          const tokenAmountStr =
            activeTab === "buy"
              ? String(dexQuote.outputAmount) // BUY: alınan token
              : String(amount); // SELL: satılan token

          // fiyat = CORE / token  (küçük sayı olabilir; düz ondalık string’e çevir)
          let priceNum = safeNumber(coreAmountStr) / safeNumber(tokenAmountStr);
          if (!Number.isFinite(priceNum)) {
            priceNum = safeNumber(quote?.currentPrice) || safeNumber(quote?.newPrice) || safeNumber(graduationStatus.currentPrice);
          }
          const priceStr = toDecimalString(priceNum); // bilimsel gösterim yok

          console.log("record-trade payload (DEX)", { coreAmountStr, tokenAmountStr, priceNum, priceStr });

          await apiService.post("/trading/record-trade", {
            agentAddress: id!,
            transactionHash: txHash,
            trader: address!,
            type: activeTab, // 'buy' | 'sell'
            coreAmount: coreAmountStr, // string
            tokenAmount: tokenAmountStr, // string
            price: priceStr, // <-- string gönder
            timestamp: new Date().toISOString(),
          });
          console.log("✅ record-trade ok (DEX)");
        } catch (e) {
          console.error("❌ record-trade failed (DEX)", e);
        }

        // 4) UI mesaj + event
        console.log("✅ Professional DEX transaction successful:", { txHash });

        setSuccessMessage(
          `${activeTab === "buy" ? "Bought" : "Sold"} ${formatNumber(amount)} ` +
            `${activeTab === "buy" ? agent?.tokenSymbol || "tokens" : "CORE"} successfully via Professional DEX!`
        );
        setTimeout(() => setSuccessMessage(null), 5000);

        window.dispatchEvent(
          new CustomEvent("trading-success", {
            detail: {
              type: activeTab,
              txHash,
              tokenAddress: id,
              amount,
              tradingMethod: "dex",
            },
          })
        );
      } else {
        console.log("📈 Token is not graduated, using bonding curve trading");

        // Final backend sanity check to avoid reverted on-chain calls
        try {
          if (activeTab === "buy") {
            await apiService.getBuyQuote(id, "0.0001");
          } else {
            await apiService.getSellQuote(id, "0.0001");
          }
        } catch (precheckError) {
          const em = precheckError instanceof Error ? precheckError.message.toLowerCase() : String(precheckError).toLowerCase();
          if (em.includes("graduated_token") || em.includes("graduated")) {
            console.log("🎓 Backend precheck indicates graduation. Switching to DEX trading.");

            // Get fresh DEX quote for execution
            const dexQuote = await dexTrading.getDEXQuote(amount, activeTab === "buy", 2);

            // Use DEX trading for graduated tokens
            const txHash = await dexTrading.executeDEXTrade(dexQuote, activeTab === "buy");

            console.log("✅ Professional DEX transaction successful (post-precheck):", { txHash });
            setSuccessMessage(
              `${activeTab === "buy" ? "Bought" : "Sold"} ${formatNumber(amount)} ${
                activeTab === "buy" ? agent?.tokenSymbol || "tokens" : "CORE"
              } successfully via Professional DEX!`
            );
            setTimeout(() => setSuccessMessage(null), 5000);
            window.dispatchEvent(
              new CustomEvent("trading-success", {
                detail: { type: activeTab, txHash, tokenAddress: id, amount, tradingMethod: "dex" },
              })
            );
            return; // stop bonding curve flow
          }
        }

        if (activeTab === "buy") {
          // Buy tokens with CORE using bonding curve
          await buyTokens(id, amount, (txHash) => {
            console.log("✅ Buy transaction successful:", txHash);

            (async () => {
              try {
                // BUY: CORE = girilen amount, TOKEN = quote.tokensReceived
                const coreAmountStr = String(amount);
                const tokenAmountStr = String(quote?.tokensReceived ?? "0");

                let priceNum = safeNumber(coreAmountStr) / safeNumber(tokenAmountStr);
                if (!Number.isFinite(priceNum)) {
                  priceNum = safeNumber(quote?.currentPrice) || safeNumber(quote?.newPrice) || safeNumber(graduationStatus.currentPrice);
                }
                const priceStr = toDecimalString(priceNum);

                console.log("record-trade payload (bonding BUY)", { coreAmountStr, tokenAmountStr, priceNum, priceStr });

                await apiService.post("/trading/record-trade", {
                  agentAddress: id!,
                  transactionHash: txHash,
                  trader: address!,
                  type: "buy", // BUY
                  coreAmount: coreAmountStr, // girilen CORE
                  tokenAmount: tokenAmountStr, // alınan token
                  price: priceStr,
                  timestamp: new Date().toISOString(),
                });

                console.log("✅ record-trade ok (bonding BUY)");
              } catch (e) {
                console.error("❌ record-trade failed (bonding BUY)", e);
              }
            })();

            // Set success message
            setSuccessMessage(`Bought ${formatNumber(amount)} ${agent?.tokenSymbol || "tokens"} successfully via bonding curve!`);

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);

            // Dispatch event for chart update
            window.dispatchEvent(
              new CustomEvent("trading-success", {
                detail: {
                  type: "buy",
                  txHash,
                  tokenAddress: id,
                  amount,
                  tradingMethod: "bonding-curve",
                },
              })
            );
          });
        } else {
          // Sell tokens for CORE using bonding curve
          await sellTokens(id, amount, (txHash) => {
            console.log("✅ Sell transaction successful:", txHash);

            (async () => {
              try {
                // SELL: TOKEN = girilen amount, CORE = quote.coreReceived
                const tokenAmountStr = String(amount);
                const coreAmountStr = String(quote?.coreReceived ?? "0");

                let priceNum = safeNumber(coreAmountStr) / safeNumber(tokenAmountStr);
                if (!Number.isFinite(priceNum)) {
                  priceNum = safeNumber(quote?.currentPrice) || safeNumber(quote?.newPrice) || safeNumber(graduationStatus.currentPrice);
                }
                const priceStr = toDecimalString(priceNum);

                console.log("record-trade payload (bonding SELL)", { coreAmountStr, tokenAmountStr, priceNum, priceStr });

                await apiService.post("/trading/record-trade", {
                  agentAddress: id!,
                  transactionHash: txHash,
                  trader: address!,
                  type: "sell", // SELL
                  coreAmount: coreAmountStr, // alınan CORE
                  tokenAmount: tokenAmountStr, // satılan token
                  price: priceStr,
                  timestamp: new Date().toISOString(),
                });

                console.log("✅ record-trade ok (bonding SELL)");
              } catch (e) {
                console.error("❌ record-trade failed (bonding SELL)", e);
              }
            })();

            // Set success message
            setSuccessMessage(`Sold ${formatNumber(amount)} ${agent?.tokenSymbol || "tokens"} successfully via bonding curve!`);

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);

            // Dispatch event for chart update
            window.dispatchEvent(
              new CustomEvent("trading-success", {
                detail: {
                  type: "sell",
                  txHash,
                  tokenAddress: id,
                  amount,
                  tradingMethod: "bonding-curve",
                },
              })
            );
          });
        }
      }

      // Refresh balance after trade
      await fetchBalance();

      // Clear form
      setAmount("");
      setQuote(null);
    } catch (error) {
      console.error("❌ Professional trade execution failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        tokenAddress: id,
        amount,
        activeTab,
        graduationStatus: graduationStatus.isGraduated,
        timestamp: new Date().toISOString(),
      });

      // Professional error message
      const errorMessage = error instanceof Error ? error.message : "Professional trade execution failed";
      setError(`Trading Error: ${errorMessage}`);

      // Dispatch error event for analytics
      window.dispatchEvent(
        new CustomEvent("trading-error", {
          detail: {
            error: errorMessage,
            tokenAddress: id,
            amount,
            type: activeTab,
            tradingMethod: graduationStatus.isGraduated ? "dex" : "bonding-curve",
            timestamp: new Date().toISOString(),
          },
        })
      );
    } finally {
      setLoading(false);
    }
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] ml-[200px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d8e9ea] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#a0a0a0]">Loading trading interface...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] ml-[200px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Agent not found</p>
          <button
            onClick={() => navigate("/")}
            className="bg-[#d8e9ea] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] ml-[200px]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/agent/${id}`)}
              className="flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Agent
            </button>

            <div className="flex items-center gap-3">
              <img
                src={agent.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`}
                alt={agent.tokenName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <h1 className="text-lg font-semibold text-white">{agent.tokenName}</h1>
                <p className="text-sm text-[#a0a0a0]">{agent.tokenSymbol}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trading Panel */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            {/* Wallet Status */}
            <div className="mb-4 p-3 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-sm text-[#a0a0a0]">{isConnected ? "Wallet Connected" : "Wallet Disconnected"}</span>
                </div>
                {isConnected && (
                  <div className="flex items-center space-x-2">
                    {!isOnCoreNetwork && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Wrong Network</span>}
                    <span className="text-xs text-[#666]">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}</span>
                  </div>
                )}
              </div>
              {connectError && <div className="mt-2 text-xs text-red-400">{connectError.message}</div>}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">{successMessage}</span>
                </div>
              </div>
            )}

            <h2 className="text-xl font-semibold text-white mb-6">Trade {agent?.tokenSymbol || "Token"}</h2>

            {/* Professional Bonding Curve Progress */}
            <BondingCurveProgress
              currentReserve={graduationStatus.currentReserve}
              graduationThreshold={graduationStatus.graduationThreshold}
              isGraduated={graduationStatus.isGraduated}
              currentPrice={graduationStatus.currentPrice}
              marketCap={graduationStatus.marketCap}
              holders={0}
              variant="full"
              className="mb-6"
            />

            {/* Current Price Display */}
            {graduationStatus.currentPrice > 0 && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-[#a0a0a0]">Current Price</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium text-white">{formatPrice(graduationStatus.currentPrice)} CORE</div>
                    <div className="text-xs text-[#a0a0a0]">per {agent.tokenSymbol}</div>
                  </div>
                </div>
                {graduationStatus.marketCap > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2a2a2a]">
                    <span className="text-sm text-[#a0a0a0]">Market Cap</span>
                    <span className="text-sm font-medium text-white">{formatNumber(graduationStatus.marketCap.toString())} CORE</span>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#0a0a0a] rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab("buy")}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === "buy" ? "bg-green-600 text-white" : "text-[#a0a0a0] hover:text-white"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setActiveTab("sell")}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === "sell" ? "bg-red-600 text-white" : "text-[#a0a0a0] hover:text-white"
                }`}
              >
                Sell
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                {activeTab === "buy" ? "CORE Amount" : `${agent.tokenSymbol} Amount`}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for clearing
                    if (value === "") {
                      setAmount("");
                      setError(null);
                      return;
                    }

                    // Validate numeric input
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                      setError("Please enter a valid number");
                      return;
                    }

                    // Check minimum amount
                    if (numValue > 0 && numValue < 0.0001) {
                      setError("Minimum trade amount is 0.0001 CORE");
                      // Maximum amount validation removed
                    } else if (activeTab === "sell" && tokenBalance && numValue > parseFloat(tokenBalance)) {
                      setError("Insufficient token balance");
                    } else {
                      setError(null);
                    }

                    setAmount(value);
                  }}
                  placeholder="0.0"
                  min="0.0001"
                  max="1000"
                  step="0.0001"
                  className={`w-full bg-[#0a0a0a] border rounded-lg px-4 py-3 text-white placeholder-[#a0a0a0] focus:outline-none transition-colors ${
                    error && amount ? "border-red-500 focus:border-red-400" : "border-[#2a2a2a] focus:border-[#d8e9ea]"
                  }`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-[#a0a0a0] text-sm">{activeTab === "buy" ? "CORE" : agent.tokenSymbol}</span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-3">
                {[0.001, 0.01, 0.1, 1].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => {
                      setAmount(quickAmount.toString());
                      setError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a] transition-colors"
                  >
                    {quickAmount}
                  </button>
                ))}
              </div>

              {/* Balance */}
              {isConnected && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-[#a0a0a0]">
                    Balance: {activeTab === "sell" ? formatNumber(tokenBalance) : balance ? formatNumber(balance.formatted) : "0.00"}{" "}
                    {activeTab === "buy" ? "CORE" : agent.tokenSymbol}
                  </span>
                  {activeTab === "sell" && parseFloat(tokenBalance) > 0 && (
                    <button
                      onClick={() => {
                        setAmount(tokenBalance);
                        setError(null);
                      }}
                      className="text-sm text-[#d8e9ea] hover:text-white transition-colors"
                    >
                      Max
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Professional Quote Display */}
            <ProfessionalQuoteDisplay
              quote={quote}
              tradeType={activeTab}
              amount={amount}
              isGraduated={graduationStatus.isGraduated}
              loading={quoteLoading}
              error={error}
              className="mb-6"
            />

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Trade Button */}
            <button
              onClick={handleTrade}
              disabled={loading || isCreating || !quote || !amount || parseFloat(amount) <= 0 || !!quote?.error}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                activeTab === "buy"
                  ? "bg-green-600 hover:bg-green-700 disabled:bg-green-600/50"
                  : "bg-red-600 hover:bg-red-700 disabled:bg-red-600/50"
              } text-white disabled:cursor-not-allowed`}
            >
              {loading || isCreating ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{graduationStatus.isGraduated ? `Processing DEX ${activeTab}...` : `Processing ${activeTab}...`}</span>
                </div>
              ) : isConnecting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : !isConnected ? (
                "Connect Wallet"
              ) : !isOnCoreNetwork ? (
                "Switch to Core Network"
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {activeTab === "buy" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>
                    {activeTab === "buy" ? "Buy" : "Sell"} {agent?.tokenSymbol || "Token"}
                    {graduationStatus.isGraduated && <span className="text-xs opacity-75 ml-1">(DEX)</span>}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Market Info */}
          <div className="space-y-6">
            {/* Price Info */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Information</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Current Price</span>
                  <span className="text-white font-medium">
                    {graduationStatus.currentPrice > 0
                      ? `${formatPrice(graduationStatus.currentPrice)} CORE`
                      : `${formatPrice(parseFloat(agent?.currentPrice?.toString() || "0"))} CORE`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Market Cap</span>
                  <span className="text-white font-medium">
                    {graduationStatus.marketCap > 0
                      ? `${formatNumber(graduationStatus.marketCap.toString())} CORE`
                      : formatNumber(agent?.bondingCurveInfo?.marketCap || "0", { prefix: "$", compact: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Trading Method</span>
                  <span className={`font-medium ${graduationStatus.isGraduated ? "text-yellow-400" : "text-blue-400"}`}>
                    {graduationStatus.isGraduated ? "DEX Trading" : "Bonding Curve"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Reserve Balance</span>
                  <span className="text-white font-medium">{formatNumber(graduationStatus.currentReserve.toString())} CORE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Graduation Progress</span>
                  <span className="text-white font-medium">
                    {graduationStatus.progressPercentage >= 10
                      ? `${graduationStatus.progressPercentage.toFixed(1)}% Complete`
                      : graduationStatus.progressPercentage >= 1
                      ? `${graduationStatus.progressPercentage.toFixed(2)}% Complete`
                      : graduationStatus.progressPercentage >= 0.1
                      ? `${graduationStatus.progressPercentage.toFixed(3)}% Complete`
                      : graduationStatus.progressPercentage >= 0.01
                      ? `${graduationStatus.progressPercentage.toFixed(4)}% Complete`
                      : `${graduationStatus.progressPercentage.toFixed(5)}% Complete`}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Stats */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Live Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Last Update</span>
                  <span className="text-white font-medium">
                    {graduationStatus.lastUpdate ? new Date(graduationStatus.lastUpdate).toLocaleTimeString() : "Loading..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Data Source</span>
                  <span className="text-green-400 font-medium">Live Blockchain</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Update Frequency</span>
                  <span className="text-blue-400 font-medium">{formatNumber("30")}s intervals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a0a0a0]">Network</span>
                  <span className="text-orange-400 font-medium">Core DAO</span>
                </div>
                {graduationStatus.error && (
                  <div className="flex justify-between">
                    <span className="text-[#a0a0a0]">Status</span>
                    <span className="text-yellow-400 font-medium">Using Cache</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trading Tips */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Trading Tips</h3>
              <div className="space-y-3 text-sm text-[#a0a0a0]">
                {graduationStatus.isGraduated ? (
                  <>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>This token trades on DEX with unlimited liquidity</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Market-driven pricing with {formatNumber("0.3")}% DEX fees</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Slippage protection set to {formatNumber("2")}% by default</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span>Professional Uniswap V2 integration</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-[#d8e9ea] mt-0.5 flex-shrink-0" />
                      <span>Larger trades have higher price impact</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Buying increases the token price</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>Selling decreases the token price</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Need {formatNumber(graduationStatus.remainingToGraduation.toString())} CORE to graduate</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Professional Trading Status */}
            <ProfessionalTradingStatus className="mt-6" tokenAddress={id} agent={agent} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default TradingInterface;
