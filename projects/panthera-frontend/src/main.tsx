import { WalletProvider as AlgorandWalletProvider, SupportedWallet, WalletId, WalletManager } from "@txnlab/use-wallet-react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WagmiConfig } from "wagmi";
import App from "./App";
import { wagmiConfig } from "./config/wagmi";
import { WalletProvider } from "./contexts/WalletContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import "./styles/App.css";
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "./utils/network/getAlgoClientConfigs";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <WagmiConfig config={wagmiConfig}>
        <AlgorandWalletProvider manager={walletManager}>
          <WalletProvider>
            <WatchlistProvider>
              <App />
            </WatchlistProvider>
          </WalletProvider>
        </AlgorandWalletProvider>
      </WagmiConfig>
    </BrowserRouter>
  </React.StrictMode>
);
