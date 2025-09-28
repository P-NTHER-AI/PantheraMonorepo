import { useContext } from "react";
import { WalletContext, type WalletState } from "../contexts/WalletContext";

export const useWalletContext = (): WalletState => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export type { WalletState };
