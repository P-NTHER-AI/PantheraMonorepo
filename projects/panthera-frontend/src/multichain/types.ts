import type algosdk from "algosdk";

export type ChainType = "algorand" | "evm";

export type NetworkTier = "mainnet" | "testnet" | "localnet" | "custom";

export interface ChainMetadata {
  id: ChainType;
  name: string;
  description?: string;
  primary: boolean;
}

export interface NetworkMetadata {
  id: string;
  chainId: ChainType;
  name: string;
  tier: NetworkTier;
  explorerUrl?: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WalletConnector {
  id: string;
  name: string;
  chainId: ChainType;
  ready: boolean;
  metadata?: Record<string, unknown>;
}

export interface WalletAccount {
  address: string;
  label?: string;
  providerId: string;
}

export interface WalletBalance {
  amount: bigint;
  decimals: number;
  formatted: string;
  symbol: string;
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
}

export interface ChainWalletState {
  chainId: ChainType;
  networkId: string;
  address: string | null;
  accounts: WalletAccount[];
  balance: WalletBalance | null;
  connectors: WalletConnector[];
  isConnected: boolean;
  isConnecting: boolean;
  isBalanceLoading: boolean;
  lastError: Error | null;
  supportsSignData: boolean;
}

export interface ChainWalletActions {
  connectWallet: (connectorId?: string) => Promise<ConnectionResult>;
  disconnectWallet: () => Promise<void>;
  setActiveAccount: (address: string) => void;
  setActiveNetwork: (networkId: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export interface ChainAdapter extends ChainWalletState, ChainWalletActions {
  networks: NetworkMetadata[];
  activeNetwork: NetworkMetadata;
  transactionSigner?: (txnGroup: algosdk.Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>;
}

export type ContractType = "algorand_app" | "evm_contract";

export interface ContractBinding {
  type: ContractType;
  identifier: string;
  metadata?: Record<string, unknown>;
}

export interface ContractDefinition {
  id: string;
  name: string;
  chainId: ChainType;
  description?: string;
  networks: Record<string, ContractBinding>;
}
