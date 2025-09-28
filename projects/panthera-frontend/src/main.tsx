import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WagmiConfig } from "wagmi";
import App from "./App";
import { wagmiConfig } from "./config/wagmi";
import { WalletProvider } from "./contexts/WalletContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <WagmiConfig config={wagmiConfig}>
        <WalletProvider>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </WalletProvider>
      </WagmiConfig>
    </BrowserRouter>
  </React.StrictMode>
);
