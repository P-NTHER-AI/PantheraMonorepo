import { type WalletState, useWalletContext } from "./useWalletContext";

export const useWallet = (): WalletState => {
  return useWalletContext();
};
