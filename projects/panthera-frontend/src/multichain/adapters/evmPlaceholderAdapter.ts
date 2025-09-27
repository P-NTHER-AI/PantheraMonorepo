import { useMemo } from "react";
import type { ChainAdapter, ConnectionResult } from "../types";

export const useEvmPlaceholderAdapter = (): ChainAdapter => {
  return useMemo<ChainAdapter>(() => {
    const placeholderNetwork = {
      id: "evm:placeholder",
      chainId: "evm" as const,
      name: "EVM (Coming Soon)",
      tier: "custom" as const,
      isDefault: true,
      metadata: {
        status: "pending",
      },
    };

    return {
      chainId: "evm",
      networkId: placeholderNetwork.id,
      address: null,
      accounts: [],
      balance: null,
      connectors: [],
      isConnected: false,
      isConnecting: false,
      isBalanceLoading: false,
      lastError: null,
      supportsSignData: false,
      connectWallet: async (): Promise<ConnectionResult> => ({
        success: false,
        error: "EVM support is not yet available",
      }),
      disconnectWallet: async () => Promise.resolve(),
      setActiveAccount: () => undefined,
      setActiveNetwork: async () => Promise.resolve(),
      refreshBalance: async () => Promise.resolve(),
      networks: [placeholderNetwork],
      activeNetwork: placeholderNetwork,
      transactionSigner: undefined,
    };
  }, []);
};
