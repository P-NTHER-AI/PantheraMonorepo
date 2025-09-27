const mongoose = require('mongoose');
const { ethers } = require('ethers');
const Agent = require('../models/Agent');
const Trade = require('../models/Trade');
const BlockchainDataService = require('../services/BlockchainDataService');
const RealDataCalculator = require('../services/RealDataCalculator');
const WebSocketService = require('../services/WebSocketService');

// Environment configuration
require('dotenv').config();

class AgentUpdater {
  constructor() {
    this.provider = null;
    this.blockchainService = null;
    this.websocketService = null;
    this.isConnected = false;
  }

  // Initialize connections
  async initialize() {
    try {
      console.log('🔧 Initializing Agent Updater...');

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ursus', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ MongoDB connected');

      // Initialize blockchain service
      this.blockchainService = new BlockchainDataService();
      console.log('✅ Blockchain service initialized');

      // Initialize WebSocket service for real-time updates (optional)
      try {
        this.websocketService = new WebSocketService();
        console.log('✅ WebSocket service initialized');
      } catch (error) {
        console.log('⚠️ WebSocket service not available (running standalone)');
        this.websocketService = null;
      }

      this.isConnected = true;
      console.log('🚀 Agent Updater ready');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  // Update single agent with real blockchain data
  async updateAgent(agentAddress) {
    if (!this.isConnected) {
      throw new Error('Agent Updater not initialized');
    }

    try {
      console.log(`🔄 Updating agent: ${agentAddress}`);

      // Validate Ethereum address
      if (!ethers.isAddress(agentAddress)) {
        throw new Error(`Invalid Ethereum address: ${agentAddress}`);
      }

      // Check if agent exists in database
      const agent = await Agent.findOne({
        contractAddress: agentAddress.toLowerCase()
      });

      if (!agent) {
        console.log(`❌ Agent not found in database: ${agentAddress}`);
        return { success: false, error: 'Agent not found' };
      }

      console.log(`📊 Found agent: ${agent.name} (${agent.symbol})`);

      // Try blockchain data first, fallback to calculated stats
      let updateResult;

      try {
        console.log('🔗 Attempting blockchain data update...');
        updateResult = await this.blockchainService.updateAgentWithRealData(agentAddress);

        if (updateResult.success) {
          console.log('✅ Blockchain data update successful');
        } else {
          throw new Error(updateResult.error);
        }
      } catch (blockchainError) {
        console.log(`⚠️ Blockchain update failed: ${blockchainError.message}`);
        console.log('🔄 Falling back to calculated stats...');

        updateResult = await RealDataCalculator.updateAgentWithRealStats(agentAddress);

        if (updateResult.success) {
          console.log('✅ Calculated stats update successful');
        } else {
          throw new Error(`Both blockchain and calculated updates failed: ${updateResult.error}`);
        }
      }

      // Get updated agent data
      const updatedAgent = await Agent.findOne({
        contractAddress: agentAddress.toLowerCase()
      });

      // Broadcast real-time update via WebSocket
      if (this.websocketService && updatedAgent) {
        const updatePayload = {
          type: 'agentStatsUpdate',
          agentAddress: agentAddress.toLowerCase(),
          stats: {
            currentPrice: updatedAgent.tokenomics.currentPrice,
            marketCap: updatedAgent.tokenomics.marketCap,
            volume24h: updatedAgent.metrics.volume24h,
            priceChange24h: updatedAgent.metrics.priceChange24h,
            holders: updatedAgent.metrics.holders,
            totalTransactions: updatedAgent.metrics.totalTransactions,
            allTimeHigh: updatedAgent.metrics.allTimeHigh,
            allTimeLow: updatedAgent.metrics.allTimeLow,
            lastUpdate: new Date().toISOString()
          },
          timestamp: Date.now()
        };

        this.websocketService.broadcast(updatePayload);
        console.log('📡 Real-time update broadcasted');
      }

      // Display update summary
      this.displayUpdateSummary(updatedAgent);

      return {
        success: true,
        data: {
          agentAddress: agentAddress.toLowerCase(),
          name: updatedAgent.name,
          symbol: updatedAgent.symbol,
          currentPrice: updatedAgent.tokenomics.currentPrice,
          marketCap: updatedAgent.tokenomics.marketCap,
          volume24h: updatedAgent.metrics.volume24h,
          priceChange24h: updatedAgent.metrics.priceChange24h,
          holders: updatedAgent.metrics.holders,
          totalTransactions: updatedAgent.metrics.totalTransactions,
          lastUpdate: updatedAgent.lastPriceUpdate
        }
      };

    } catch (error) {
      console.error(`❌ Error updating agent ${agentAddress}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Update all active agents
  async updateAllAgents() {
    try {
      console.log('🔄 Starting bulk agent update...');

      // Get all active agents
      const agents = await Agent.find({
        isActive: true
      }).select('contractAddress name symbol');

      if (agents.length === 0) {
        console.log('⚠️ No active agents found');
        return { success: true, updated: 0, failed: 0 };
      }

      console.log(`📊 Found ${agents.length} active agents to update`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Update agents in parallel (with concurrency limit)
      const concurrencyLimit = 3;
      for (let i = 0; i < agents.length; i += concurrencyLimit) {
        const batch = agents.slice(i, i + concurrencyLimit);

        const batchPromises = batch.map(async (agent) => {
          const result = await this.updateAgent(agent.contractAddress);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
          return result;
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to avoid overwhelming the blockchain
        if (i + concurrencyLimit < agents.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Bulk update complete: ${successCount} successful, ${failureCount} failed`);

      return {
        success: true,
        updated: successCount,
        failed: failureCount,
        results: results
      };

    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      return { success: false, error: error.message };
    }
  }

  // Update specific agent by address with trade data analysis
  async updateAgentWithTradeAnalysis(agentAddress) {
    try {
      console.log(`📊 Performing trade analysis for: ${agentAddress}`);

      // Get all trades for this agent
      const trades = await Trade.find({
        agentAddress: agentAddress.toLowerCase()
      }).sort({ timestamp: -1 });

      if (trades.length === 0) {
        console.log(`⚠️ No trades found for ${agentAddress}`);
        return await this.updateAgent(agentAddress);
      }

      console.log(`📈 Found ${trades.length} trades for analysis`);

      // Perform detailed trade analysis
      const analysis = this.analyzeTradeData(trades);

      // Update agent with blockchain data
      const updateResult = await this.updateAgent(agentAddress);

      if (!updateResult.success) {
        return updateResult;
      }

      // Add trade analysis to the result
      updateResult.data.tradeAnalysis = analysis;

      console.log('📊 Trade analysis completed');
      this.displayTradeAnalysis(analysis);

      return updateResult;

    } catch (error) {
      console.error(`❌ Error in trade analysis for ${agentAddress}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Analyze trade data for insights
  analyzeTradeData(trades) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter trades by time periods
    const trades24h = trades.filter(t => new Date(t.timestamp) >= oneDayAgo);
    const trades7d = trades.filter(t => new Date(t.timestamp) >= oneWeekAgo);

    // Calculate metrics
    const totalVolume = trades.reduce((sum, t) => sum + parseFloat(t.coreAmount || 0), 0);
    const volume24h = trades24h.reduce((sum, t) => sum + parseFloat(t.coreAmount || 0), 0);
    const volume7d = trades7d.reduce((sum, t) => sum + parseFloat(t.coreAmount || 0), 0);

    const prices = trades.map(t => parseFloat(t.price || 0)).filter(p => p > 0);
    const prices24h = trades24h.map(t => parseFloat(t.price || 0)).filter(p => p > 0);

    const uniqueTraders = new Set(trades.map(t => t.trader || t.userAddress)).size;
    const uniqueTraders24h = new Set(trades24h.map(t => t.trader || t.userAddress)).size;

    // Price analysis
    const currentPrice = prices.length > 0 ? prices[0] : 0;
    const price24hAgo = prices24h.length > 0 ? prices24h[prices24h.length - 1] : currentPrice;
    const priceChange24h = currentPrice - price24hAgo;
    const priceChangePercent24h = price24hAgo > 0 ? (priceChange24h / price24hAgo) * 100 : 0;

    const allTimeHigh = Math.max(...prices, 0);
    const allTimeLow = Math.min(...prices.filter(p => p > 0), currentPrice);

    // Trading patterns
    const buyTrades = trades.filter(t => t.type === 'buy');
    const sellTrades = trades.filter(t => t.type === 'sell');
    const buyVolume = buyTrades.reduce((sum, t) => sum + parseFloat(t.coreAmount || 0), 0);
    const sellVolume = sellTrades.reduce((sum, t) => sum + parseFloat(t.coreAmount || 0), 0);

    return {
      totalTrades: trades.length,
      trades24h: trades24h.length,
      trades7d: trades7d.length,
      totalVolume: totalVolume,
      volume24h: volume24h,
      volume7d: volume7d,
      uniqueTraders: uniqueTraders,
      uniqueTraders24h: uniqueTraders24h,
      currentPrice: currentPrice,
      priceChange24h: priceChange24h,
      priceChangePercent24h: priceChangePercent24h,
      allTimeHigh: allTimeHigh,
      allTimeLow: allTimeLow,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      buyVolume: buyVolume,
      sellVolume: sellVolume,
      buyToSellRatio: sellTrades.length > 0 ? buyTrades.length / sellTrades.length : buyTrades.length,
      avgTradeSize: trades.length > 0 ? totalVolume / trades.length : 0,
      lastTradeTime: trades.length > 0 ? trades[0].timestamp : null
    };
  }

  // Display update summary
  displayUpdateSummary(agent) {
    console.log('\n📊 ===== AGENT UPDATE SUMMARY =====');
    console.log(`🤖 Agent: ${agent.name} (${agent.symbol})`);
    console.log(`📍 Address: ${agent.contractAddress}`);
    console.log(`💰 Current Price: ${agent.tokenomics.currentPrice} CORE`);
    console.log(`📈 Market Cap: ${agent.tokenomics.marketCap} CORE`);
    console.log(`📊 24h Volume: ${agent.metrics.volume24h} CORE`);
    console.log(`📈 24h Change: ${agent.metrics.priceChange24h} CORE`);
    console.log(`🔝 All Time High: ${agent.metrics.allTimeHigh} CORE`);
    console.log(`🔻 All Time Low: ${agent.metrics.allTimeLow} CORE`);
    console.log(`👥 Holders: ${agent.metrics.holders}`);
    console.log(`🔄 Total Transactions: ${agent.metrics.totalTransactions}`);
    console.log(`⏰ Last Update: ${agent.lastPriceUpdate}`);
    console.log('=====================================\n');
  }

  // Display trade analysis
  displayTradeAnalysis(analysis) {
    console.log('\n📈 ===== TRADE ANALYSIS =====');
    console.log(`📊 Total Trades: ${analysis.totalTrades}`);
    console.log(`📅 24h Trades: ${analysis.trades24h}`);
    console.log(`📅 7d Trades: ${analysis.trades7d}`);
    console.log(`💰 Total Volume: ${analysis.totalVolume.toFixed(4)} CORE`);
    console.log(`💰 24h Volume: ${analysis.volume24h.toFixed(4)} CORE`);
    console.log(`💰 7d Volume: ${analysis.volume7d.toFixed(4)} CORE`);
    console.log(`👥 Unique Traders: ${analysis.uniqueTraders}`);
    console.log(`👥 24h Unique Traders: ${analysis.uniqueTraders24h}`);
    console.log(`📈 Price Change 24h: ${analysis.priceChangePercent24h.toFixed(2)}%`);
    console.log(`🟢 Buy Trades: ${analysis.buyTrades} (${analysis.buyVolume.toFixed(4)} CORE)`);
    console.log(`🔴 Sell Trades: ${analysis.sellTrades} (${analysis.sellVolume.toFixed(4)} CORE)`);
    console.log(`⚖️ Buy/Sell Ratio: ${analysis.buyToSellRatio.toFixed(2)}`);
    console.log(`📊 Avg Trade Size: ${analysis.avgTradeSize.toFixed(4)} CORE`);
    console.log(`⏰ Last Trade: ${analysis.lastTradeTime}`);
    console.log('============================\n');
  }

  // Cleanup and disconnect
  async cleanup() {
    try {
      console.log('🧹 Cleaning up connections...');

      if (this.websocketService && typeof this.websocketService.close === 'function') {
        try {
          await this.websocketService.close();
          console.log('✅ WebSocket service closed');
        } catch (error) {
          console.log('⚠️ WebSocket cleanup warning:', error.message);
        }
      }

      await mongoose.disconnect();
      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Force update with retry mechanism
  async forceUpdateWithRetry(agentAddress, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Update attempt ${attempt}/${maxRetries} for ${agentAddress}`);

        const result = await this.updateAgent(agentAddress);

        if (result.success) {
          console.log(`✅ Update successful on attempt ${attempt}`);
          return result;
        } else {
          lastError = new Error(result.error);
          throw lastError;
        }

      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.log(`❌ All ${maxRetries} attempts failed for ${agentAddress}`);
    return { success: false, error: lastError.message };
  }
}

// CLI Interface
async function main() {
  const updater = new AgentUpdater();

  try {
    await updater.initialize();

    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const agentAddress = args[1];

    switch (command) {
      case 'single':
        if (!agentAddress) {
          console.log('❌ Usage: node updateAgent.js single <agentAddress>');
          process.exit(1);
        }
        console.log(`🎯 Updating single agent: ${agentAddress}`);
        const singleResult = await updater.updateAgent(agentAddress);
        console.log('Result:', singleResult);
        break;

      case 'all':
        console.log('🌐 Updating all active agents');
        const allResult = await updater.updateAllAgents();
        console.log('Result:', allResult);
        break;

      case 'analyze':
        if (!agentAddress) {
          console.log('❌ Usage: node updateAgent.js analyze <agentAddress>');
          process.exit(1);
        }
        console.log(`📊 Analyzing agent: ${agentAddress}`);
        const analyzeResult = await updater.updateAgentWithTradeAnalysis(agentAddress);
        console.log('Result:', analyzeResult);
        break;

      case 'force':
        if (!agentAddress) {
          console.log('❌ Usage: node updateAgent.js force <agentAddress>');
          process.exit(1);
        }
        console.log(`💪 Force updating agent: ${agentAddress}`);
        const forceResult = await updater.forceUpdateWithRetry(agentAddress);
        console.log('Result:', forceResult);
        break;

      default:
        console.log('📖 Usage:');
        console.log('  node updateAgent.js single <agentAddress>  - Update single agent');
        console.log('  node updateAgent.js all                    - Update all active agents');
        console.log('  node updateAgent.js analyze <agentAddress> - Analyze agent trades');
        console.log('  node updateAgent.js force <agentAddress>   - Force update with retry');
        console.log('\nExamples:');
        console.log('  node updateAgent.js single 0x36f73a86b59e4e5dc80ad84fbeb2cc3d8e55856d');
        console.log('  node updateAgent.js all');
        console.log('  node updateAgent.js analyze 0x36f73a86b59e4e5dc80ad84fbeb2cc3d8e55856d');
        break;
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await updater.cleanup();
    process.exit(0);
  }
}

// Export for use as module
module.exports = AgentUpdater;

// Run if called directly
if (require.main === module) {
  main();
}
