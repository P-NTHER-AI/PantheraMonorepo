import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWatchlist } from "../contexts/WatchlistContext";
import { useTrendingAgents } from "../hooks/useAgents";
import { Agent } from "../types";
import AgentGrid from "./AgentGrid";
import EnhancedWalletConnect from "./EnhancedWalletConnect";
import FilterBar from "./FilterBar";
import NotificationBar from "./NotificationBar";
import SearchBar from "./SearchBar";
import TrendingSection from "./TrendingSection";
import WatchlistSection from "./WatchlistSection";

interface Props {
  agents: Agent[];
  agentsLoading: boolean;
  agentsError: string | null;
  refetchAgents: () => void;
  setIsCreateModalOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const HomePage = ({ agents, agentsLoading, agentsError, refetchAgents, setIsCreateModalOpen, setSearchQuery }: Props) => {
  const navigate = useNavigate();
  const { watchlist } = useWatchlist();

  const [includeNsfw, setIncludeNsfw] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [activeView, setActiveView] = useState<"explore" | "watchlist">("explore");

  const { agents: trendingAgents } = useTrendingAgents(10);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCardClick = useCallback(
    (agent: Agent) => {
      navigate(`/agent/${agent.id}`);
    },
    [navigate]
  );

  const handleChatClick = useCallback(
    (agent: Agent) => {
      navigate(`/agent/${agent.id}/chat`, {
        state: {
          agentName: agent.name || agent.tokenName || agent.symbol,
          agentInstructions: (agent as any)?.agentInfo?.instructions || agent.description,
        },
      });
    },
    [navigate]
  );

  const handleTradeClick = useCallback(
    (agent: Agent) => {
      navigate(`/agent/${agent.id}/trade`);
    },
    [navigate]
  );

  // Convert API agents to match frontend Agent type
  const convertedAgents: Agent[] = agents.map((agent) => ({
    id: agent.address || agent.id || "",
    name: agent.tokenName || agent.name || "",
    symbol: agent.tokenSymbol || agent.symbol || "",
    description: agent.agentInfo?.description || agent.description || "",
    currentPrice: parseFloat(String(agent.currentPrice || "0")),
    priceChange24h: agent.priceChange24h || 0,
    marketCap: parseFloat(String(agent.bondingCurveInfo?.marketCap || "0")),
    volume24h: agent.volume24h || 0,
    holders: agent.holders || 0,
    chatCount: agent.chatCount || 0,
    createdAt: agent.metadata?.createdAt
      ? new Date(agent.metadata.createdAt * 1000).toISOString()
      : agent.createdAt || new Date().toISOString(),
    creator: agent.metadata?.creator || agent.creator || "",
    category: agent.metadata?.category || agent.category || "General",
    model: agent.agentInfo?.model || agent.model,
    isNsfw: agent.isNsfw || false,
    isVerified: agent.isVerified || true,
    isActive: agent.metadata?.isActive ?? agent.isActive ?? true,
    avatar: agent.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.address || agent.id}`,
    image: agent.image,
    priceHistory: agent.priceHistory || [],
    // API compatibility fields
    address: agent.address,
    tokenName: agent.tokenName,
    tokenSymbol: agent.tokenSymbol,
    agentInfo: agent.agentInfo,
    metadata: agent.metadata,
    bondingCurveInfo: agent.bondingCurveInfo,
    totalSupply: agent.totalSupply,
    contractAddress: agent.address,
  }));

  // Sort agents based on sortBy
  const sortedAgents = [...convertedAgents].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "market-cap":
        return b.marketCap - a.marketCap;
      case "chats":
        return b.chatCount - a.chatCount;
      default: // featured
        return b.marketCap - a.marketCap;
    }
  });

  // Filter agents based on active view
  const displayAgents =
    activeView === "watchlist"
      ? agents.filter((agent) => {
          const agentAddress = agent.contractAddress || agent.address || agent.id;
          return watchlist.some((w) => w.address.toLowerCase() === agentAddress.toLowerCase());
        })
      : sortedAgents;

  return (
    <div className="ml-[200px]">
      <NotificationBar />
      <main className="p-5">
        {/* Header with Wallet Connection */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">PANTHERA</h1>
            <p className="text-gray-400 text-sm">AI Agent Trading Platform on Core Network</p>
          </div>

          <div className="flex items-center gap-3">
            <EnhancedWalletConnect className="ml-auto" showTransactions={true} showNetworkInfo={true} />
          </div>
        </div>

        <SearchBar onSearch={handleSearch} />

        <WatchlistSection />

        <TrendingSection
          trendingAgents={trendingAgents.map((agent) => ({
            id: agent.address || agent.id || "",
            name: agent.tokenName || agent.name || "",
            symbol: agent.tokenSymbol || agent.symbol || "",
            description: agent.agentInfo?.description || agent.description || "",
            currentPrice: parseFloat(String(agent.currentPrice || "0")),
            priceChange24h: agent.priceChange24h || 0,
            marketCap: parseFloat(String(agent.bondingCurveInfo?.marketCap || "0")),
            volume24h: agent.volume24h || 0,
            holders: agent.holders || 0,
            chatCount: agent.chatCount || 0,
            createdAt: agent.metadata?.createdAt
              ? new Date(agent.metadata.createdAt * 1000).toISOString()
              : agent.createdAt || new Date().toISOString(),
            creator: agent.metadata?.creator || agent.creator || "",
            category: agent.metadata?.category || agent.category || "General",
            model: agent.agentInfo?.model || agent.model,
            isNsfw: agent.isNsfw || false,
            isVerified: agent.isVerified || true,
            isActive: agent.metadata?.isActive ?? agent.isActive ?? true,
            avatar: agent.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.address || agent.id}`,
            image: agent.image,
            priceHistory: agent.priceHistory || [],
            // API compatibility fields
            address: agent.address,
            tokenName: agent.tokenName,
            tokenSymbol: agent.tokenSymbol,
            agentInfo: agent.agentInfo,
            metadata: agent.metadata,
            bondingCurveInfo: agent.bondingCurveInfo,
            totalSupply: agent.totalSupply,
            contractAddress: agent.address,
          }))}
        />

        <FilterBar
          includeNsfw={includeNsfw}
          sortBy={sortBy}
          activeView={activeView}
          onToggleNsfw={() => setIncludeNsfw(!includeNsfw)}
          onSortChange={setSortBy}
          onViewChange={setActiveView}
        />

        {agentsError ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-red-400 mb-4">Failed to load agents</p>
              <button
                onClick={() => refetchAgents()}
                className="bg-[#d8e9ea] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <AgentGrid
            agents={displayAgents}
            loading={agentsLoading}
            onCardClick={handleCardClick}
            onChatClick={handleChatClick}
            onTradeClick={handleTradeClick}
            onCreateClick={() => setIsCreateModalOpen(true)}
            isWatchlistView={activeView === "watchlist"}
          />
        )}
      </main>
    </div>
  );
};
