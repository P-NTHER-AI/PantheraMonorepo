import { useCallback, useState } from "react";

export interface DEXQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  slippage: number;
  minimumReceived: string;
  route: string[];
  gasEstimate?: bigint;
}

export interface DEXTradingState {
  loading: boolean;
  error: string | null;
  quote: DEXQuote | null;
  isApproved: boolean;
  isApproving: boolean;
}

export const useDEXTrading = (_tokenAddress: string, _userAddress?: string) => {
  const [state, setState] = useState<DEXTradingState>({
    loading: false,
    error: null,
    quote: null,
    isApproved: false,
    isApproving: false,
  });

  const getDEXQuote = useCallback(async (_amount: string, _isBuy: boolean, _slippage: number = 2): Promise<DEXQuote> => {
    throw new Error("DEX trading is not available on Algorand yet");
  }, []);

  const executeDEXTrade = useCallback(async (_quote: DEXQuote, _isBuy: boolean): Promise<string> => {
    throw new Error("DEX trading is not available on Algorand yet");
  }, []);

  const reset = () => setState({ loading: false, error: null, quote: null, isApproved: false, isApproving: false });

  return {
    ...state,
    getDEXQuote,
    executeDEXTrade,
    reset,
  };
};

export default useDEXTrading;
