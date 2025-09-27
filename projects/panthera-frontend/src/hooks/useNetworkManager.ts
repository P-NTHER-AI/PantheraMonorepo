import { useCallback, useEffect, useMemo, useState } from "react";

// Ethereum provider interface
interface EthereumProvider {
  request: (args: {
    method: string;
    params?:
      | Array<{
          chainId?: string;
          chainName?: string;
          nativeCurrency?: {
            name: string;
            symbol: string;
            decimals: number;
          };
          rpcUrls?: string[];
          blockExplorerUrls?: string[];
        }>
      | string[]
      | undefined;
  }) => Promise<unknown>;
  isMetaMask?: boolean;
  isConnected?: () => boolean;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface NetworkInfo {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet: boolean;
  isSupported: boolean;
}

export interface NetworkStatus {
  isConnected: boolean;
  isOnSupportedNetwork: boolean;
  isOnCoreNetwork: boolean;
  currentNetwork: NetworkInfo | null;
  blockNumber: number | null;
  gasPrice: string | null;
  isLoading: boolean;
}

export const useNetworkManager = () => {
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitchLoading, error: switchError } = useSwitchNetwork();
  // Note: publicClient removed as we use backend API for network calls instead of direct RPC

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isOnSupportedNetwork: false,
    isOnCoreNetwork: false,
    currentNetwork: null,
    blockNumber: null,
    gasPrice: null,
    isLoading: false,
  });

  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  const [switchAttempts, setSwitchAttempts] = useState(0);
  const maxSwitchAttempts = 3;

  // Supported networks
  const supportedNetworks: NetworkInfo[] = useMemo(
    () => [
      {
        id: coreTestnet.id,
        name: coreTestnet.name,
        nativeCurrency: coreTestnet.nativeCurrency,
        rpcUrls: [...coreTestnet.rpcUrls.default.http],
        blockExplorerUrls: coreTestnet.blockExplorers?.default ? [coreTestnet.blockExplorers.default.url] : [],
        isTestnet: true,
        isSupported: true,
      },
      {
        id: coreMainnet.id,
        name: coreMainnet.name,
        nativeCurrency: coreMainnet.nativeCurrency,
        rpcUrls: [...coreMainnet.rpcUrls.default.http],
        blockExplorerUrls: coreMainnet.blockExplorers?.default ? [coreMainnet.blockExplorers.default.url] : [],
        isTestnet: false,
        isSupported: true,
      },
    ],
    []
  );

  // Get network info by chain ID
  const getNetworkInfo = useCallback(
    (chainId: number): NetworkInfo | null => {
      return supportedNetworks.find((network) => network.id === chainId) || null;
    },
    [supportedNetworks]
  );

  // Check if network is supported
  const isNetworkSupported = useCallback(
    (chainId: number): boolean => {
      return supportedNetworks.some((network) => network.id === chainId);
    },
    [supportedNetworks]
  );

  // Check if on Core network
  const isOnCoreNetwork = useCallback((chainId: number): boolean => {
    return [coreTestnet.id, coreMainnet.id].includes(chainId as 1114 | 1116);
  }, []);

  // Update network status
  useEffect(() => {
    if (chain) {
      const networkInfo = getNetworkInfo(chain.id);
      const isSupported = isNetworkSupported(chain.id);
      const isCore = isOnCoreNetwork(chain.id);

      setNetworkStatus((prev) => ({
        ...prev,
        isConnected: true,
        isOnSupportedNetwork: isSupported,
        isOnCoreNetwork: isCore,
        currentNetwork: networkInfo || {
          id: chain.id,
          name: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [],
          blockExplorerUrls: [],
          isTestnet: false,
          isSupported: false,
        },
      }));

      // Reset switch attempts on successful connection
      if (isCore) {
        setSwitchAttempts(0);
      }
    } else {
      setNetworkStatus((prev) => ({
        ...prev,
        isConnected: false,
        isOnSupportedNetwork: false,
        isOnCoreNetwork: false,
        currentNetwork: null,
      }));
    }
  }, [chain, getNetworkInfo, isNetworkSupported, isOnCoreNetwork]);

  // Network data fetching disabled - using static values for now
  useEffect(() => {
    if (!chain) return;

    // Set static network status to avoid RPC calls
    setNetworkStatus((prev) => ({
      ...prev,
      blockNumber: 1000000, // Static block number
      gasPrice: "1000000000", // 1 gwei
      isHealthy: true, // Assume healthy
      lastChecked: new Date(),
    }));

    console.log("🔍 Using static network status (RPC calls disabled)");
  }, [chain, isOnCoreNetwork]);

  // Switch to Core Testnet
  const switchToCoreTestnet = useCallback(async () => {
    if (!switchNetwork) {
      throw new Error("Network switching not available");
    }

    setNetworkStatus((prev) => ({ ...prev, isLoading: true }));
    setSwitchAttempts((prev) => prev + 1);

    try {
      switchNetwork(coreTestnet.id as 1114 | 1116);
      console.log("✅ Successfully switched to Core Testnet");
    } catch (error) {
      console.error("❌ Failed to switch to Core Testnet:", error);
      throw error;
    } finally {
      setNetworkStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [switchNetwork]);

  // Auto-switch to Core network
  useEffect(() => {
    if (autoSwitchEnabled && chain && !isOnCoreNetwork(chain.id) && switchAttempts < maxSwitchAttempts && switchNetwork) {
      const timer = setTimeout(() => {
        console.log(`🔄 Auto-switching to Core Testnet (attempt ${switchAttempts + 1})`);
        switchToCoreTestnet();
      }, 2000); // Wait 2 seconds before auto-switching

      return () => clearTimeout(timer);
    }
  }, [chain, autoSwitchEnabled, switchAttempts, switchNetwork, isOnCoreNetwork, switchToCoreTestnet]);

  // Switch to Core Mainnet
  const switchToCoreMainnet = useCallback(async () => {
    if (!switchNetwork) {
      throw new Error("Network switching not available");
    }

    setNetworkStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      switchNetwork(coreMainnet.id as 1114 | 1116);
      console.log("✅ Successfully switched to Core Mainnet");
    } catch (error) {
      console.error("❌ Failed to switch to Core Mainnet:", error);
      throw error;
    } finally {
      setNetworkStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [switchNetwork]);

  // Switch to specific network
  const switchToNetwork = useCallback(
    async (chainId: number) => {
      if (!switchNetwork) {
        throw new Error("Network switching not available");
      }

      if (!isNetworkSupported(chainId)) {
        throw new Error(`Network ${chainId} is not supported`);
      }

      setNetworkStatus((prev) => ({ ...prev, isLoading: true }));

      try {
        switchNetwork(chainId as 1114 | 1116);
        console.log(`✅ Successfully switched to network ${chainId}`);
      } catch (error) {
        console.error(`❌ Failed to switch to network ${chainId}:`, error);
        throw error;
      } finally {
        setNetworkStatus((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [switchNetwork, isNetworkSupported]
  );

  // Add network to wallet
  const addNetworkToWallet = useCallback(async (networkInfo: NetworkInfo) => {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${networkInfo.id.toString(16)}`,
            chainName: networkInfo.name,
            nativeCurrency: {
              name: networkInfo.nativeCurrency.name,
              symbol: networkInfo.nativeCurrency.symbol,
              decimals: networkInfo.nativeCurrency.decimals,
            },
            rpcUrls: networkInfo.rpcUrls,
            blockExplorerUrls: networkInfo.blockExplorerUrls,
          },
        ],
      });

      console.log(`✅ Successfully added ${networkInfo.name} to wallet`);
    } catch (error) {
      console.error(`❌ Failed to add ${networkInfo.name} to wallet:`, error);
      throw error;
    }
  }, []);

  // Get preferred network (testnet for development)
  const getPreferredNetwork = useCallback((): NetworkInfo => {
    return process.env.NODE_ENV === "development"
      ? supportedNetworks.find((n) => n.id === coreTestnet.id)!
      : supportedNetworks.find((n) => n.id === coreMainnet.id)!;
  }, [supportedNetworks]);

  // Check if RPC is healthy
  const checkRPCHealth = useCallback(async (rpcUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1,
        }),
      });

      const data = await response.json();
      return !!data.result;
    } catch (error) {
      console.error(`RPC health check failed for ${rpcUrl}:`, error);
      return false;
    }
  }, []);

  return {
    // Status
    networkStatus,
    supportedNetworks,
    switchError,
    isSwitchLoading: isSwitchLoading || networkStatus.isLoading,

    // Settings
    autoSwitchEnabled,
    setAutoSwitchEnabled,

    // Actions
    switchToCoreTestnet,
    switchToCoreMainnet,
    switchToNetwork,
    addNetworkToWallet,

    // Utilities
    getNetworkInfo,
    isNetworkSupported,
    isOnCoreNetwork,
    getPreferredNetwork,
    checkRPCHealth,
  };
};

export default useNetworkManager;
