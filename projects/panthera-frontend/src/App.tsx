import { SupportedWallet, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";
import { useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AgentChatRoute } from "./components/AgentChatRoute";
import AgentCreation from "./components/AgentCreation";
import AgentDetail from "./components/AgentDetail";
import CreateAgentModal from "./components/CreateAgentModal";
import { HomePage } from "./components/HomePage";
import More from "./components/More";
import Portfolio from "./components/Portfolio";
import Profile from "./components/Profile";
import RealtimeNotifications from "./components/RealtimeNotifications";
import Sidebar from "./components/Sidebar";
import Toast, { ToastMessage } from "./components/Toast";
import TradingInterface from "./components/TradingInterface";
import WebSocketTest from "./components/WebSocketTest";
import { useAgents } from "./hooks/useAgents";
import { useMarketData } from "./hooks/useWebSocket";
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "./utils/network/getAlgoClientConfigs";

// Real-time notifications state
interface AppNotification {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  data: {
    agentAddress?: string;
    agentName?: string;
    name?: string;
    amount?: string;
    price?: string;
    user?: string;
    message?: string;
    creator?: string;
    buyer?: string;
    seller?: string;
    tokensReceived?: string;
    tokensAmount?: string;
    [key: string]: unknown;
  };
}

let supportedWallets: SupportedWallet[];
if (import.meta.env.VITE_ALGOD_NETWORK === "localnet") {
  const kmdConfig = getKmdConfigFromViteEnvironment();
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ];
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ];
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get current section from URL
  const getCurrentSection = useCallback(() => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path.startsWith("/agent/")) return "agent-detail";
    if (path === "/create") return "agent-creation";
    if (path === "/discover") return "discover";
    if (path === "/profile") return "profile";
    if (path === "/more") return "more";
    if (path === "/portfolio") return "portfolio";
    return "home";
  }, [location.pathname]);

  const [activeSection, setActiveSection] = useState(getCurrentSection());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setActiveSection(getCurrentSection());
  }, [location.pathname, getCurrentSection]);

  // Real-time platform updates
  const { notifications: wsNotifications } = useMarketData();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pushToast = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [{ id, ...msg }, ...prev].slice(0, 5));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Fetch real agents data
  const {
    agents,
    loading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useAgents({
    search: searchQuery,
    category: selectedCategory,
    limit: 20,
    autoRefresh: false, // Disable auto-refresh to reduce API calls
  });

  // Handle real-time events
  useEffect(() => {
    if (wsNotifications && wsNotifications.length > 0) {
      const latestEvent = wsNotifications[0];

      // Add to notifications with duplicate prevention
      setNotifications((prev) => {
        // Create unique identifier for this event
        const eventKey = `${latestEvent.type}-${latestEvent.data?.agentAddress || latestEvent.data?.name}-${latestEvent.timestamp}`;

        // Check if we already have this notification
        const isDuplicate = prev.some(
          (notification) =>
            notification.id.includes(eventKey) ||
            (notification.type === latestEvent.type &&
              notification.data.agentAddress === latestEvent.data?.agentAddress &&
              Math.abs(
                notification.timestamp -
                  (typeof latestEvent.timestamp === "string" ? new Date(latestEvent.timestamp).getTime() : Date.now())
              ) < 5000) // Within 5 seconds
        );

        if (isDuplicate) {
          return prev; // Don't add duplicate
        }

        const newNotification: AppNotification = {
          id: `${eventKey}-${Math.random()}`,
          type: latestEvent.type,
          message:
            latestEvent.type === "agentCreated"
              ? "New agent created!"
              : latestEvent.type === "tokensPurchased"
              ? "Token purchase!"
              : latestEvent.type === "tokensSold"
              ? "Token sale!"
              : "New activity",
          data: {
            agentAddress: latestEvent.data?.agentAddress as string,
            agentName: latestEvent.data?.name as string,
            name: latestEvent.data?.name as string,
            creator: latestEvent.data?.creator as string,
            amount: latestEvent.data?.coreAmount as string,
            ...latestEvent.data,
          },
          timestamp: typeof latestEvent.timestamp === "string" ? new Date(latestEvent.timestamp).getTime() : Date.now(),
        };
        return [newNotification, ...prev.slice(0, 9)]; // Keep last 10
      });

      // Refresh agents data when new agent is created
      if (latestEvent.type === "agentCreated") {
        refetchAgents();
      }
    }
  }, [wsNotifications, refetchAgents]);

  // Global toast event bridge (after pushToast is defined)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        type?: ToastMessage["type"];
        title?: string;
        message: string;
        actionLabel?: string;
        actionHref?: string;
      }>;
      const { type = "info", title, message, actionLabel, actionHref } = ce.detail || { message: "" };
      if (message) pushToast({ type, title, message, actionLabel, actionHref });
    };
    window.addEventListener("ursus:toast", handler as EventListener);
    return () => window.removeEventListener("ursus:toast", handler as EventListener);
  }, [pushToast]);

  const handleSectionChange = useCallback(
    (section: string) => {
      switch (section) {
        case "home":
          navigate("/");
          break;
        case "agent-creation":
          navigate("/create");
          break;
        case "discover":
          navigate("/discover");
          break;
        case "profile":
          navigate("/profile");
          break;
        case "more":
          navigate("/more");
          break;
        case "portfolio":
          navigate("/portfolio");
          break;
        default:
          navigate("/");
      }
    },
    [navigate]
  );

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const algodConfig = getAlgodConfigFromViteEnvironment();

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  });

  return (
    <WalletProvider manager={walletManager}>
      <div className="min-h-screen bg-[#0a0a0a] font-aeonik-regular">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

        <Toast toasts={toasts} onDismiss={dismissToast} />

        <RealtimeNotifications notifications={notifications} onDismiss={handleDismissNotification} />

        <CreateAgentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                agents={agents}
                agentsLoading={agentsLoading}
                agentsError={agentsError}
                refetchAgents={refetchAgents}
                setIsCreateModalOpen={setIsCreateModalOpen}
                setSearchQuery={setSearchQuery}
              />
            }
          />
          <Route path="/create" element={<AgentCreation onBack={() => navigate("/")} />} />
          <Route path="/profile" element={<Profile onBack={() => navigate("/")} />} />
          <Route path="/more" element={<More onBack={() => navigate("/")} />} />

          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/agent/:id/chat" element={<AgentChatRoute />} />
          <Route path="/agent/:id/trade" element={<TradingInterface />} />
          <Route path="/portfolio" element={<Portfolio onBack={() => navigate("/")} />} />
          <Route path="/websocket-test" element={<WebSocketTest />} />
          <Route
            path="*"
            element={
              <HomePage
                agents={agents}
                agentsLoading={agentsLoading}
                agentsError={agentsError}
                refetchAgents={refetchAgents}
                setIsCreateModalOpen={setIsCreateModalOpen}
                setSearchQuery={setSearchQuery}
              />
            }
          />
        </Routes>
      </div>
    </WalletProvider>
  );
}
