import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  SupportedWallet,
  WalletId,
  WalletManager,
  WalletProvider as TxnWalletProvider,
  type NetworkConfig,
  type WalletManagerConfig,
} from "@txnlab/use-wallet-react";
import {
  chainRegistry,
  contractRegistry,
  getContractsForChain,
} from "../multichain/registry";
import {
  type ChainAdapter,
  type ChainMetadata,
  type ChainType,
  type ConnectionResult,
  type ContractDefinition,
  type NetworkMetadata,
  type WalletAccount,
  type WalletBalance,
  type WalletConnector,
} from "../multichain/types";
import { useAlgorandAdapter, useEvmPlaceholderAdapter } from "../multichain";
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "../utils/network/getAlgoClientConfigs";

export interface WalletContextValue {
  chainId: ChainType;
  chain: ChainMetadata;
  chains: ChainMetadata[];
  setActiveChain: (chainId: ChainType) => void;

  address: string | null;
  accounts: WalletAccount[];
  connectors: WalletConnector[];
  connectWallet: (connectorId?: string) => Promise<ConnectionResult>;
  disconnectWallet: () => Promise<void>;
  disconnect: () => Promise<void>;

  isConnected: boolean;
  isConnecting: boolean;
  isBalanceLoading: boolean;
  balance: WalletBalance | null;
  balanceSymbol: string;
  refreshBalance: () => Promise<void>;

  networks: NetworkMetadata[];
  activeNetwork: NetworkMetadata;
  setActiveNetwork: (networkId: string) => Promise<void>;

  supportsSignData: boolean;
  transactionSigner: ChainAdapter["transactionSigner"];

  connectError: Error | null;
  lastError: Error | null;

  contracts: ContractDefinition[];
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const buildWalletManager = () => {
  const algodConfig = getAlgodConfigFromViteEnvironment();

  const networks: Record<string, NetworkConfig> = {
    [algodConfig.network]: {
      algod: {
        baseServer: algodConfig.server,
        port: algodConfig.port,
        token: String(algodConfig.token ?? ""),
      },
      isTestnet: algodConfig.network !== "mainnet",
    },
  };

  let supportedWallets: SupportedWallet[] = [];

  if (algodConfig.network === "localnet") {
    const kmdConfig = getKmdConfigFromViteEnvironment();
    supportedWallets = [
      {
        id: WalletId.KMD,
        options: {
          baseServer: kmdConfig.server,
          token: String(kmdConfig.token ?? ""),
          port: String(kmdConfig.port ?? ""),
        },
      },
    ];
  } else {
    supportedWallets = [
      { id: WalletId.DEFLY },
      { id: WalletId.PERA },
      { id: WalletId.EXODUS },
      { id: WalletId.LUTE },
    ];
  }

  const managerConfig: WalletManagerConfig = {
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks,
    options: {
      resetNetwork: true,
    },
  };

  return new WalletManager(managerConfig);
};

const adapters: ChainType[] = ["algorand", "evm"];

const WalletContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const algorandAdapter = useAlgorandAdapter();
  const evmAdapter = useEvmPlaceholderAdapter();

  const adapterMap: Record<ChainType, ChainAdapter> = {
    algorand: algorandAdapter,
    evm: evmAdapter,
  };

  const [activeChainId, setActiveChainId] = useState<ChainType>("algorand");

  const activeAdapter = adapterMap[activeChainId];

  const value = useMemo<WalletContextValue>(() => {
    const chain = chainRegistry.find((entry) => entry.id === activeChainId) ?? chainRegistry[0];
    const contractsForChain = getContractsForChain(activeChainId);
    const balanceSymbol = activeAdapter.balance?.symbol ?? (activeChainId === "algorand" ? "ALGO" : "ETH");

    const connectWallet = async (connectorId?: string) => activeAdapter.connectWallet(connectorId);
    const disconnectWallet = async () => activeAdapter.disconnectWallet();

    return {
      chainId: activeChainId,
      chain,
      chains: chainRegistry,
      setActiveChain: setActiveChainId,
      address: activeAdapter.address,
      accounts: activeAdapter.accounts,
      connectors: activeAdapter.connectors,
      connectWallet,
      disconnectWallet,
      disconnect: disconnectWallet,
      isConnected: activeAdapter.isConnected,
      isConnecting: activeAdapter.isConnecting,
      isBalanceLoading: activeAdapter.isBalanceLoading,
      balance: activeAdapter.balance,
      balanceSymbol,
      refreshBalance: activeAdapter.refreshBalance,
      networks: activeAdapter.networks,
      activeNetwork: activeAdapter.activeNetwork,
      setActiveNetwork: activeAdapter.setActiveNetwork,
      supportsSignData: activeAdapter.supportsSignData,
      transactionSigner: activeAdapter.transactionSigner,
      connectError: activeAdapter.lastError,
      lastError: activeAdapter.lastError,
      contracts: contractsForChain,
    };
  }, [activeAdapter, activeChainId]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const manager = useMemo(() => buildWalletManager(), []);

  return (
    <TxnWalletProvider manager={manager}>
      <WalletContextBridge>{children}</WalletContextBridge>
    </TxnWalletProvider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export { WalletContext };
