import type { ContractDefinition, ContractBinding, ChainMetadata, NetworkMetadata } from "./types";

const envNetwork = (import.meta.env.VITE_ALGOD_NETWORK ?? "testnet") as string;

const CHAINS: ChainMetadata[] = [
  {
    id: "algorand",
    name: "Algorand",
    description: "Pure proof-of-stake network used as the primary chain",
    primary: true,
  },
  {
    id: "evm",
    name: "EVM",
    description: "EVM-compatible networks (coming soon)",
    primary: false,
  },
];

const ALGONET_BASE_NETWORKS: NetworkMetadata[] = [
  {
    id: "algorand:mainnet",
    chainId: "algorand",
    name: "Algorand Mainnet",
    tier: "mainnet",
    explorerUrl: "https://algoexplorer.io",
    metadata: {
      walletNetworkId: "mainnet",
    },
  },
  {
    id: "algorand:testnet",
    chainId: "algorand",
    name: "Algorand Testnet",
    tier: "testnet",
    explorerUrl: "https://testnet.algoexplorer.io",
    metadata: {
      walletNetworkId: "testnet",
    },
  },
];

if (envNetwork === "localnet") {
  ALGONET_BASE_NETWORKS.push({
    id: "algorand:localnet",
    chainId: "algorand",
    name: "Algorand LocalNet",
    tier: "localnet",
    explorerUrl: undefined,
    metadata: {
      walletNetworkId: "localnet",
    },
  });
}

const ALGONET_NETWORKS: NetworkMetadata[] = ALGONET_BASE_NETWORKS.map((network) => ({
  ...network,
  isDefault: network.metadata?.walletNetworkId === envNetwork,
}));

const agentFactoryNetworks: Record<string, ContractBinding> = {};

const maybeAddAgentFactoryBinding = (envKey: string, networkId: string) => {
  const value = import.meta.env[envKey as keyof ImportMetaEnv];
  if (!value) return;
  agentFactoryNetworks[networkId] = {
    type: "algorand_app",
    identifier: String(value),
    metadata: {
      appId: Number(value),
      sourceEnvKey: envKey,
    },
  };
};

maybeAddAgentFactoryBinding("VITE_AGENT_FACTORY_APP_ID_MAINNET", "algorand:mainnet");
maybeAddAgentFactoryBinding("VITE_AGENT_FACTORY_APP_ID_TESTNET", "algorand:testnet");
maybeAddAgentFactoryBinding("VITE_AGENT_FACTORY_APP_ID_LOCALNET", "algorand:localnet");

const CONTRACTS: ContractDefinition[] = [];

if (Object.keys(agentFactoryNetworks).length > 0) {
  CONTRACTS.push({
    id: "agentFactory",
    name: "Agent Factory",
    chainId: "algorand",
    description: "Bonding curve factory that mints and manages Panthera agents",
    networks: agentFactoryNetworks,
  });
}

export const chainRegistry: ChainMetadata[] = CHAINS;

export const networkRegistry: Record<string, NetworkMetadata[]> = {
  algorand: ALGONET_NETWORKS,
  evm: [
    {
      id: "evm:placeholder",
      chainId: "evm",
      name: "EVM (Coming Soon)",
      tier: "custom",
      isDefault: true,
      metadata: {
        status: "pending",
      },
    },
  ],
};

export const contractRegistry: ContractDefinition[] = CONTRACTS;

export const getNetworksForChain = (chainId: "algorand" | "evm"): NetworkMetadata[] => {
  return networkRegistry[chainId] ?? [];
};

export const getContractsForChain = (chainId: "algorand" | "evm"): ContractDefinition[] => {
  return contractRegistry.filter((contract) => contract.chainId === chainId);
};
