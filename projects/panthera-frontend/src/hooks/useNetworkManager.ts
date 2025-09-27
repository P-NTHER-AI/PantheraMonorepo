import { useCallback, useMemo, useState } from "react";
import type { NetworkMetadata } from "../multichain/types";
import { useWallet } from "./useWallet";

export interface NetworkStatus {
  isConnected: boolean;
  isOnSupportedNetwork: boolean;
  isOnCoreNetwork: boolean;
  currentNetwork: NetworkMetadata | null;
}

export const useNetworkManager = () => {
  const { isConnected, chainId, activeNetwork, networks, setActiveNetwork } = useWallet();
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);

  const networkStatus: NetworkStatus = useMemo(
    () => ({
      isConnected,
      isOnSupportedNetwork: Boolean(activeNetwork),
      isOnCoreNetwork: chainId === "algorand",
      currentNetwork: activeNetwork ?? null,
    }),
    [isConnected, chainId, activeNetwork]
  );

  const findNetwork = useCallback(
    (matcher: (network: NetworkMetadata) => boolean) => {
      return networks.find(matcher);
    },
    [networks]
  );

  const setExplicitNetwork = useCallback(
    async (network: NetworkMetadata) => {
      const targetId = (network.metadata?.walletNetworkId ?? network.id).toString();

      setIsSwitchLoading(true);
      try {
        await setActiveNetwork(targetId);
      } finally {
        setIsSwitchLoading(false);
      }
    },
    [setActiveNetwork]
  );

  const switchNetworkByPredicate = useCallback(
    async (predicate: (network: NetworkMetadata) => boolean) => {
      const target = findNetwork(predicate);
      if (!target) {
        throw new Error("Requested network is not configured");
      }

      await setExplicitNetwork(target);
    },
    [findNetwork, setExplicitNetwork]
  );

  const switchToCoreTestnet = useCallback(() => {
    return switchNetworkByPredicate((network) => {
      const identifier = (network.metadata?.walletNetworkId ?? network.id).toString().toLowerCase();
      return identifier.includes("test");
    });
  }, [switchNetworkByPredicate]);

  const switchToCoreMainnet = useCallback(() => {
    return switchNetworkByPredicate((network) => {
      const identifier = (network.metadata?.walletNetworkId ?? network.id).toString().toLowerCase();
      return identifier.includes("main");
    });
  }, [switchNetworkByPredicate]);

  return {
    networkStatus,
    supportedNetworks: networks,
    switchToCoreTestnet,
    switchToCoreMainnet,
    switchToNetwork: setExplicitNetwork,
    autoSwitchEnabled,
    setAutoSwitchEnabled,
    isSwitchLoading,
  };
};

export default useNetworkManager;
