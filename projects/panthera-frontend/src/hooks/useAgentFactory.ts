import { useCallback, useState } from "react";
import { decodeEventLog, encodeFunctionData, formatEther, parseEther } from "viem";
import { useContractRead, useNetwork, usePublicClient, useWalletClient } from "wagmi";
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

// Proper ABI format for key functions
const AGENT_FACTORY_ABI = [
  {
    name: "createAgent",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "description", type: "string" },
      { name: "instructions", type: "string" },
      { name: "model", type: "string" },
      { name: "category", type: "string" },
    ],
    outputs: [{ name: "agentAddress", type: "address" }],
  },
  // Some factory deployments expose a short createAgent(name,symbol) only
  {
    name: "createAgent",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    outputs: [{ name: "agentAddress", type: "address" }],
  },
  {
    name: "creationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTotalAgents",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "tokenAddress", type: "address" },
      { name: "creator", type: "address" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "description", type: "string" },
      { name: "instructions", type: "string" },
      { name: "model", type: "string" },
      { name: "category", type: "string" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    name: "getAgentsByCreator",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "isValidAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "AgentCreated",
    type: "event",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
  },
  // Support long signature variant emitted by some deployments
  {
    name: "AgentCreated",
    type: "event",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "description", type: "string", indexed: false },
      { name: "category", type: "string", indexed: false },
    ],
  },
] as const;

// AgentToken contract ABI for token operations
const AGENT_TOKEN_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getCurrentPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMarketCap",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBuyQuote",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "coreAmount", type: "uint256" }],
    outputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "currentPrice", type: "uint256" },
      { name: "newPrice", type: "uint256" },
      { name: "priceImpact", type: "uint256" },
    ],
  },
  {
    name: "getSellQuote",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [
      { name: "coreAmount", type: "uint256" },
      { name: "currentPrice", type: "uint256" },
      { name: "newPrice", type: "uint256" },
      { name: "priceImpact", type: "uint256" },
    ],
  },
  {
    name: "calculatePurchaseReturn",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "coreAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "calculateSaleReturn",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "purchaseTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "buyTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "sellTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_tokenAmount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "isGraduated",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "purchaseTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "minTokensOut", type: "uint256" }],
    outputs: [{ name: "tokensReceived", type: "uint256" }],
  },
  {
    name: "sellTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "minCoreOut", type: "uint256" },
    ],
    outputs: [{ name: "coreReceived", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const useAgentFactory = () => {
  const { chain } = useNetwork();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);

  // Get contract address for current network (auto-generated by deploy script)
  const contractAddress = (() => {
    if (chain?.id === 1114) return CONTRACT_ADDRESSES.CORETESTNET.AGENT_FACTORY as `0x${string}`;
    if (chain?.id === 1116 && (CONTRACT_ADDRESSES as any).COREMAINNET?.AGENT_FACTORY) {
      return (CONTRACT_ADDRESSES as any).COREMAINNET.AGENT_FACTORY as `0x${string}`;
    }
    return null;
  })();

  // Read creation fee
  const { data: creationFee, isLoading: isLoadingFee } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: AGENT_FACTORY_ABI,
    functionName: "creationFee",
    enabled: !!contractAddress,
  });

  // Read total agents
  const { data: totalAgents, isLoading: isLoadingTotal } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: AGENT_FACTORY_ABI,
    functionName: "getTotalAgents",
    enabled: !!contractAddress,
  });

  // Get all agents (paginated)
  const getAllAgents = useCallback(
    async (offset: number = 0, limit: number = 20) => {
      if (!publicClient || !contractAddress) {
        throw new Error("Contract not available");
      }

      try {
        // Get total number of agents
        const totalAgents = (await publicClient.readContract({
          address: contractAddress,
          abi: AGENT_FACTORY_ABI,
          functionName: "getTotalAgents",
        })) as bigint;

        const total = Number(totalAgents);

        if (total === 0) {
          return { agents: [], total: 0 };
        }

        // Calculate pagination bounds
        const startIndex = Math.min(offset, total - 1);
        const endIndex = Math.min(offset + limit, total);
        const agents = [];

        // Fetch agents in the specified range
        for (let i = startIndex; i < endIndex; i++) {
          try {
            const agentData = (await publicClient.readContract({
              address: contractAddress,
              abi: AGENT_FACTORY_ABI,
              functionName: "getAgent",
              args: [BigInt(i)],
            })) as [string, string, string, string, string, string, string, string, bigint];

            const [tokenAddress, creator, name, symbol, description, instructions, model, category, createdAt] = agentData;

            // Get additional token data
            const [currentPrice, totalSupply, marketCap] = await Promise.all([
              publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "getCurrentPrice",
                })
                .catch(() => BigInt(0)),
              publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "totalSupply",
                })
                .catch(() => BigInt(0)),
              publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "getMarketCap",
                })
                .catch(() => BigInt(0)),
            ]);

            agents.push({
              id: tokenAddress,
              contractAddress: tokenAddress,
              creator,
              name,
              symbol,
              description,
              instructions,
              model,
              category,
              currentPrice: formatEther(currentPrice as bigint),
              totalSupply: (totalSupply as bigint).toString(),
              marketCap: formatEther(marketCap as bigint),
              createdAt: new Date(Number(createdAt) * 1000).toISOString(),
              isVerified: false, // This would come from a separate verification system
              volume24h: "0", // This would come from analytics
              priceChange24h: "0", // This would come from analytics
              holders: 0, // This would come from analytics
            });
          } catch (error) {
            console.error(`Error fetching agent at index ${i}:`, error);
            // Continue with next agent
          }
        }

        return { agents, total };
      } catch (error) {
        console.error("Error fetching agents:", error);
        throw error;
      }
    },
    [publicClient, contractAddress]
  );

  // Get trending agents (sorted by market cap)
  const getTrendingAgents = useCallback(
    async (limit: number = 10) => {
      if (!publicClient || !contractAddress) {
        throw new Error("Contract not available");
      }

      try {
        // Get all agents first
        const { agents } = await getAllAgents(0, 100); // Get up to 100 agents for sorting

        // Sort by market cap (descending) and take the top ones
        const trendingAgents = agents.sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap)).slice(0, limit);

        return trendingAgents;
      } catch (error) {
        console.error("Error fetching trending agents:", error);
        throw error;
      }
    },
    [publicClient, contractAddress, getAllAgents]
  );

  // Get agents by creator
  const getAgentsByCreator = useCallback(
    async (creator: string) => {
      if (!publicClient || !contractAddress) {
        throw new Error("Contract not available");
      }

      try {
        // Get agent addresses created by this creator
        const agentAddresses = (await publicClient.readContract({
          address: contractAddress,
          abi: AGENT_FACTORY_ABI,
          functionName: "getAgentsByCreator",
          args: [creator as `0x${string}`],
        })) as string[];

        const agents = [];

        // Fetch details for each agent
        for (const tokenAddress of agentAddresses) {
          try {
            // Get basic token info
            const [name, symbol, totalSupply, currentPrice, marketCap] = await Promise.all([
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: AGENT_TOKEN_ABI,
                functionName: "name",
              }),
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: AGENT_TOKEN_ABI,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: AGENT_TOKEN_ABI,
                functionName: "totalSupply",
              }),
              publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "getCurrentPrice",
                })
                .catch(() => BigInt(0)),
              publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "getMarketCap",
                })
                .catch(() => BigInt(0)),
            ]);

            agents.push({
              id: tokenAddress,
              contractAddress: tokenAddress,
              creator,
              name: name as string,
              symbol: symbol as string,
              description: "", // Would need to be stored separately or in metadata
              instructions: "", // Would need to be stored separately or in metadata
              model: "", // Would need to be stored separately or in metadata
              category: "", // Would need to be stored separately or in metadata
              currentPrice: formatEther(currentPrice as bigint),
              totalSupply: (totalSupply as bigint).toString(),
              marketCap: formatEther(marketCap as bigint),
              createdAt: new Date().toISOString(), // Would need to be fetched from creation event
              isVerified: false,
              volume24h: "0",
              priceChange24h: "0",
              holders: 0,
            });
          } catch (error) {
            console.error(`Error fetching agent details for ${tokenAddress}:`, error);
            // Continue with next agent
          }
        }

        return agents;
      } catch (error) {
        console.error("Error fetching agents by creator:", error);
        throw error;
      }
    },
    [publicClient, contractAddress]
  );

  // Manual contract interaction

  // Create agent wrapper - Real blockchain deployment
  const createAgentToken = useCallback(
    async (params: AgentCreationParams, onSuccess?: (txHash: string) => void) => {
      console.log("🚀 Creating agent with params:", params);

      if (!contractAddress) {
        throw new Error("Contract address not available");
      }

      if (!walletClient) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // Check if wallet is still connected and has accounts
      try {
        const accounts = await walletClient.getAddresses();
        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet accounts found. Please connect your wallet.");
        }
        console.log("✅ Wallet connected with account:", accounts[0]);
      } catch (error) {
        console.error("❌ Wallet connection check failed:", error);
        throw new Error("Wallet connection failed. Please reconnect your wallet.");
      }

      try {
        setIsCreating(true);
        setCreateError(null);

        // Use the actual creation fee from the contract, fallback to config if not available
        const actualCreationFeeString = creationFee ? formatEther(creationFee) : PLATFORM_CONFIG.PLATFORM_FEE_FIXED;

        console.log("📝 Deploying to Core testnet contract:", contractAddress);
        console.log("💰 Creation fee:", actualCreationFeeString, "CORE");
        const requiredAmount = parseEther(actualCreationFeeString);
        console.log("💳 Required amount:", actualCreationFeeString, "CORE");

        // Prepare transaction data
        // Try long signature first with writeContract; fallback to short signature
        const account = (await walletClient.getAddresses())[0] as `0x${string}`;
        let txHash: `0x${string}`;
        try {
          txHash = await walletClient.writeContract({
            account,
            address: contractAddress as `0x${string}`,
            abi: AGENT_FACTORY_ABI,
            functionName: "createAgent",
            args: [params.name, params.symbol, params.description, params.instructions, params.model, params.category],
            value: requiredAmount,
          });
        } catch (errLong) {
          console.warn("Long createAgent signature write failed, trying short signature...", errLong);
          try {
            txHash = await walletClient.writeContract({
              account,
              address: contractAddress as `0x${string}`,
              abi: AGENT_FACTORY_ABI,
              functionName: "createAgent",
              args: [params.name, params.symbol],
              value: requiredAmount,
            });
          } catch (errShort) {
            console.error("Both createAgent signatures reverted", errShort);
            setCreateError(errShort as Error);
            throw errShort;
          }
        }

        console.log("✅ Transaction submitted:", txHash);

        // Wait for transaction receipt to get the agent address
        if (publicClient) {
          try {
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: txHash,
              timeout: 60000, // 60 seconds timeout
            });

            console.log("📄 Transaction receipt:", receipt);

            // Abort early if reverted
            const statusNum = Number((receipt as any).status);
            if (statusNum === 0) {
              console.error("❌ Transaction reverted; aborting agent lookup.");
              setCreateError(new Error("TRANSACTION_REVERTED"));
              return { hash: txHash };
            }

            // Find AgentCreated event in logs
            const agentCreatedEvent = receipt.logs.find((log) => {
              try {
                const decoded = decodeEventLog({
                  abi: AGENT_FACTORY_ABI,
                  data: log.data,
                  topics: log.topics,
                }) as { eventName: string };
                return decoded.eventName === "AgentCreated";
              } catch {
                return false;
              }
            });

            if (agentCreatedEvent) {
              const decoded = decodeEventLog({
                abi: AGENT_FACTORY_ABI,
                data: agentCreatedEvent.data,
                topics: agentCreatedEvent.topics,
              }) as { args: { tokenAddress: string } };

              const agentAddress = decoded.args.tokenAddress as string;
              console.log("🎯 Agent address from event:", agentAddress);

              // Persist to backend (real DB) so it appears on the main screen
              try {
                await apiService.createAgent({
                  name: params.name,
                  symbol: params.symbol,
                  description: params.description,
                  instructions: params.instructions,
                  model: params.model,
                  category: params.category,
                  creatorAddress: (await walletClient.getAddresses())[0],
                  avatar: "🤖",
                  imageUrl: params.imageUrl,
                  contractAddress: agentAddress,
                  agentAddress: agentAddress, // Also send as agentAddress for backend compatibility
                  txHash,
                });
              } catch (e) {
                console.warn("⚠️ Backend agent create failed, retrying once...", e);
                try {
                  // Retry once after 2s delay
                  await new Promise((r) => setTimeout(r, 2000));
                  await apiService.createAgent({
                    name: params.name,
                    symbol: params.symbol,
                    description: params.description,
                    instructions: params.instructions,
                    model: params.model,
                    category: params.category,
                    creatorAddress: (await walletClient.getAddresses())[0],
                    avatar: "🤖",
                    imageUrl: params.imageUrl,
                    contractAddress: agentAddress,
                    agentAddress: agentAddress,
                    txHash,
                  });
                  console.log("✅ Agent data sent to backend for indexing (retry)");
                } catch (retryError) {
                  console.warn("⚠️ Backend agent create retry failed:", retryError);
                  // EventListener will pick it up from blockchain event
                }
              }

              // Call success callback with agent address
              if (onSuccess) {
                onSuccess(agentAddress);
              }

              return { hash: txHash, agentAddress };
            }
          } catch (error) {
            console.error("Error waiting for receipt:", error);
          }
        }

        // Fallback: call success callback with tx hash if receipt parsing fails
        if (onSuccess) {
          onSuccess(txHash);
        }

        return { hash: txHash };
      } catch (error) {
        console.error("Failed to create agent:", error);
        setCreateError(error as Error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [walletClient, contractAddress, creationFee, publicClient]
  );

  // Buy tokens function - calls purchaseTokens() on AgentToken contract
  const buyTokens = useCallback(
    async (tokenAddress: string, coreAmount: string, onSuccess?: (txHash: string) => void) => {
      if (!walletClient) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      setIsCreating(true);
      setCreateError(null);

      try {
        console.log("💰 Buying tokens:", {
          tokenAddress,
          coreAmount,
        });

        const amountInWei = parseEther(coreAmount);
        console.log("💰 Amount in wei:", amountInWei.toString());

        // Backend precheck to avoid reverted on-chain call for graduated tokens
        try {
          await apiService.getPurchaseQuote(tokenAddress, coreAmount);
        } catch (precheckError) {
          const em = precheckError instanceof Error ? precheckError.message.toLowerCase() : String(precheckError).toLowerCase();
          if (em.includes("graduated_token") || em.includes("graduated")) {
            throw new Error("GRADUATED_TOKEN");
          }
        }

        // Get buy quote and calculate minimum tokens out (with 2% slippage tolerance)
        const buyQuote = (await publicClient?.readContract({
          address: tokenAddress as `0x${string}`,
          abi: AGENT_TOKEN_ABI,
          functionName: "getBuyQuote",
          args: [amountInWei],
        })) as [bigint, bigint, bigint, bigint];

        const tokenAmount = buyQuote[0]; // First return value is tokenAmount
        const minTokensOut = (tokenAmount * 98n) / 100n; // 2% slippage tolerance

        console.log("💰 Expected tokens:", formatEther(tokenAmount));
        console.log("💰 Minimum tokens (with slippage):", formatEther(minTokensOut));

        // Call buyTokens function (no parameters needed)
        const data = encodeFunctionData({
          abi: AGENT_TOKEN_ABI,
          functionName: "buyTokens",
        });

        // Send transaction directly to AgentToken contract
        const txHash = await walletClient.sendTransaction({
          to: tokenAddress as `0x${string}`,
          data,
          value: amountInWei,
          gas: 500000n, // Increased gas limit
        });

        console.log("✅ Buy transaction submitted:", txHash);

        // Record trade in backend for statistics
        try {
          await fetch("/api/trading/record-trade", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              agentAddress: tokenAddress,
              transactionHash: txHash,
              trader: walletClient.account.address,
              type: "buy",
              coreAmount: coreAmount,
              tokenAmount: formatEther(tokenAmount),
              price: parseFloat(formatEther(amountInWei)) / parseFloat(formatEther(tokenAmount)),
              timestamp: new Date().toISOString(),
            }),
          });
          console.log("✅ Trade recorded in backend for statistics");
        } catch (recordError) {
          console.warn("⚠️ Failed to record trade in backend:", recordError);
          // Don't throw error, trade was successful
        }

        if (onSuccess) {
          onSuccess(txHash);
        }

        return { hash: txHash };
      } catch (error) {
        console.error("❌ Buy transaction failed:", error);
        setCreateError(error as Error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [walletClient, publicClient]
  );

  // Sell tokens function - calls sellTokens() on AgentToken contract
  const sellTokens = useCallback(
    async (tokenAddress: string, tokenAmount: string, onSuccess?: (txHash: string) => void) => {
      if (!walletClient) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      setIsCreating(true);
      setCreateError(null);

      try {
        console.log("💸 Selling tokens:", {
          tokenAddress,
          tokenAmount,
        });

        const amountInWei = parseEther(tokenAmount);
        console.log("💸 Amount in wei:", amountInWei.toString());

        // Backend precheck to avoid reverted on-chain call for graduated tokens
        try {
          await apiService.getSaleQuote(tokenAddress, tokenAmount);
        } catch (precheckError) {
          const em = precheckError instanceof Error ? precheckError.message.toLowerCase() : String(precheckError).toLowerCase();
          if (em.includes("graduated_token") || em.includes("graduated")) {
            throw new Error("GRADUATED_TOKEN");
          }
        }

        // Get sell quote and calculate minimum CORE out (with 2% slippage tolerance)
        const sellQuote = (await publicClient?.readContract({
          address: tokenAddress as `0x${string}`,
          abi: AGENT_TOKEN_ABI,
          functionName: "getSellQuote",
          args: [amountInWei],
        })) as [bigint, bigint, bigint, bigint];

        const coreAmount = sellQuote[0]; // First return value is coreAmount
        const minCoreOut = (coreAmount * 98n) / 100n; // 2% slippage tolerance

        console.log("💰 Expected CORE:", formatEther(coreAmount));
        console.log("💰 Minimum CORE (with slippage):", formatEther(minCoreOut));

        // Encode sellTokens function call with token amount only
        const data = encodeFunctionData({
          abi: AGENT_TOKEN_ABI,
          functionName: "sellTokens",
          args: [amountInWei],
        });

        // Send transaction directly to AgentToken contract
        const txHash = await walletClient.sendTransaction({
          to: tokenAddress as `0x${string}`,
          data,
          gas: 300000n,
        });

        console.log("✅ Sell transaction submitted:", txHash);

        // Record trade in backend for statistics
        try {
          await fetch("/api/trading/record-trade", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              agentAddress: tokenAddress,
              transactionHash: txHash,
              trader: walletClient.account.address,
              type: "sell",
              coreAmount: formatEther(coreAmount),
              tokenAmount: tokenAmount,
              price: parseFloat(formatEther(coreAmount)) / parseFloat(tokenAmount),
              timestamp: new Date().toISOString(),
            }),
          });
          console.log("✅ Trade recorded in backend for statistics");
        } catch (recordError) {
          console.warn("⚠️ Failed to record trade in backend:", recordError);
          // Don't throw error, trade was successful
        }

        if (onSuccess) {
          onSuccess(txHash);
        }

        return { hash: txHash };
      } catch (error) {
        console.error("❌ Sell transaction failed:", error);
        setCreateError(error as Error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [walletClient, publicClient]
  );

  // Get detailed agent information
  const getAgentDetails = useCallback(
    async (tokenAddress: string) => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        // Get basic token information
        const [name, symbol, totalSupply, currentPrice, marketCap, userBalance] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: AGENT_TOKEN_ABI,
            functionName: "name",
          }),
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: AGENT_TOKEN_ABI,
            functionName: "symbol",
          }),
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: AGENT_TOKEN_ABI,
            functionName: "totalSupply",
          }),
          publicClient
            .readContract({
              address: tokenAddress as `0x${string}`,
              abi: AGENT_TOKEN_ABI,
              functionName: "getCurrentPrice",
            })
            .catch(() => BigInt(0)),
          publicClient
            .readContract({
              address: tokenAddress as `0x${string}`,
              abi: AGENT_TOKEN_ABI,
              functionName: "getMarketCap",
            })
            .catch(() => BigInt(0)),
          walletClient?.account
            ? publicClient
                .readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: AGENT_TOKEN_ABI,
                  functionName: "balanceOf",
                  args: [walletClient.account.address],
                })
                .catch(() => BigInt(0))
            : Promise.resolve(BigInt(0)),
        ]);

        return {
          contractAddress: tokenAddress,
          name: name as string,
          symbol: symbol as string,
          totalSupply: (totalSupply as bigint).toString(),
          currentPrice: formatEther(currentPrice as bigint),
          marketCap: formatEther(marketCap as bigint),
          userBalance: formatEther(userBalance as bigint),
          // Additional fields that would come from other sources
          description: "",
          instructions: "",
          model: "",
          category: "",
          creator: "",
          createdAt: new Date().toISOString(),
          isVerified: false,
          volume24h: "0",
          priceChange24h: "0",
          holders: 0,
        };
      } catch (error) {
        console.error("Error fetching agent details:", error);
        throw error;
      }
    },
    [publicClient, walletClient]
  );

  // Get buy/sell quotes
  const getQuote = useCallback(
    async (tokenAddress: string, amount: string, isBuy: boolean) => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const amountInWei = parseEther(amount);

        // Note: Graduation check removed - now handled in TradingInterface with DEX support

        if (isBuy) {
          const quote = (await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: AGENT_TOKEN_ABI,
            functionName: "getBuyQuote",
            args: [amountInWei],
          })) as [bigint, bigint, bigint, bigint];

          const [tokenAmount, , , priceImpact] = quote;

          return {
            inputAmount: amount,
            outputAmount: formatEther(tokenAmount),
            priceImpact: Number(priceImpact) / 10000, // Convert from basis points to percentage
            slippage: 2, // 2% default slippage
            minimumReceived: formatEther((tokenAmount * 98n) / 100n),
          };
        } else {
          const quote = (await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: AGENT_TOKEN_ABI,
            functionName: "getSellQuote",
            args: [amountInWei],
          })) as [bigint, bigint, bigint, bigint];

          const [coreAmount, , , priceImpact] = quote;

          return {
            inputAmount: amount,
            outputAmount: formatEther(coreAmount),
            priceImpact: Number(priceImpact) / 10000, // Convert from basis points to percentage
            slippage: 2, // 2% default slippage
            minimumReceived: formatEther((coreAmount * 98n) / 100n),
          };
        }
      } catch (error) {
        console.error("Error getting quote:", error);
        throw error;
      }
    },
    [publicClient]
  );

  return {
    // Contract data
    creationFee: creationFee ? formatEther(creationFee) : "0",
    totalAgents: totalAgents ? Number(totalAgents) : 0,

    // Loading states
    isLoadingFee,
    isLoadingTotal,
    isCreating,

    // Actions
    createAgentToken,
    buyTokens,
    sellTokens,
    getAllAgents,
    getTrendingAgents,
    getAgentsByCreator,
    getAgentDetails,
    getQuote,

    // Errors
    createError,

    // Contract info
    contractAddress,
  };
};
