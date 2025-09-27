import { useCallback, useEffect, useMemo, useState } from "react";
import type algosdk from "algosdk";
import { useNetwork, useWallet, type Wallet } from "@txnlab/use-wallet-react";
import { getNetworksForChain } from "../registry";
import type { ChainAdapter, ConnectionResult, NetworkMetadata, WalletBalance, WalletConnector, WalletAccount } from "../types";

const MICRO_ALGO_DECIMALS = 6;

const formatBalance = (microAlgos: bigint): WalletBalance => {
  const decimals = MICRO_ALGO_DECIMALS;
  const divisor = BigInt(10 ** decimals);
  const whole = microAlgos / divisor;
  const fraction = Number(microAlgos % divisor) / 10 ** decimals;
  const formatted = (Number(whole) + fraction).toFixed(6);

  return {
    amount: microAlgos,
    decimals,
    formatted,
    symbol: "ALGO",
  };
};

const mapWalletToConnector = (wallet: Wallet): WalletConnector => {
  const metadata = wallet.metadata as Record<string, unknown> | undefined;
  const isInstalled = typeof metadata?.isInstalled === "boolean" ? (metadata.isInstalled as boolean) : undefined;

  return {
    id: wallet.id,
    name: metadata?.name?.toString() ?? wallet.id,
    chainId: "algorand",
    ready: isInstalled ?? wallet.isConnected ?? true,
    metadata: {
      icon: metadata?.icon,
      installUrl: metadata?.installUrl,
    },
  };
};

const tierFromWalletNetworkId = (networkId: string | undefined): NetworkMetadata["tier"] => {
  if (!networkId) return "custom";
  const lowered = networkId.toLowerCase();
  if (lowered.includes("main")) return "mainnet";
  if (lowered.includes("test")) return "testnet";
  if (lowered.includes("local")) return "localnet";
  return "custom";
};

export const useAlgorandAdapter = (): ChainAdapter => {
  const { wallets, activeAddress, activeAccount, activeWallet, algodClient, transactionSigner, activeWalletAccounts } = useWallet();
  const { activeNetwork, setActiveNetwork } = useNetwork();

  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const connectors: WalletConnector[] = useMemo(() => wallets.map(mapWalletToConnector), [wallets]);

  const accounts: WalletAccount[] = useMemo(() => {
    if (!activeWalletAccounts) return [];
    return activeWalletAccounts.map((account) => ({
      address: account.address,
      label: account.name,
      providerId: activeWallet?.id ?? "",
    }));
  }, [activeWalletAccounts, activeWallet?.id]);

  const refreshBalance = useCallback(async () => {
    if (!algodClient || !activeAddress) {
      setBalance(null);
      return;
    }

    setIsBalanceLoading(true);
    try {
      const accountInfo = await algodClient.accountInformation(activeAddress).do();
      const microAlgos = BigInt(accountInfo.amount ?? 0);
      setBalance(formatBalance(microAlgos));
    } catch (error) {
      console.error("Failed to fetch Algorand balance", error);
      setLastError(error as Error);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [algodClient, activeAddress]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const connectWallet = useCallback(
    async (connectorId?: string): Promise<ConnectionResult> => {
      const targetWallet = connectorId ? wallets.find((wallet) => wallet.id === connectorId) : wallets[0];

      if (!targetWallet) {
        return { success: false, error: "No Algorand wallet configured" };
      }

      setIsConnecting(true);
      setLastError(null);

      try {
        const accounts = await targetWallet.connect();
        targetWallet.setActive();
        if (accounts?.[0]) {
          targetWallet.setActiveAccount(accounts[0].address);
        }
        await refreshBalance();
        return { success: true };
      } catch (error) {
        setLastError(error as Error);
        return { success: false, error: (error as Error).message ?? "Failed to connect Algorand wallet" };
      } finally {
        setIsConnecting(false);
      }
    },
    [wallets, refreshBalance]
  );

  const disconnectWallet = useCallback(async () => {
    const targetWallet = wallets.find((wallet) => wallet.isActive) ?? wallets[0];
    if (!targetWallet) return;

    try {
      await targetWallet.disconnect();
      setBalance(null);
    } catch (error) {
      console.error("Failed to disconnect Algorand wallet", error);
      setLastError(error as Error);
    }
  }, [wallets]);

  const setActiveAccount = useCallback(
    (address: string) => {
      const targetWallet = wallets.find((wallet) => wallet.isActive) ?? wallets[0];
      targetWallet?.setActiveAccount(address);
    },
    [wallets]
  );

  const setActiveNetworkSafe = useCallback(
    async (networkId: string) => {
      try {
        await setActiveNetwork(networkId);
        await refreshBalance();
      } catch (error) {
        console.error("Failed to switch Algorand network", error);
        setLastError(error as Error);
        throw error;
      }
    },
    [setActiveNetwork, refreshBalance]
  );

  const allNetworksBase = useMemo(() => getNetworksForChain("algorand"), []);

  const networks: NetworkMetadata[] = useMemo(
    () =>
      allNetworksBase.map((network) => ({
        ...network,
        tier: network.metadata?.walletNetworkId ? tierFromWalletNetworkId(network.metadata.walletNetworkId as string) : network.tier,
        isDefault: network.metadata?.walletNetworkId === activeNetwork,
      })),
    [allNetworksBase, activeNetwork]
  );

  const activeNetworkMetadata = useMemo(() => {
    return (
      networks.find((network) => network.metadata?.walletNetworkId === activeNetwork) ??
      networks.find((network) => network.isDefault) ??
      networks[0]
    );
  }, [networks, activeNetwork]);

  return {
    chainId: "algorand",
    networkId: activeNetworkMetadata?.metadata?.walletNetworkId?.toString() ?? activeNetwork ?? "",
    address: activeAddress,
    accounts,
    balance,
    connectors,
    isConnected: Boolean(activeAddress),
    isConnecting,
    isBalanceLoading,
    lastError,
    supportsSignData: Boolean(activeWallet?.canSignData),
    connectWallet,
    disconnectWallet,
    setActiveAccount,
    setActiveNetwork: setActiveNetworkSafe,
    refreshBalance,
    networks,
    activeNetwork: activeNetworkMetadata,
    transactionSigner,
  };
};
