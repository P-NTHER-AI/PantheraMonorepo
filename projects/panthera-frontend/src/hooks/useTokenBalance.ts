import { useWallet } from "@txnlab/use-wallet-react";
import { useCallback, useEffect, useState } from "react";

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const useTokenBalance = (tokenAddress?: string) => {
  const { activeAddress } = useWallet();

  // const {
  //   data: balance,
  //   isLoading: balanceLoading,
  //   refetch: refetchBalance,
  // } = useContractRead({
  //   address: tokenAddress as `0x${string}`,
  //   abi: ERC20_ABI,
  //   functionName: "balanceOf",
  //   args: activeAddress ? [activeAddress] : undefined,
  //   enabled: !!tokenAddress && !!activeAddress,
  // });

  // const { data: symbol } = useContractRead({
  //   address: tokenAddress as `0x${string}`,
  //   abi: ERC20_ABI,
  //   functionName: "symbol",
  //   enabled: !!tokenAddress,
  // });

  // const { data: decimals } = useContractRead({
  //   address: tokenAddress as `0x${string}`,
  //   abi: ERC20_ABI,
  //   functionName: "decimals",
  //   enabled: !!tokenAddress,
  // });

  // const formattedBalance = balance ? formatEther(balance) : "0";

  // return {
  //   balance: formattedBalance,
  //   symbol: symbol || "TOKEN",
  //   decimals: decimals || 18,
  //   isLoading: balanceLoading,
  //   refetch: refetchBalance,
  // };
  return {
    balance: "0",
    symbol: "TOKEN",
    decimals: 18,
    isLoading: false,
    refetch: () => {},
  };
};

// Hook to get all user's agent token balances
export const useUserTokenBalances = () => {
  const { activeAddress } = useWallet();

  const [balances, setBalances] = useState<
    Array<{
      tokenAddress: string;
      balance: string;
      symbol: string;
      agentName: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!activeAddress) return;

    setLoading(true);
    try {
      // Mock data for now
      const mockBalances = [
        {
          tokenAddress: "0x1234567890123456789012345678901234567890",
          balance: "1000.0",
          symbol: "TAT",
          agentName: "Test Agent Token",
        },
      ];

      setBalances(mockBalances);
    } catch (error) {
      console.error("Error fetching user token balances:", error);
    } finally {
      setLoading(false);
    }
  }, [activeAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    loading,
    refetch: fetchBalances,
  };
};
