const express = require('express');
const { ethers } = require('ethers');
const BlockchainServiceClass = require('../services/BlockchainService');
const router = express.Router();

// Create singleton instance
const BlockchainService = new BlockchainServiceClass();

// GET /api/blockchain/network-status - Get network status (replaces direct RPC calls)
router.get('/network-status', async (req, res) => {
  try {
    console.log('🔍 Fetching network status via backend...');

    // Get network data from blockchain service
    const networkData = await BlockchainService.getNetworkStatus();

    res.json({
      success: true,
      data: {
        blockNumber: networkData.blockNumber.toString(),
        gasPrice: networkData.gasPrice.toString(),
        isHealthy: networkData.isHealthy,
        chainId: networkData.chainId,
        networkName: networkData.networkName,
        lastChecked: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching network status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network status',
      data: {
        blockNumber: '0',
        gasPrice: '0',
        isHealthy: false,
        chainId: 1115,
        networkName: 'Core Testnet',
        lastChecked: new Date().toISOString()
      }
    });
  }
});

// GET /api/blockchain/transaction/:hash - Get transaction status
router.get('/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || !hash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }

    console.log(`🔍 Checking transaction status: ${hash}`);

    const receipt = await BlockchainService.getTransactionReceipt(hash);

    res.json({
      success: true,
      receipt: receipt
    });
  } catch (error) {
    console.error('❌ Error fetching transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction status'
    });
  }
});

// POST /api/blockchain/estimate-gas - Estimate gas for transaction
router.post('/estimate-gas', async (req, res) => {
  try {
    const { from, to, data, value } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required fields: from, to' });
    }

    console.log(`⛽ Estimating gas for transaction: ${from} -> ${to}`);

    const gasEstimate = await BlockchainService.estimateGas(from, to, data, value);

    res.json({
      success: true,
      gasEstimate: gasEstimate.toString()
    });
  } catch (error) {
    console.error('❌ Error estimating gas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate gas',
      gasEstimate: '200000' // Fallback
    });
  }
});

// GET /api/blockchain/gas-price - Get current gas price
router.get('/gas-price', async (req, res) => {
  try {
    console.log('⛽ Fetching current gas price...');

    const gasPrice = await BlockchainService.getGasPrice();

    res.json({
      success: true,
      gasPrice: gasPrice.toString()
    });
  } catch (error) {
    console.error('❌ Error fetching gas price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gas price',
      gasPrice: '1000000000' // 1 gwei fallback
    });
  }
});

// GET /api/blockchain/stats - Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await BlockchainService.getPlatformStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

// GET /api/blockchain/agents/:address/balance/:userAddress - Get user's token balance
router.get('/agents/:address/balance/:userAddress', async (req, res) => {
  try {
    const { address, userAddress } = req.params;
    
    if (!ethers.isAddress(address) || !ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const balance = await BlockchainService.getUserBalance(address, userAddress);
    
    res.json({
      agentAddress: address,
      userAddress,
      balance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Failed to fetch user balance' });
  }
});

// GET /api/blockchain/agents/:address/purchase-quote/:amount - Get purchase quote
router.get('/agents/:address/purchase-quote/:amount', async (req, res) => {
  try {
    const { address, amount } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid agent address' });
    }

    const coreAmount = parseFloat(amount);
    if (isNaN(coreAmount) || coreAmount <= 0) {
      return res.status(400).json({ error: 'Invalid CORE amount' });
    }

    const tokensReceived = await BlockchainService.calculatePurchaseReturn(address, amount);
    const agent = await BlockchainService.getAgentDetails(address);
    
    res.json({
      agentAddress: address,
      agentName: agent.tokenName,
      agentSymbol: agent.tokenSymbol,
      coreAmount: amount,
      tokensReceived,
      currentPrice: agent.currentPrice,
      pricePerToken: coreAmount / parseFloat(tokensReceived),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating purchase quote:', error);
    res.status(500).json({ error: 'Failed to calculate purchase quote' });
  }
});

// GET /api/blockchain/agents/:address/sale-quote/:amount - Get sale quote
router.get('/agents/:address/sale-quote/:amount', async (req, res) => {
  try {
    const { address, amount } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid agent address' });
    }

    const tokenAmount = parseFloat(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    const coreReceived = await BlockchainService.calculateSaleReturn(address, amount);
    const agent = await BlockchainService.getAgentDetails(address);
    
    res.json({
      agentAddress: address,
      agentName: agent.tokenName,
      agentSymbol: agent.tokenSymbol,
      tokenAmount: amount,
      coreReceived,
      currentPrice: agent.currentPrice,
      pricePerToken: parseFloat(coreReceived) / tokenAmount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating sale quote:', error);
    res.status(500).json({ error: 'Failed to calculate sale quote' });
  }
});

// GET /api/blockchain/creation-fee - Get current creation fee
router.get('/creation-fee', async (req, res) => {
  try {
    const fee = await BlockchainService.getCreationFee();
    
    res.json({
      creationFee: fee,
      currency: 'CORE',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching creation fee:', error);
    res.status(500).json({ error: 'Failed to fetch creation fee' });
  }
});

// GET /api/blockchain/network-info - Get network information
router.get('/network-info', async (req, res) => {
  try {
    const provider = BlockchainService.provider;
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();
    
    res.json({
      network: {
        name: 'Core DAO Testnet',
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: {
          gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : null,
          maxFeePerGas: gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') : null,
          maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') : null
        }
      },
      contracts: {
        agentFactory: BlockchainService.AGENT_FACTORY_ADDRESS
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching network info:', error);
    res.status(500).json({ error: 'Failed to fetch network information' });
  }
});

// POST /api/blockchain/validate-transaction - Validate transaction before sending
router.post('/validate-transaction', async (req, res) => {
  try {
    const { to, value, data, from } = req.body;
    
    if (!ethers.isAddress(to)) {
      return res.status(400).json({ error: 'Invalid recipient address' });
    }

    if (from && !ethers.isAddress(from)) {
      return res.status(400).json({ error: 'Invalid sender address' });
    }

    // Basic validation
    const validation = {
      isValid: true,
      warnings: [],
      estimatedGas: null,
      estimatedCost: null
    };

    // Check if recipient is a contract
    const code = await BlockchainService.provider.getCode(to);
    if (code === '0x') {
      validation.warnings.push('Recipient is not a contract address');
    }

    // Estimate gas if data is provided
    if (data && from) {
      try {
        const gasEstimate = await BlockchainService.provider.estimateGas({
          to,
          value: value || 0,
          data,
          from
        });
        validation.estimatedGas = gasEstimate.toString();
        
        const gasPrice = await BlockchainService.provider.getFeeData();
        if (gasPrice.gasPrice) {
          const estimatedCost = gasEstimate * gasPrice.gasPrice;
          validation.estimatedCost = ethers.formatEther(estimatedCost);
        }
      } catch (gasError) {
        validation.isValid = false;
        validation.warnings.push('Transaction may fail: ' + gasError.message);
      }
    }

    res.json(validation);
  } catch (error) {
    console.error('Error validating transaction:', error);
    res.status(500).json({ error: 'Failed to validate transaction' });
  }
});

// GET /api/blockchain/agents/:address/events - Get agent events (simplified)
router.get('/agents/:address/events', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid agent address' });
    }

    // In a production environment, you would query event logs
    // For now, return mock data structure
    const events = {
      events: [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: 0
      },
      timestamp: new Date().toISOString()
    };

    res.json(events);
  } catch (error) {
    console.error('Error fetching agent events:', error);
    res.status(500).json({ error: 'Failed to fetch agent events' });
  }
});

// Get agent address from transaction hash (robust)
router.get('/transaction/:txHash/agent', async (req, res) => {
  try {
    const { txHash } = req.params;

    console.log('🔍 Looking up agent address for transaction:', txHash);

    // Get transaction receipt
    const receipt = await BlockchainService.provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return res.status(404).json({ success: false, error: 'TRANSACTION_NOT_FOUND' });
    }

    // Handle reverted transaction explicitly
    const statusNum = typeof receipt.status === 'number' ? receipt.status : Number(receipt.status);
    if (statusNum === 0) {
      return res.status(409).json({
        success: false,
        error: 'TRANSACTION_REVERTED',
        receipt
      });
    }

    console.log('📄 Transaction receipt found:', receipt.hash);

    // Attempt to find AgentCreated event in receipt logs first
    const ifaceLong = new ethers.Interface([
      'event AgentCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, string description, string category)'
    ]);
    const ifaceShort = new ethers.Interface([
      'event AgentCreated(address indexed tokenAddress, address indexed creator, string name, string symbol)'
    ]);

    const topicLong = ifaceLong.getEvent('AgentCreated').topicHash;
    const topicShort = ifaceShort.getEvent('AgentCreated').topicHash;

    let matchedLog = null;
    for (const log of receipt.logs) {
      if (!log?.topics || log.topics.length === 0) continue;
      const t0 = log.topics[0];
      if (t0 === topicLong || t0 === topicShort) {
        matchedLog = log;
        break;
      }
    }

    // Fallback: query logs around the block range for both signatures and match txHash
    if (!matchedLog) {
      try {
        const fromBlock = Math.max(0, Number(receipt.blockNumber) - 5);
        const toBlock = Number(receipt.blockNumber) + 5;
        const logs = await BlockchainService.provider.getLogs({
          address: BlockchainService.AGENT_FACTORY_ADDRESS,
          fromBlock,
          toBlock,
          topics: [[topicLong, topicShort]]
        });
        const found = logs.find(l => l.transactionHash?.toLowerCase() === txHash.toLowerCase());
        if (found) matchedLog = found;
      } catch (e) {
        console.warn('⚠️ getLogs fallback failed:', (e && e.message) || e);
      }
    }

    if (!matchedLog) {
      return res.status(404).json({ success: false, error: 'AGENT_CREATED_EVENT_NOT_FOUND' });
    }

    // Decode matched log by signature
    let decoded;
    try {
      decoded = ifaceLong.parseLog(matchedLog);
    } catch (_) {
      decoded = ifaceShort.parseLog(matchedLog);
    }

    const agentAddress = decoded.args.tokenAddress;
    const creator = decoded.args.creator;
    const name = decoded.args.name;
    const symbol = decoded.args.symbol;
    const description = decoded.args.description || null;
    const category = decoded.args.category || null;

    console.log('🎯 Found agent address:', agentAddress);

    res.json({
      success: true,
      data: {
        transactionHash: txHash,
        agentAddress,
        creator,
        name,
        symbol,
        description,
        category
      }
    });

  } catch (error) {
    console.error('❌ Error getting agent address from transaction:', error);
    res.status(500).json({
      success: false,
      error: 'FAILED_TO_GET_AGENT_FROM_TRANSACTION',
      details: error.message
    });
  }
});

module.exports = router;
