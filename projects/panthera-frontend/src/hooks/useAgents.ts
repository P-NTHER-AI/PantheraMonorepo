import { useCallback, useEffect, useState } from "react";
import { apiService } from "../services/api";
import { Agent } from "../types";

interface UseAgentsParams {
  page?: number;
  limit?: number;
  category?: string;
  creator?: string;
  search?: string;
  sortBy?: "marketCap" | "volume" | "holders" | "created" | "priceChange";
  sortOrder?: "asc" | "desc";
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useAgents = (params: UseAgentsParams = {}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [cache, setCache] = useState<Map<string, { data: Agent[]; timestamp: number }>>(new Map());

  const fetchAgents = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        // Create cache key
        const cacheKey = JSON.stringify({
          page: params.page || 1,
          limit: params.limit || 20,
          category: params.category,
          creator: params.creator,
          search: params.search,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        });

        // Check cache first (5 minute cache)
        const cacheEntry = cache.get(cacheKey);
        const now = Date.now();
        const cacheAge = 5 * 60 * 1000; // 5 minutes

        if (!forceRefresh && cacheEntry && now - cacheEntry.timestamp < cacheAge) {
          console.log("📦 Using cached agents data");
          setAgents(cacheEntry.data);
          setLoading(false);
          return;
        }

        console.log("🔄 Fetching fresh agents data...");

        const response = await apiService.getAllAgents(params);

        if (response.data?.agents) {
          const agentsData = response.data.agents;

          // Convert AgentData to Agent format
          const prevAddresses = new Set(agents.map((a) => a.contractAddress || a.address));

          const convertedAgents: Agent[] = agentsData.map((agentData) => ({
            id: agentData.id,
            name: agentData.tokenName,
            symbol: agentData.tokenSymbol,
            description: agentData.agentInfo.description,
            avatar: agentData.avatar,
            image: agentData.image,
            creator: agentData.metadata.creator,
            createdAt: new Date(agentData.metadata.createdAt * 1000).toISOString(),
            marketCap: parseFloat(agentData.bondingCurveInfo.marketCap),
            chatCount: agentData.chatCount,
            isNsfw: false,
            category: agentData.metadata.category,
            priceHistory: [],
            priceChange24h: agentData.priceChange24h,
            currentPrice: agentData.currentPrice,
            volume24h: agentData.volume24h,
            holders: agentData.holders,
            totalSupply: agentData.totalSupply,
            contractAddress: agentData.address,
            isVerified: agentData.isVerified,
            isActive: agentData.metadata.isActive,
            model: agentData.agentInfo.model,
            bondingCurveInfo: {
              supply: agentData.totalSupply,
              reserve: agentData.bondingCurveInfo.reserve,
              price: agentData.currentPrice,
              marketCap: agentData.bondingCurveInfo.marketCap,
            },
            // API compatibility fields
            address: agentData.address,
            tokenName: agentData.tokenName,
            tokenSymbol: agentData.tokenSymbol,
            agentInfo: agentData.agentInfo,
            metadata: agentData.metadata,
          }));

          setAgents(convertedAgents);
          setPagination(response.data.pagination || pagination);

          // Update cache
          setCache((prev) => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, { data: convertedAgents, timestamp: now });

            // Clean old cache entries (keep only last 10)
            if (newCache.size > 10) {
              const oldestKey = Array.from(newCache.keys())[0];
              newCache.delete(oldestKey);
            }
            // Toast when a new agent appears that wasn’t in the previous snapshot (with duplicate prevention)
            try {
              const newOnes = convertedAgents.filter((a) => !prevAddresses.has(a.contractAddress || a.address || ""));
              if (newOnes.length > 0) {
                // Only show toast for the first new agent to avoid spam
                const first = newOnes[0];
                const agentKey = first.contractAddress || first.address || first.name;

                // Check if we recently showed a toast for this agent (within last 30 seconds)
                const recentToastKey = `toast-${agentKey}`;
                const lastToastTime = sessionStorage.getItem(recentToastKey);
                const now = Date.now();

                if (!lastToastTime || now - parseInt(lastToastTime) > 30000) {
                  // dispatchToast({
                  //   type: 'success',
                  //   title: 'New agent available',
                  //   message: `${first.name} (${first.symbol}) is now visible`,
                  //   actionLabel: 'View agent',
                  //   actionHref: first.contractAddress ? `/agent/${first.contractAddress}` : undefined,
                  // });

                  // // Remember that we showed this toast
                  // sessionStorage.setItem(recentToastKey, now.toString());

                  alert(`New agent available: ${first.name} (${first.symbol}) is now visible`);
                }
              }
            } catch {}

            return newCache;
          });

          setLastFetch(now);
          console.log("✅ Agents data fetched and cached");
        } else {
          setError("Failed to fetch agents");
        }
      } catch (err) {
        console.error("❌ Error fetching agents:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      } finally {
        setLoading(false);
      }
    },
    [params, cache, pagination]
  );

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Auto-refresh with configurable interval
  useEffect(() => {
    if (!params.autoRefresh) return;

    const refreshInterval = params.refreshInterval || 60000; // Default 60 seconds
    const interval = setInterval(() => {
      fetchAgents(false); // Don't force refresh, use cache if valid
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [params.autoRefresh, params.refreshInterval, fetchAgents]);

  const refetch = useCallback(
    (forceRefresh = true) => {
      // Clear cache so new agents appear immediately
      setCache(new Map());
      fetchAgents(forceRefresh);
    },
    [fetchAgents]
  );

  // Clear cache function
  const clearCache = useCallback(() => {
    setCache(new Map());
    console.log("🗑️ Agents cache cleared");
  }, []);

  return {
    agents,
    loading,
    error,
    pagination,
    refetch,
    clearCache,
    lastFetch,
    isCached: cache.size > 0,
  };
};

export const useTrendingAgents = (limit = 10) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getTrendingAgents(limit);
      const agentsData = response.data?.agents || [];

      // Convert AgentData to Agent format
      const convertedAgents: Agent[] = agentsData.map((agentData) => ({
        id: agentData.id,
        name: agentData.tokenName,
        symbol: agentData.tokenSymbol,
        description: agentData.agentInfo.description,
        avatar: agentData.avatar,
        image: agentData.image,
        creator: agentData.metadata.creator,
        createdAt: new Date(agentData.metadata.createdAt * 1000).toISOString(),
        marketCap: parseFloat(agentData.bondingCurveInfo.marketCap),
        chatCount: agentData.chatCount,
        isNsfw: false,
        category: agentData.metadata.category,
        priceHistory: [],
        priceChange24h: agentData.priceChange24h,
        currentPrice: parseFloat(agentData.currentPrice),
        volume24h: agentData.volume24h,
        holders: agentData.holders,
        totalSupply: parseFloat(agentData.totalSupply),
        contractAddress: agentData.address,
        isVerified: agentData.isVerified,
        isActive: agentData.metadata.isActive,
        model: agentData.agentInfo.model,
        bondingCurveInfo: {
          supply: agentData.totalSupply,
          reserve: agentData.bondingCurveInfo.reserve,
          price: agentData.currentPrice,
          marketCap: agentData.bondingCurveInfo.marketCap,
        },
      }));

      setAgents(convertedAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trending agents");
      console.error("Error fetching trending agents:", err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrendingAgents();
  }, [fetchTrendingAgents]);

  return {
    agents,
    loading,
    error,
    refetch: fetchTrendingAgents,
  };
};

export const useAgentDetails = (address?: string) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentDetails = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getAgentDetails(address);
      const agentData = response.data || response;

      // Convert AgentData to Agent format if needed
      if (agentData && typeof agentData === "object") {
        // Use any for simplicity in this conversion function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = agentData as any;

        const convertedAgent: Agent = {
          id: String(data.id || data.address || ""),
          name: String(data.tokenName || data.name || ""),
          symbol: String(data.tokenSymbol || data.symbol || ""),
          description: String(data.agentInfo?.description || data.description || ""),
          avatar: String(data.avatar || "🤖"),
          image: data.image,
          creator: String(data.metadata?.creator || data.creator || ""),
          createdAt: data.metadata?.createdAt
            ? new Date(data.metadata.createdAt * 1000).toISOString()
            : String(data.createdAt || new Date().toISOString()),
          marketCap: data.bondingCurveInfo?.marketCap ? parseFloat(String(data.bondingCurveInfo.marketCap)) : Number(data.marketCap) || 0,
          chatCount: Number(data.chatCount) || 0,
          isNsfw: Boolean(data.isNsfw),
          category: String(data.metadata?.category || data.category || "General"),
          priceHistory: Array.isArray(data.priceHistory) ? data.priceHistory : [],
          priceChange24h: Number(data.priceChange24h) || 0,
          currentPrice: data.currentPrice ? parseFloat(String(data.currentPrice)) : undefined,
          volume24h: Number(data.volume24h),
          holders: Number(data.holders),
          totalSupply: data.totalSupply ? parseFloat(String(data.totalSupply)) : undefined,
          contractAddress: String(data.address || data.contractAddress || ""),
          isVerified: Boolean(data.isVerified),
          isActive: Boolean(data.metadata?.isActive),
          model: String(data.agentInfo?.model || ""),
          bondingCurveInfo: data.bondingCurveInfo
            ? {
                supply: data.totalSupply,
                reserve: data.bondingCurveInfo.reserve,
                price: data.currentPrice,
                marketCap: data.bondingCurveInfo.marketCap,
              }
            : undefined,
          // API compatibility fields
          address: data.address,
          tokenName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
          agentInfo: data.agentInfo,
          metadata: data.metadata,
        };

        setAgent(convertedAgent);
      } else {
        setAgent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent details");
      console.error("Error fetching agent details:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAgentDetails();
  }, [fetchAgentDetails]);

  return {
    agent,
    loading,
    error,
    refetch: fetchAgentDetails,
  };
};

interface AgentStats {
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  holders: number | null; // null when real data is unavailable
  totalSupply: number;
  transactions24h: number;
}

export const useAgentStats = (address?: string) => {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getAgentStats(address);

      // Extract data with proper type checking
      const statsData = "data" in response ? response.data : response;

      // Type guard for stats data
      interface RawStatsData {
        currentPrice?: string | number;
        marketCap?: string | number;
        volume24h?: string | number;
        priceChange24h?: string | number;
        holders?: string | number;
        totalSupply?: string | number;
        transactions24h?: string | number;
      }

      const rawStats = statsData as RawStatsData;

      // Parse string values to numbers with proper type checking
      const parsedStats: AgentStats = {
        currentPrice: parseFloat(String(rawStats?.currentPrice || "0")) || 0,
        marketCap: parseFloat(String(rawStats?.marketCap || "0")) || 0,
        volume24h: parseFloat(String(rawStats?.volume24h || "0")) || 0,
        priceChange24h:
          typeof rawStats?.priceChange24h === "number" ? rawStats.priceChange24h : parseFloat(String(rawStats?.priceChange24h || "0")) || 0,
        holders:
          rawStats?.holders === null
            ? null
            : typeof rawStats?.holders === "number"
            ? rawStats.holders
            : parseInt(String(rawStats?.holders || "0")) || 0,
        totalSupply: parseFloat(String(rawStats?.totalSupply || "0")) || 0,
        transactions24h:
          typeof rawStats?.transactions24h === "number"
            ? rawStats.transactions24h
            : parseInt(String(rawStats?.transactions24h || "0")) || 0,
      };

      setStats(parsedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent stats");
      console.error("Error fetching agent stats:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};
