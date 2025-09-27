import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { WalletProvider } from "./contexts/WalletContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import "./styles/App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <WalletProvider>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </WalletProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
