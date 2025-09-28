import { defineChain } from 'viem'

// Core DAO Testnet Configuration
export const coreTestnet = defineChain({
  id: 1114,
  name: 'Core Testnet',
  network: 'core-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'tCORE2',
    symbol: 'tCORE2',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test2.btcs.network'],
    },
    public: {
      http: ['https://rpc.test2.btcs.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Scan',
      url: 'https://scan.test2.btcs.network',
    },
  },
  testnet: true,
})

// Core DAO Mainnet Configuration
export const coreMainnet = defineChain({
  id: 1116,
  name: 'Core',
  network: 'core',
  nativeCurrency: {
    decimals: 18,
    name: 'CORE',
    symbol: 'CORE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.coredao.org'],
    },
    public: {
      http: ['https://rpc.coredao.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Core Scan',
      url: 'https://scan.coredao.org',
    },
  },
})

// Contract Addresses for Core Testnet
export const CORE_TESTNET_CONTRACTS = {
  // Core ecosystem precompiled contracts
  VALIDATOR_SET: '0x0000000000000000000000000000000000001000',
  SLASH_INDICATOR: '0x0000000000000000000000000000000000001001',
  SYSTEM_REWARD: '0x0000000000000000000000000000000000001002',
  BTC_LIGHT_CLIENT: '0x0000000000000000000000000000000000001003',
  RELAYER_HUB: '0x0000000000000000000000000000000000001004',
  CANDIDATE_HUB: '0x0000000000000000000000000000000000001005',
  GOV_HUB: '0x0000000000000000000000000000000000001006',
  PLEDGE_AGENT: '0x0000000000000000000000000000000000001007',
  BURN: '0x0000000000000000000000000000000000001008',
  FOUNDATION: '0x0000000000000000000000000000000000001009',
  STAKE_HUB: '0x0000000000000000000000000000000000001010',
  CORE_AGENT: '0x0000000000000000000000000000000000001011',
  HASH_AGENT: '0x0000000000000000000000000000000000001012',
  BTC_AGENT: '0x0000000000000000000000000000000000001013',
  BTC_STAKE: '0x0000000000000000000000000000000000001014',
  BTCLST_STAKE: '0x0000000000000000000000000000000000001015',
  BTCLST_TOKEN: '0x0000000000000000000000000000000000010001',

  // URSUS Platform Contracts (to be deployed)
  AGENT_FACTORY: '', // Will be set after deployment
  TOKEN_FACTORY: '', // Will be set after deployment
  BONDING_CURVE: '', // Will be set after deployment
  PLATFORM_TREASURY: '', // Will be set after deployment
} as const

// Contract Addresses for Core Mainnet
export const CORE_MAINNET_CONTRACTS = {
  // Core ecosystem precompiled contracts (same addresses)
  ...CORE_TESTNET_CONTRACTS,

  // URSUS Platform Contracts (to be deployed)
  AGENT_FACTORY: '', // Will be set after deployment
  TOKEN_FACTORY: '', // Will be set after deployment
  BONDING_CURVE: '', // Will be set after deployment
  PLATFORM_TREASURY: '', // Will be set after deployment
} as const

// Platform Configuration
export const PLATFORM_CONFIG = {
  PLATFORM_FEE_FIXED: '0.01', // Fixed fee in CORE for agent creation
  PLATFORM_FEE_PERCENTAGE: 250, // 2.5% in basis points (for trading fees)
  CREATOR_ROYALTY_PERCENTAGE: 500, // 5% in basis points
  LIQUIDITY_POOL_PERCENTAGE: 9250, // 92.5% in basis points
  MIN_TOKEN_SUPPLY: 1_000_000,
  MAX_TOKEN_SUPPLY: 1_000_000_000,
  INITIAL_TOKEN_PRICE: '0.001', // in CORE
  BONDING_CURVE_RESERVE_RATIO: 500000, // 50% in PPM (parts per million)
} as const

// Supported Networks
export const SUPPORTED_CHAINS = [coreTestnet, coreMainnet] as const

// Default chain for development
export const DEFAULT_CHAIN = coreTestnet

// SushiSwap configuration (real API + router addresses)
export const SUSHI_CONFIG = {
  API_BASE: 'https://api.sushi.com',
  NATIVE_PLACEHOLDER: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  CORE_MAINNET: {
    CHAIN_ID: 1116,
    ROUTER_V2: '0x9b3336186a38e1b6c21955d112dbb0343ee061ee',
  },
  // Note: If Core Testnet is supported by Sushi later, add ROUTER_V2 here
  CORE_TESTNET: {
    CHAIN_ID: 1114,
    ROUTER_V2: ''
  }
} as const

