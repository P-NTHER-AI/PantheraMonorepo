import { useEffect, useState } from "react";
import { useWallet } from "./useWallet";

interface TokenBalanceState {
  balance: string;
  loading: boolean;
  error: string | null;
}

export const useTokenBalance = (_tokenAddress?: string) => {
  const { address } = useWallet();
  const [state, setState] = useState<TokenBalanceState>({ balance: "0", loading: false, error: null });

  useEffect(() => {
    setState({ balance: "0", loading: false, error: null });
  }, [_tokenAddress, address]);

  return {
    balance: state.balance,
    loading: state.loading,
    error: state.error,
  };
};

export default useTokenBalance;
