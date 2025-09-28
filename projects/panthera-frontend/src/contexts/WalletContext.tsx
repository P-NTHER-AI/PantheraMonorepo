import { ethers } from "ethers";
import React, { createContext, useCallback, useEffect, useState } from "react";
import type { Chain } from "wagmi";
import { useAccount, useBalance, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from "wagmi";
import { coreMainnet, coreTestnet } from "../config/chains";

// Professional balance interface
export interface WalletBalance {
  decimals: number;
  formatted: string;
  symbol: string;
  value: bigint;
}

// Professional connector interface
export interface WalletConnector {
  id: string;
  name: string;
  ready: boolean;
  icon?: string;
  connect: () => void;
}

// Professional connection result interface
interface ConnectionResult {
  success: boolean;
  error?: string;
}

export interface WalletState {
  // Connection state
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;

  // Balance
  balance: WalletBalance | null;
  balanceSymbol: string;

  // Network state
  chain: Chain | undefined;
  isOnCoreNetwork: boolean;
  isOnTestnet: boolean;
  isOnMainnet: boolean;
  isSwitchLoading: boolean;

  // Web3 signer
  signer: ethers.Signer | null;

  // Actions
  connectWallet: (connectorId?: string) => Promise<ConnectionResult>;
  disconnect: () => void;
  disconnectWallet: () => void;
  switchToCore: (mainnet?: boolean) => void;

  // Loading states
  isConnectLoading: boolean;

  // Available connectors
  connectors: WalletConnector[];
  pendingConnector: WalletConnector | null;

  // Errors
  connectError: Error | null;

  // Persistence
  isWalletPersisted: boolean;
  lastConnectedWallet: string | null;
  connectionAttempts: number;
}

export const WalletContext = createContext<WalletState | undefined>(undefined);

// Local storage keys
const WALLET_STORAGE_KEYS = {
  CONNECTED: "ursus_wallet_connected",
  LAST_CONNECTOR: "ursus_last_connector",
  AUTO_CONNECT: "ursus_auto_connect",
  CONNECTION_TIME: "ursus_connection_time",
  USER_DISCONNECTED: "ursus_user_disconnected",
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, error: connectError, isLoading: isConnectLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitchLoading } = useSwitchNetwork();
  const { data: balance } = useBalance({
    address: address,
    enabled: !!address,
  });

  // Ethers signer state
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Local state for persistence
  const [isWalletPersisted, setIsWalletPersisted] = useState(false);
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(true);

  // Initialize persistence state
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_STORAGE_KEYS.CONNECTED) === "true";
    const lastConnector = localStorage.getItem(WALLET_STORAGE_KEYS.LAST_CONNECTOR);
    const autoConnect = localStorage.getItem(WALLET_STORAGE_KEYS.AUTO_CONNECT) !== "false";
    const userDisconnected = localStorage.getItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED) === "true";

    setIsWalletPersisted(wasConnected);
    setLastConnectedWallet(lastConnector);
    setAutoConnectEnabled(autoConnect && !userDisconnected);

    console.log("🔌 Wallet persistence state:", {
      wasConnected,
      lastConnector,
      autoConnect,
      userDisconnected,
    });
  }, []);

  // Auto-connect once on mount if previously connected and not explicitly disconnected
  useEffect(() => {
    let cancelled = false;
    const attemptAutoConnect = async () => {
      try {
        const wasConnected = localStorage.getItem(WALLET_STORAGE_KEYS.CONNECTED) === "true";
        const userDisconnected = localStorage.getItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED) === "true";
        const lastConnector = localStorage.getItem(WALLET_STORAGE_KEYS.LAST_CONNECTOR);
        const autoConnectPref = localStorage.getItem(WALLET_STORAGE_KEYS.AUTO_CONNECT);
        const autoPref = autoConnectPref === null ? true : autoConnectPref !== "false";
        if (!wasConnected || userDisconnected || !autoPref || isConnected || isConnecting || isReconnecting) return;
        const target = lastConnector ? connectors.find((c) => c.id === lastConnector) : connectors.find((c) => c.ready) || connectors[0];
        if (!target) return;
        console.log("🔁 Auto-connecting wallet with connector:", target.id);
        await connect({ connector: target });
        if (!cancelled) {
          localStorage.setItem(WALLET_STORAGE_KEYS.CONNECTED, "true");
          setIsWalletPersisted(true);
        }
      } catch (e) {
        console.warn("Auto-connect failed:", (e as Error).message);
      }
    };
    attemptAutoConnect();
    return () => {
      cancelled = true;
    };
  }, [connect, connectors, isConnected, isConnecting, isReconnecting]);

  // Reset connection attempts on successful connection
  useEffect(() => {
    if (isConnected) {
      setConnectionAttempts(0);
      localStorage.removeItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED);
    }
  }, [isConnected]);

  // Auto-switch to Core network if connected to wrong network
  useEffect(() => {
    if (isConnected && chain && ![coreTestnet.id, coreMainnet.id].includes(chain.id as typeof coreTestnet.id)) {
      console.log("🔄 Auto-switching to Core network...");
      switchNetwork?.(coreTestnet.id);
    }
  }, [isConnected, chain, switchNetwork]);

  // Persist connection state
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem(WALLET_STORAGE_KEYS.CONNECTED, "true");
      localStorage.setItem(WALLET_STORAGE_KEYS.CONNECTION_TIME, Date.now().toString());
      setIsWalletPersisted(true);

      console.log("✅ Wallet connection persisted:", address);
    } else if (!isConnected && !isConnecting && !isReconnecting) {
      // Only clear if user explicitly disconnected
      const userDisconnected = localStorage.getItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED) === "true";
      if (userDisconnected) {
        localStorage.setItem(WALLET_STORAGE_KEYS.CONNECTED, "false");
        setIsWalletPersisted(false);
      }
    }
  }, [isConnected, address, isConnecting, isReconnecting]);

  const connectWallet = useCallback(
    async (connectorId?: string): Promise<ConnectionResult> => {
      try {
        console.log("🔗 Professional wallet connection initiated...");

        // Clear user disconnected flag
        localStorage.removeItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED);

        const connector = connectorId ? connectors.find((c) => c.id === connectorId) : connectors[0]; // Default to first connector (MetaMask)

        if (!connector) {
          const errorMessage = "No wallet connector found. Please install MetaMask.";
          console.error("❌", errorMessage);
          return { success: false, error: errorMessage };
        }

        console.log("🔌 Using professional connector:", connector.name);

        // Store last used connector
        localStorage.setItem(WALLET_STORAGE_KEYS.LAST_CONNECTOR, connector.id);
        setLastConnectedWallet(connector.id);

        // Attempt connection
        const result = await connect({ connector });
        console.log("🔗 Professional connection result:", result);

        console.log("✅ Professional wallet connection successful");
        return { success: true };
      } catch (error) {
        console.error("❌ Professional wallet connection failed:", error);
        setConnectionAttempts((prev) => prev + 1);

        // Provide professional error messages
        let errorMessage = "Failed to connect wallet";

        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            errorMessage = "Connection rejected by user. Please approve the connection in MetaMask.";
          } else if (error.message.includes("No provider")) {
            errorMessage = "MetaMask not found. Please install MetaMask extension.";
          } else if (error.message.includes("unauthorized")) {
            errorMessage = "Unauthorized access. Please unlock MetaMask and try again.";
          } else {
            errorMessage = error.message;
          }
        }

        return { success: false, error: errorMessage };
      }
    },
    [connect, connectors]
  );

  const disconnectWallet = useCallback(() => {
    console.log("🔌 Disconnecting wallet...");

    // Mark as user-initiated disconnect
    localStorage.setItem(WALLET_STORAGE_KEYS.USER_DISCONNECTED, "true");
    localStorage.setItem(WALLET_STORAGE_KEYS.CONNECTED, "false");

    setIsWalletPersisted(false);
    setAutoConnectEnabled(false);
    setConnectionAttempts(0);

    disconnect();
  }, [disconnect]);

  const switchToCore = useCallback(
    (mainnet = false) => {
      const targetChainId = mainnet ? coreMainnet.id : coreTestnet.id;
      if (switchNetwork && chain?.id !== targetChainId) {
        console.log(`🔄 Switching to Core ${mainnet ? "Mainnet" : "Testnet"}...`);
        switchNetwork(targetChainId);
      }
    },
    [switchNetwork, chain]
  );

  // Auto-reconnect logic (after connectWallet is defined)
  useEffect(() => {
    if (!isConnected && !isConnecting && !isReconnecting && autoConnectEnabled && lastConnectedWallet && connectionAttempts < 3) {
      const timeoutId = setTimeout(() => {
        console.log("🔄 Attempting professional auto-reconnect...");
        connectWallet(lastConnectedWallet);
        setConnectionAttempts((prev) => prev + 1);
      }, 1000 + connectionAttempts * 2000); // Exponential backoff

      return () => clearTimeout(timeoutId);
    }

    return () => {};
  }, [isConnected, isConnecting, isReconnecting, autoConnectEnabled, lastConnectedWallet, connectionAttempts, connectWallet]);

  const isOnCoreNetwork = chain?.id === coreTestnet.id || chain?.id === coreMainnet.id;
  const isOnTestnet = chain?.id === coreTestnet.id;
  const isOnMainnet = chain?.id === coreMainnet.id;

  // Initialize signer when wallet/address available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (address && typeof window !== "undefined" && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const s = await provider.getSigner();
          if (!cancelled) setSigner(s);
        } else {
          if (!cancelled) setSigner(null);
        }
      } catch (e) {
        console.warn("Failed to get signer", e);
        if (!cancelled) setSigner(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Professional type conversions
  const professionalBalance: WalletBalance | null = balance
    ? {
        decimals: balance.decimals,
        formatted: balance.formatted,
        symbol: balance.symbol,
        value: balance.value,
      }
    : null;

  // const professionalConnectors: WalletConnector[] = connectors.map(connector => ({
  //   id: connector.id,
  //   name: connector.name,
  //   ready: connector.ready,
  //   icon: undefined // Professional connector icon handling
  // }));

  // const professionalPendingConnector: WalletConnector | null = pendingConnector ? {
  //   id: pendingConnector.id,
  //   name: pendingConnector.name,
  //   ready: pendingConnector.ready,
  //   icon: undefined // Professional connector icon handling
  // } : null;

  const value: WalletState = {
    // Connection state
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting || isConnectLoading,
    isReconnecting,

    // Balance
    balance: professionalBalance,
    balanceSymbol: professionalBalance?.symbol || "ALGO",

    // Network state
    chain,
    isOnCoreNetwork,
    isOnTestnet,
    isOnMainnet,
    isSwitchLoading,

    // Web3 signer
    signer,

    // Actions
    connectWallet,
    disconnect: disconnectWallet,
    disconnectWallet,
    switchToCore,

    // Loading states
    isConnectLoading,

    // Available connectors
    // connectors: professionalConnectors,
    // pendingConnector: professionalPendingConnector,
    connectors: [],
    pendingConnector: null,

    // Errors
    connectError,

    // Persistence
    isWalletPersisted,
    lastConnectedWallet,
    connectionAttempts,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};
