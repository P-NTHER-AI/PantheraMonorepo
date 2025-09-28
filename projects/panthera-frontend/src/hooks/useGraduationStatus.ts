// Professional graduation status interface
export interface ProfessionalGraduationMetrics {
  reserveRatio: number;
  graduationVelocity: number;
  estimatedDaysToGraduation: number | null;
  riskLevel: "low" | "medium" | "high";
  performanceScore: number;
  liquidityScore: number;
  priceStability: "stable" | "volatile" | "unknown";
}

export interface GraduationStatus {
  isGraduated: boolean;
  currentReserve: number;
  graduationThreshold: number;
  progressPercentage: number;
  remainingToGraduation: number;
  marketCap: number;
  currentPrice: number;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

// Professional metrics calculation
const calculateProfessionalMetrics = (status: GraduationStatus): ProfessionalGraduationMetrics => {
  const { isGraduated, currentReserve, graduationThreshold, progressPercentage, marketCap, currentPrice } = status;

  const reserveRatio = graduationThreshold > 0 ? currentReserve / graduationThreshold : 0;
  const graduationVelocity = progressPercentage > 0 ? progressPercentage / 100 : 0;

  const estimatedDaysToGraduation = isGraduated
    ? null
    : progressPercentage > 0
    ? Math.ceil((100 - progressPercentage) / Math.max(progressPercentage / 30, 0.1))
    : null;

  const riskLevel: "low" | "medium" | "high" = isGraduated
    ? "low"
    : progressPercentage > 80
    ? "low"
    : progressPercentage > 50
    ? "medium"
    : "high";

  const performanceScore = isGraduated ? 100 : Math.min(progressPercentage + (marketCap > 100000 ? 10 : 0), 100);
  const liquidityScore = Math.min((currentReserve / 10000) * 100, 100);
  const priceStability: "stable" | "volatile" | "unknown" = currentPrice > 0 ? "stable" : "unknown";

  return {
    reserveRatio,
    graduationVelocity,
    estimatedDaysToGraduation,
    riskLevel,
    performanceScore,
    liquidityScore,
    priceStability,
  };
};

export const useGraduationStatus = (tokenAddress: string, autoRefresh = false) => {
  // const publicClient = usePublicClient();

  // const [status, setStatus] = useState<GraduationStatus>({
  //   isGraduated: false,
  //   currentReserve: 0,
  //   graduationThreshold: 30000,
  //   progressPercentage: 0,
  //   remainingToGraduation: 30000,
  //   marketCap: 0,
  //   currentPrice: 0,
  //   loading: true,
  //   error: null,
  //   lastUpdate: null,
  // });

  // const fetchGraduationStatus = useCallback(async () => {
  //   if (!publicClient || !tokenAddress) return;

  //   try {
  //     console.log(`🔍 Professional graduation status detection for ${tokenAddress}`);

  //     // First, get real price from backend API
  //     let realCurrentPrice = 0;
  //     try {
  //       const agentResponse = await apiService.get(`/agents/${tokenAddress}`);
  //       const agent = agentResponse.data.data || agentResponse.data;
  //       realCurrentPrice = parseFloat(agent.currentPrice || "0");
  //       console.log(`💰 Real current price from backend: ${realCurrentPrice} CORE`);
  //     } catch (priceError) {
  //       console.warn("⚠️ Could not fetch real price from backend:", priceError);
  //     }

  //     // Use professional contract service
  //     const contractService = createContractService(publicClient);
  //     const graduationData = await contractService.getGraduationStatus(tokenAddress);

  //     // Override price with real backend data if available
  //     if (realCurrentPrice > 0) {
  //       graduationData.currentPrice = realCurrentPrice;
  //       console.log(`✅ Using real price from backend: ${realCurrentPrice} CORE`);
  //     }

  //     // Calculate progress metrics
  //     const progressPercentage = Math.min((graduationData.currentReserve / graduationData.graduationThreshold) * 100, 100);
  //     const remainingToGraduation = Math.max(graduationData.graduationThreshold - graduationData.currentReserve, 0);

  //     let isGraduatedFinal = graduationData.isGraduated;

  //     // Secondary real check via backend trading API to avoid on-chain mismatch
  //     if (!isGraduatedFinal) {
  //       // Precheck cache to avoid repeated GRADUATED_TOKEN spam
  //       const cacheKey = `grad-precheck:${tokenAddress.toLowerCase()}`;
  //       const lastChecked = (window as any).__PANTHERA_GRAD_CACHE?.get(cacheKey);
  //       const now = Date.now();
  //       const ttlMs = 5 * 60 * 1000; // 5 minutes
  //       if (!((window as any).__PANTHERA_GRAD_CACHE instanceof Map)) {
  //         (window as any).__PANTHERA_GRAD_CACHE = new Map();
  //       }

  //       if (!lastChecked || now - lastChecked > ttlMs) {
  //         try {
  //           // Use backend blockchain quote endpoint to avoid frontend-specific trading API quirks
  //           await apiService.getPurchaseQuote(tokenAddress, "0.01");
  //         } catch (e) {
  //           const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  //           if (msg.includes("graduated_token")) {
  //             isGraduatedFinal = true;
  //           }
  //         } finally {
  //           (window as any).__PANTHERA_GRAD_CACHE.set(cacheKey, now);
  //         }
  //       }
  //     }

  //     const newStatus: GraduationStatus = {
  //       isGraduated: isGraduatedFinal,
  //       currentReserve: graduationData.currentReserve,
  //       graduationThreshold: graduationData.graduationThreshold,
  //       progressPercentage,
  //       remainingToGraduation,
  //       marketCap: graduationData.marketCap,
  //       currentPrice: graduationData.currentPrice,
  //       loading: false,
  //       error: graduationData.error || null,
  //       lastUpdate: new Date(),
  //     };

  //     console.log(
  //       `✅ Professional graduation status (${graduationData.confidence} confidence, ${graduationData.method}) [final=${isGraduatedFinal}]:`,
  //       newStatus
  //     );
  //     setStatus(newStatus);
  //   } catch (error: unknown) {
  //     console.error("❌ Critical error in graduation status detection:", error);

  //     // Try to get real data from backend even in fallback
  //     let fallbackPrice = 0.00000003; // Default fallback
  //     let fallbackReserve = 1000;
  //     let fallbackMarketCap = 50000;

  //     try {
  //       const agentResponse = await apiService.get(`/agents/${tokenAddress}`);
  //       const agent = agentResponse.data.data || agentResponse.data;
  //       fallbackPrice = parseFloat(agent.currentPrice || "0") || fallbackPrice;
  //       fallbackReserve = parseFloat(agent.bondingCurveInfo?.reserve || "0") || fallbackReserve;
  //       fallbackMarketCap = parseFloat(agent.bondingCurveInfo?.marketCap || "0") || fallbackMarketCap;
  //       console.log(`✅ Using real fallback data from backend: price=${fallbackPrice}, reserve=${fallbackReserve}`);
  //     } catch (backendError) {
  //       console.warn("⚠️ Could not fetch fallback data from backend, using defaults");
  //     }

  //     // Professional fallback status - use real backend data when possible
  //     const fallbackStatus: GraduationStatus = {
  //       isGraduated: false,
  //       currentReserve: fallbackReserve,
  //       graduationThreshold: 30000,
  //       progressPercentage: 0, // Will be calculated below
  //       remainingToGraduation: 0, // Will be calculated below
  //       marketCap: fallbackMarketCap,
  //       currentPrice: fallbackPrice, // Use real price from backend
  //       loading: false,
  //       error: `Contract unavailable: ${error instanceof Error ? error.message : "Unknown error"}`,
  //       lastUpdate: new Date(),
  //     };

  //     // Calculate realistic progress metrics for fallback
  //     fallbackStatus.progressPercentage = Math.min((fallbackStatus.currentReserve / fallbackStatus.graduationThreshold) * 100, 100);
  //     fallbackStatus.remainingToGraduation = Math.max(fallbackStatus.graduationThreshold - fallbackStatus.currentReserve, 0);

  //     // Check if should be graduated based on reserve
  //     if (fallbackStatus.currentReserve >= fallbackStatus.graduationThreshold) {
  //       fallbackStatus.isGraduated = true;
  //       fallbackStatus.progressPercentage = 100;
  //       fallbackStatus.remainingToGraduation = 0;
  //     }

  //     setStatus(fallbackStatus);
  //   }
  // }, [publicClient, tokenAddress]);

  // // Initial fetch
  // useEffect(() => {
  //   if (tokenAddress && publicClient) {
  //     fetchGraduationStatus();
  //   }
  // }, [fetchGraduationStatus, tokenAddress, publicClient]);

  // // Auto refresh - reduced frequency
  // useEffect(() => {
  //   if (!autoRefresh || !tokenAddress) return;

  //   const interval = setInterval(() => {
  //     fetchGraduationStatus();
  //   }, 120000); // Refresh every 2 minutes instead of 30 seconds

  //   return () => clearInterval(interval);
  // }, [autoRefresh, fetchGraduationStatus, tokenAddress]);

  // // Calculate professional metrics
  // const professionalMetrics = calculateProfessionalMetrics(status);

  // return {
  //   ...status,
  //   refetch: fetchGraduationStatus,
  //   professionalMetrics,
  // };
  return {
    isGraduated: false,
    currentReserve: 0,
    graduationThreshold: 0,
    progressPercentage: 0,
    remainingToGraduation: 0,
    marketCap: 0,
    currentPrice: 0,
    loading: false,
    error: null,
    lastUpdate: null,
    refetch: () => {},
    professionalMetrics: {
      reserveRatio: 0,
      graduationVelocity: 0,
      estimatedDaysToGraduation: null,
      riskLevel: "low",
    },
  };
};
