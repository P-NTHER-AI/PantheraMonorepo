import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "./useWallet";
import { apiService } from "../services/api";

export interface AgentCreationParams {
  name: string;
  symbol: string;
  description: string;
  instructions: string;
  model: string;
  category: string;
  avatar?: string;
  imageUrl?: string;
}

interface AgentCreationResponse {
  agentAddress?: string;
}

const DEFAULT_CREATION_FEE = "0";

export const useAgentFactory = () => {
  const { address, chainId, activeNetwork } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);
  const [creationFee, setCreationFee] = useState<string>(DEFAULT_CREATION_FEE);

  const networkLabel = useMemo(() => activeNetwork?.name ?? chainId.toUpperCase(), [activeNetwork?.name, chainId]);

  useEffect(() => {
    const fetchCreationFee = async () => {
      try {
        const response = await apiService.get("/agents/creation-fee");
        const data: any = response?.data ?? {};
        const fee = data?.fee ?? data?.creationFee;
        if (fee) {
          setCreationFee(String(fee));
        }
      } catch (error) {
        console.debug("Falling back to default creation fee", error);
        setCreationFee(DEFAULT_CREATION_FEE);
      }
    };

    fetchCreationFee();
  }, []);

  const createAgentToken = useCallback(
    async (params: AgentCreationParams, onSuccess?: (agentAddress: string) => Promise<void>) => {
      if (!address) {
        throw new Error("Wallet must be connected to create an agent");
      }

      setIsCreating(true);
      setCreateError(null);

      try {
        const payload = {
          name: params.name,
          symbol: params.symbol,
          description: params.description,
          instructions: params.instructions,
          model: params.model,
          category: params.category,
          avatar: params.avatar,
          imageUrl: params.imageUrl,
          creatorAddress: address,
          network: networkLabel,
        };

        const response = await apiService.createAgent(payload);
        const data = response.data as AgentCreationResponse | undefined;
        const agentAddress = data?.agentAddress ?? "";

        if (agentAddress && onSuccess) {
          await onSuccess(agentAddress);
        }

        return agentAddress;
      } catch (error) {
        setCreateError(error as Error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [address, networkLabel]
  );

  const buyTokens = useCallback(
    async (tokenAddress: string, coreAmount: string, onPending?: (txHash: string) => void) => {
      if (!address) {
        throw new Error("Wallet must be connected to buy tokens");
      }

      const numericAmount = Number(coreAmount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Invalid amount provided");
      }

      const response = await apiService.executeBuyOrder({
        userAddress: address,
        agentAddress: tokenAddress,
        coreAmount: numericAmount,
      });

      const payload = (response?.data as any)?.data ?? response?.data ?? {};
      const txHash: string | undefined = payload?.transactionHash ?? payload?.txHash;
      if (txHash) {
        onPending?.(txHash);
      }

      return txHash ?? "";
    },
    [address]
  );

  const sellTokens = useCallback(
    async (tokenAddress: string, tokenAmount: string, onPending?: (txHash: string) => void) => {
      if (!address) {
        throw new Error("Wallet must be connected to sell tokens");
      }

      const numericAmount = Number(tokenAmount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Invalid token amount provided");
      }

      const response = await apiService.executeSellOrder({
        userAddress: address,
        agentAddress: tokenAddress,
        tokenAmount: numericAmount,
      });

      const payload = (response?.data as any)?.data ?? response?.data ?? {};
      const txHash: string | undefined = payload?.transactionHash ?? payload?.txHash;
      if (txHash) {
        onPending?.(txHash);
      }

      return txHash ?? "";
    },
    [address]
  );

  return {
    creationFee,
    isCreating,
    createError,
    createAgentToken,
    buyTokens,
    sellTokens,
  };
};

export default useAgentFactory;
