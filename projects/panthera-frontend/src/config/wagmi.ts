import type { Chain, Config } from "wagmi";
import { configureChains, createConfig } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { publicProvider } from "wagmi/providers/public";
import { coreMainnet, coreTestnet, SUPPORTED_CHAINS } from "./chains";

// Professional chain configuration with type safety
const professionalChains: Chain[] = [...SUPPORTED_CHAINS];

// Configure chains and providers using only public provider + our proxy via Vite for dev
const { chains, publicClient, webSocketPublicClient } = configureChains(professionalChains, [publicProvider()]);

// Professional connector configuration with proper typing
const createProfessionalConnectors = () => {
  const baseConnectors = [
    new MetaMaskConnector({
      chains,
      options: {
        shimDisconnect: true,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ];

  // Add WalletConnect only in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_WALLETCONNECT === "true") {
    const walletConnectConnector = new WalletConnectConnector({
      chains,
      options: {
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "your-project-id",
        metadata: {
          name: "URSUS AI Agent Platform",
          description: "AI Agent + Token Launchpad on Core DAO",
          url: "https://ursus.ai",
          icons: ["https://ursus.ai/icon.png"],
        },
        qrModalOptions: {
          enableExplorer: false,
          explorerRecommendedWalletIds: [],
        },
      },
    });

    return [...baseConnectors, walletConnectConnector];
  }

  return baseConnectors;
};

const connectors = createProfessionalConnectors();

// Professional wagmi configuration
export const wagmiConfig: Config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
}) as Config;

// Professional configuration exports
export { chains, professionalChains };

// Professional configuration metadata
export const configMetadata = {
  supportedChains: professionalChains.length,
  supportedConnectors: connectors.length,
  hasWalletConnect: connectors.some((c) => c.id === "walletConnect"),
  environment: import.meta.env.PROD ? "production" : "development",
  version: "2.0.0",
};

// Professional configuration validation
export const validateConfiguration = () => {
  const issues = [];

  if (professionalChains.length === 0) {
    issues.push("No chains configured");
  }

  if (connectors.length === 0) {
    issues.push("No connectors configured");
  }

  if (!publicClient) {
    issues.push("Public client not configured");
  }

  const hasMetaMask = connectors.some((c) => c.id === "metaMask");
  if (!hasMetaMask) {
    issues.push("MetaMask connector not found");
  }

  const hasCoreChains = professionalChains.some((c) => c.id === 1114 || c.id === 1116);
  if (!hasCoreChains) {
    issues.push("Core blockchain chains not configured");
  }

  return {
    isValid: issues.length === 0,
    issues,
    metadata: configMetadata,
  };
};

// Export specific chains for easy access
export { coreMainnet, coreTestnet };
