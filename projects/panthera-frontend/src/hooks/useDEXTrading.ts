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

export const useDEXTrading = (tokenAddress: string, userAddress?: string) => {
  const [state, setState] = useState<DEXTradingState>({
    loading: false,
    error: null,
    quote: null,
    isApproved: false,
    isApproving: false,
  });

  // const publicClient = usePublicClient();
  // const { data: walletClient } = useWalletClient();

  // Get DEX quote for trading using professional service
  const getDEXQuote = useCallback(
    async (amount: string, isBuy: boolean, slippage: number = 2): Promise<DEXQuote> => {
      // if (!publicClient || !amount || parseFloat(amount) <= 0) {
      //   throw new Error("Invalid parameters");
      // }
      // setState((prev) => ({ ...prev, loading: true, error: null }));
      // try {
      //   console.log(`🔄 Getting professional DEX quote: ${amount} ${isBuy ? "ALGO -> TOKEN" : "TOKEN -> ALGO"}`);
      //   // Use professional DEX service
      //   const dexService = createDEXService(publicClient, tokenAddress);
      //   const serviceQuote = await dexService.getDEXQuote(amount, isBuy, slippage);
      //   // Convert service quote to hook format
      //   const quote: DEXQuote = {
      //     inputAmount: serviceQuote.inputAmount,
      //     outputAmount: serviceQuote.outputAmount,
      //     priceImpact: serviceQuote.priceImpact,
      //     slippage: serviceQuote.slippage,
      //     minimumReceived: serviceQuote.minimumReceived,
      //     route: serviceQuote.route,
      //   };
      //   console.log(`✅ Professional DEX quote (${serviceQuote.method}, ${serviceQuote.confidence} confidence):`, quote);
      //   setState((prev) => ({ ...prev, quote, loading: false }));
      //   return quote;
      // } catch (error) {
      //   const errorMessage = error instanceof Error ? error.message : "Unknown error";
      //   console.error("❌ Real DEX quote failed:", errorMessage);
      //   setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      //   throw new Error(errorMessage);
      // }

      return {
        inputAmount: "0",
        outputAmount: "0",
        priceImpact: 0,
        slippage: 0,
        minimumReceived: "0",
        route: [],
        gasEstimate: 0n,
      };
    },
    [tokenAddress]
  );

  // Execute real DEX trade via Sushi swap/v7 payload
  const executeDEXTrade = useCallback(
    async (quote: DEXQuote, isBuy: boolean): Promise<string> => {
      // if (!walletClient || !userAddress) {
      //   throw new Error("Wallet not connected");
      // }
      // setState((prev) => ({ ...prev, loading: true, error: null }));
      // try {
      //   const dexService = createDEXService(publicClient!, tokenAddress);
      //   // 1) Native buy: value gönder, token sell: value=0, calldata ile gönder
      //   const swapTx = await dexService.getSwapTx(quote.inputAmount, isBuy, quote.slippage);
      //   // 2) Eğer SELL ise onay kontrolü (ERC20 allowance)
      //   if (!isBuy) {
      //     // ERC20 allowance check
      //     const allowance = (await publicClient!.readContract({
      //       address: tokenAddress as `0x${string}`,
      //       abi: [
      //         {
      //           name: "allowance",
      //           type: "function",
      //           stateMutability: "view",
      //           inputs: [
      //             { name: "owner", type: "address" },
      //             { name: "spender", type: "address" },
      //           ],
      //           outputs: [{ name: "", type: "uint256" }],
      //         },
      //         {
      //           name: "approve",
      //           type: "function",
      //           stateMutability: "nonpayable",
      //           inputs: [
      //             { name: "spender", type: "address" },
      //             { name: "value", type: "uint256" },
      //           ],
      //           outputs: [{ name: "", type: "bool" }],
      //         },
      //       ] as const,
      //       functionName: "allowance",
      //       args: [userAddress as `0x${string}`, swapTx.to as `0x${string}`],
      //     })) as bigint;
      //     const amountWei = BigInt(Math.floor(parseFloat(quote.inputAmount) * 1e18));
      //     if (allowance < amountWei) {
      //       setState((prev) => ({ ...prev, isApproving: true }));
      //       const hashApprove = await walletClient!.writeContract({
      //         address: tokenAddress as `0x${string}`,
      //         abi: [
      //           {
      //             name: "approve",
      //             type: "function",
      //             stateMutability: "nonpayable",
      //             inputs: [
      //               { name: "spender", type: "address" },
      //               { name: "value", type: "uint256" },
      //             ],
      //             outputs: [{ name: "", type: "bool" }],
      //           },
      //         ] as const,
      //         functionName: "approve",
      //         args: [swapTx.to as `0x${string}`, amountWei],
      //       });
      //       await publicClient!.waitForTransactionReceipt({ hash: hashApprove });
      //       setState((prev) => ({ ...prev, isApproving: false, isApproved: true }));
      //     }
      //   }
      //   // 3) Swap gönderimi (sendTransaction)
      //   const txHash = await walletClient!.sendTransaction({
      //     to: swapTx.to as `0x${string}`,
      //     data: swapTx.data as `0x${string}`,
      //     value: isBuy ? BigInt(swapTx.value) : 0n,
      //   });
      //   const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      //   if (receipt.status !== "success") throw new Error("Swap failed");
      //   setState((prev) => ({ ...prev, loading: false }));
      //   return txHash;
      // } catch (error) {
      //   const errorMessage = error instanceof Error ? error.message : "Unknown error";
      //   console.error("❌ DEX trade failed:", errorMessage);
      //   setState((prev) => ({
      //     ...prev,
      //     loading: false,
      //     error: errorMessage,
      //   }));
      //   throw error;
      // }

      return "";
    },
    [userAddress, tokenAddress]
  );

  // Check if token is approved for trading (real allowance)
  const checkApproval = useCallback(
    async (amount: string): Promise<boolean> => {
      // if (!publicClient || !userAddress) return false;
      // try {
      //   const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      //   const routerAddr = DEXService.SUSHI_ROUTER_V2_CORE;
      //   const allowance = (await publicClient.readContract({
      //     address: tokenAddress as `0x${string}`,
      //     abi: [
      //       {
      //         name: "allowance",
      //         type: "function",
      //         stateMutability: "view",
      //         inputs: [
      //           { name: "owner", type: "address" },
      //           { name: "spender", type: "address" },
      //         ],
      //         outputs: [{ name: "", type: "uint256" }],
      //       },
      //     ] as const,
      //     functionName: "allowance",
      //     args: [userAddress as `0x${string}`, routerAddr as `0x${string}`],
      //   })) as bigint;
      //   const ok = allowance >= amountWei;
      //   setState((prev) => ({ ...prev, isApproved: ok }));
      //   return ok;
      // } catch {
      //   return false;
      // }

      return false;
    },
    [userAddress, tokenAddress]
  );

  // Approve token for trading (real approve to Sushi Router)
  const approveToken = useCallback(
    async (amount: string): Promise<string> => {
      // if (!walletClient || !userAddress) throw new Error("Wallet not connected");
      // setState((prev) => ({ ...prev, isApproving: true, error: null }));
      // try {
      //   const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      //   const spender = "0x9b3336186a38e1b6c21955d112dbb0343ee061ee";
      //   const txHash = await walletClient.writeContract({
      //     address: tokenAddress as `0x${string}`,
      //     abi: [
      //       {
      //         name: "approve",
      //         type: "function",
      //         stateMutability: "nonpayable",
      //         inputs: [
      //           { name: "spender", type: "address" },
      //           { name: "value", type: "uint256" },
      //         ],
      //         outputs: [{ name: "", type: "bool" }],
      //       },
      //     ] as const,
      //     functionName: "approve",
      //     args: [spender as `0x${string}`, amountWei],
      //   });
      //   await publicClient!.waitForTransactionReceipt({ hash: txHash });
      //   setState((prev) => ({ ...prev, isApproving: false, isApproved: true }));
      //   return txHash;
      // } catch (error) {
      //   const msg = error instanceof Error ? error.message : "Unknown error";
      //   setState((prev) => ({ ...prev, isApproving: false, error: msg }));
      //   throw error;
      // }

      return "";
    },
    [userAddress, tokenAddress]
  );

  // Check DEX availability
  const isDEXAvailable = useCallback(async (): Promise<boolean> => {
    // if (!publicClient) return false;

    // try {
    //   const dexService = createDEXService(publicClient, tokenAddress);
    //   return await dexService.isDEXAvailable();
    // } catch {
    //   return false;
    // }

    return false;
  }, [tokenAddress]);

  return {
    ...state,
    getDEXQuote,
    executeDEXTrade,
    checkApproval,
    approveToken,
    isDEXAvailable,
  };
};
