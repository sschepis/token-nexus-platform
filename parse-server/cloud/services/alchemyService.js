const { Alchemy, Network } = require('alchemy-sdk');
const ethers = require('ethers');

class AlchemyService {
  constructor() {
    this.alchemyInstances = new Map();
    this.usageCache = new Map();
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerMinute = 100; // Per org limit
  }

  /**
   * Get or create Alchemy instance for a network
   */
  getAlchemyInstance(networkId) {
    if (this.alchemyInstances.has(networkId)) {
      return this.alchemyInstances.get(networkId);
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error('Alchemy API key not configured');
    }

    const networkMap = {
      'mainnet': Network.ETH_MAINNET,
      'sepolia': Network.ETH_SEPOLIA,
      'polygon': Network.MATIC_MAINNET,
      'mumbai': Network.MATIC_MUMBAI,
      'arbitrum': Network.ARB_MAINNET,
      'optimism': Network.OPT_MAINNET,
      'basesep': Network.BASE_SEPOLIA,
      'base': Network.BASE_MAINNET,
    };

    const network = networkMap[networkId];
    if (!network) {
      throw new Error(`Unsupported network: ${networkId}`);
    }

    const settings = {
      apiKey,
      network,
    };

    const alchemy = new Alchemy(settings);
    this.alchemyInstances.set(networkId, alchemy);
    
    return alchemy;
  }

  /**
   * Check rate limit for organization
   */
  async checkRateLimit(orgId) {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    // Get usage from cache
    const usage = this.usageCache.get(orgId) || [];
    
    // Filter to current window
    const currentWindowUsage = usage.filter(timestamp => timestamp > windowStart);
    
    if (currentWindowUsage.length >= this.maxRequestsPerMinute) {
      throw new Error(`Rate limit exceeded. Maximum ${this.maxRequestsPerMinute} requests per minute.`);
    }
    
    // Update cache
    currentWindowUsage.push(now);
    this.usageCache.set(orgId, currentWindowUsage);
    
    // Also track in database for billing
    await this.trackUsage(orgId);
  }

  /**
   * Track usage in database
   */
  async trackUsage(orgId, networkId) {
    try {
      const AlchemyUsage = Parse.Object.extend('AlchemyUsage');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find or create today's usage record
      const query = new Parse.Query(AlchemyUsage);
      query.equalTo('orgId', orgId);
      query.equalTo('usageDate', today);
      
      let usageRecord = await query.first({ useMasterKey: true });
      
      if (!usageRecord) {
        usageRecord = new AlchemyUsage();
        usageRecord.set('orgId', orgId);
        usageRecord.set('usageDate', today);
        usageRecord.set('requests', 0);
        usageRecord.set('breakdown', {});
      }
      
      // Increment usage
      usageRecord.increment('requests');
      
      // Update network breakdown
      const breakdown = usageRecord.get('breakdown') || {};
      breakdown[networkId] = (breakdown[networkId] || 0) + 1;
      usageRecord.set('breakdown', breakdown);
      
      await usageRecord.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - tracking shouldn't break the main operation
    }
  }

  /**
   * Read contract data
   */
  async readContract(orgId, networkId, contractAddress, methodName, methodAbi, params) {
    // Check rate limit
    await this.checkRateLimit(orgId);
    
    try {
      const alchemy = this.getAlchemyInstance(networkId);
      const provider = await alchemy.config.getProvider();
      
      // Create contract interface
      const iface = new ethers.utils.Interface([methodAbi]);
      
      // Encode the function call
      const data = iface.encodeFunctionData(methodName, params);
      
      // Make the call
      const result = await provider.call({
        to: contractAddress,
        data: data,
      });
      
      // Decode the result
      const decoded = iface.decodeFunctionResult(methodName, result);
      
      // Track usage
      await this.trackUsage(orgId, networkId);
      
      // Return formatted result
      if (decoded.length === 1) {
        return this.formatValue(decoded[0]);
      } else {
        return decoded.map(v => this.formatValue(v));
      }
    } catch (error) {
      console.error('Error reading contract:', error);
      throw new Error(`Contract read failed: ${error.message}`);
    }
  }

  /**
   * Format return values for client consumption
   */
  formatValue(value) {
    if (ethers.BigNumber.isBigNumber(value)) {
      // Convert BigNumber to string
      return value.toString();
    } else if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v));
    } else if (typeof value === 'object' && value !== null) {
      const formatted = {};
      for (const key in value) {
        formatted[key] = this.formatValue(value[key]);
      }
      return formatted;
    }
    return value;
  }

  /**
   * Get current gas prices
   */
  async getGasPrice(networkId) {
    try {
      const alchemy = this.getAlchemyInstance(networkId);
      const provider = await alchemy.config.getProvider();
      const gasPrice = await provider.getGasPrice();
      
      return {
        standard: ethers.utils.formatUnits(gasPrice, 'gwei'),
        fast: ethers.utils.formatUnits(gasPrice.mul(125).div(100), 'gwei'), // 25% higher
        instant: ethers.utils.formatUnits(gasPrice.mul(150).div(100), 'gwei'), // 50% higher
      };
    } catch (error) {
      console.error('Error getting gas price:', error);
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(networkId, from, to, data) {
    try {
      const alchemy = this.getAlchemyInstance(networkId);
      const provider = await alchemy.config.getProvider();
      
      const gasEstimate = await provider.estimateGas({
        from,
        to,
        data,
      });
      
      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Get usage statistics for an organization
   */
  async getUsageStats(orgId, startDate, endDate) {
    try {
      const AlchemyUsage = Parse.Object.extend('AlchemyUsage');
      const query = new Parse.Query(AlchemyUsage);
      
      query.equalTo('orgId', orgId);
      
      if (startDate) {
        query.greaterThanOrEqualTo('usageDate', new Date(startDate));
      }
      
      if (endDate) {
        query.lessThanOrEqualTo('usageDate', new Date(endDate));
      }
      
      query.ascending('usageDate');
      query.limit(1000);
      
      const records = await query.find({ useMasterKey: true });
      
      // Calculate totals
      let totalRequests = 0;
      const networkBreakdown = {};
      const dailyUsage = [];
      
      records.forEach(record => {
        const requests = record.get('requests');
        totalRequests += requests;
        
        const breakdown = record.get('breakdown') || {};
        for (const network in breakdown) {
          networkBreakdown[network] = (networkBreakdown[network] || 0) + breakdown[network];
        }
        
        dailyUsage.push({
          date: record.get('usageDate'),
          requests: requests,
          breakdown: breakdown,
        });
      });
      
      return {
        totalRequests,
        networkBreakdown,
        dailyUsage,
        rateLimitPerMinute: this.maxRequestsPerMinute,
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Check if organization has exceeded usage limits
   */
  async checkUsageLimits(orgId) {
    try {
      // Get organization settings
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      const org = await orgQuery.get(orgId, { useMasterKey: true });
      
      const monthlyLimit = org.get('alchemyMonthlyLimit') || 100000; // Default 100k requests
      
      // Get current month usage
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const stats = await this.getUsageStats(orgId, startOfMonth, now);
      
      if (stats.totalRequests >= monthlyLimit) {
        throw new Error(`Monthly usage limit exceeded (${stats.totalRequests}/${monthlyLimit} requests)`);
      }
      
      return {
        used: stats.totalRequests,
        limit: monthlyLimit,
        remaining: monthlyLimit - stats.totalRequests,
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      throw error;
    }
  }
}

module.exports = AlchemyService;