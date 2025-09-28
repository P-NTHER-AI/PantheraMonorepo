# PΛNTHERΛ AI Agent Platform

*The First AI Agent + Token Launchpad on Algorand*
PΛNTHERΛ is a platform that combines AI agents with tokenized economics, built on the Algorand blockchain.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Smart Contracts](#smart-contracts)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [API Documentation](#api-documentation)
- [Frontend Components](#frontend-components)
- [Blockchain Integration](#blockchain-integration)
- [AI Services](#ai-services)
- [Trading System](#trading-system)
- [WebSocket Services](#websocket-services)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

The vision is simple, PΛNTHERΛ enables users to create, deploy, and interact with AI agents while trading their associated tokens through an bonding curve mechanism:

- *AI Agent Creation*: Deploy custom AI agents with unique personalities, instructions, and capabilities
- *Token Economics*: Each agent has an associated ERC-20 token with bonding curve pricing
- *Real-time Trading*: Buy and sell agent tokens with automatic price discovery
- *Interactive Chat*: Communicate directly with AI agents using multiple AI models
- *Decentralized Governance*: Community-driven platform development on Algorand
- *Real-time Analytics*: Live trading data, price charts, and agent performance metrics

### Key Innovations

1. *Bonding Curve Economics*: Automated market making for agent tokens using mathematical pricing curves
2. *Multi-Model AI Support*: Integration with OpenAI GPT, Anthropic Claude, and Google Gemini
3. *Real-time Synchronization*: WebSocket-based live updates for trading and agent interactions
4. *Cross-Chain Compatibility*: Built on Algorand with potential for multi-chain expansion

5. *Creator Economy*: Revenue sharing between platform, creators, and liquidity providers

## TEAM

<img width="1275" height="719" alt="Ekran Resmi 2025-09-27 21 26 51" src="https://github.com/user-attachments/assets/2b268abc-4fe2-46ed-b344-ccb4b88de092" />

## Architecture

PΛNTHERΛ follows a modern, scalable architecture with clear separation of concerns:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (React/TS)    │◄──►│   (Node.js)     │◄──►│   (Algorand)    │
│                 │    │                 │    │                 │
│ • UI Components │    │ • REST APIs     │    │ • Smart         │
│ • State Mgmt    │    │ • WebSocket     │    │   Contracts     │
│ • Wallet Conn   │    │ • AI Services   │    │ • Event         │
│ • Real-time     │    │ • Database      │    │   Listeners     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Breakdown

- *Frontend*: React-based SPA with TypeScript, Tailwind CSS, and Web3 integration
- *Backend*: Node.js API server with Express, MongoDB, Redis, and WebSocket support
- *Blockchain*: AlgoKit smart contracts deployed on Algorand testnet/mainnet
- *AI Services*: Multi-provider AI integration (OpenAI, Anthropic, Google)
- *Database*: MongoDB for agent metadata, Redis for caching and real-time data

## Features

### Algo Functionality

#### Agent Management

- *Create AI Agents*: Deploy custom agents with unique personalities and instructions
- *Agent Discovery*: Browse and filter agents by category, performance, and popularity
- *Agent Interaction*: Chat with agents using natural language processing
- *Agent Analytics*: Track performance metrics, interaction history, and token economics

#### Token Economics

- *Bonding Curve Pricing*: Automated price discovery based on supply and demand
- *Token Trading*: Buy and sell agent tokens with real-time price updates
- *Liquidity Management*: Automated market making with configurable parameters
- *Fee Distribution*: Platform fees, creator royalties, and liquidity incentives

#### Real-time Features

- *Live Price Updates*: WebSocket-based real-time price feeds
- *Trading Notifications*: Instant alerts for trades, price changes, and agent activity
- *Chat Integration*: Real-time messaging with AI agents
- *Event Streaming*: Live blockchain event processing and broadcasting

### Advanced Features

#### Analytics Dashboard

- *Portfolio Tracking*: Monitor holdings, P&L, and trading history
- *Market Overview*: Platform-wide statistics and trending agents
- *Price Charts*: Interactive candlestick charts with technical indicators
- *Performance Metrics*: Agent-specific analytics and benchmarking

#### Security & Compliance

- *Rate Limiting*: API and interaction rate limiting for abuse prevention
- *Input Sanitization*: Comprehensive input validation and sanitization
- *Wallet Security*: Non-custodial wallet integration with secure transaction signing
- *Smart Contract Auditing*: Comprehensive testing and security reviews

## Technology Stack

### Frontend Technologies

- *React 18*: Modern React with hooks and concurrent features
- *TypeScript*: Type-safe development with enhanced IDE support
- *Vite*: Fast build tool with hot module replacement
- *Tailwind CSS*: Utility-first CSS framework for rapid UI development
- *Wagmi*: React hooks for Algorand wallet integration
- *React Query*: Data fetching and caching library
- *React Router*: Client-side routing for single-page application
- *Lucide React*: Modern icon library with consistent design

### Backend Technologies

- *Node.js*: JavaScript runtime for server-side development
- *Express.js*: Web application framework for REST API development
- *MongoDB*: NoSQL database for flexible data storage
- *Mongoose*: MongoDB object modeling for Node.js
- *Redis*: In-memory data store for caching and real-time features
- *WebSocket (ws)*: Real-time bidirectional communication
- *JWT*: JSON Web Tokens for authentication and authorization
- *Joi*: Schema validation for request/response data

### Blockchain Technologies

- AlgoKit Python: Algorand smart contract development framework
- AlgoKit Utils: Algorand SDK and utilities for blockchain interaction
- Algorand Python Compiler (PuyaPy): Modern smart contract language for AVM
- ARC-4 (ABI): Application Binary Interface standard for Algorand smart contracts
- Algorand LocalNet: Development environment and testing framework
- Algorand AVM: Algorand Virtual Machine for smart contract execution

### AI & External Services

- *OpenAI API*: GPT-4 and GPT-3.5-turbo language models
- *Anthropic API*: Claude-3 advanced reasoning capabilities
- *Google AI API*: Gemini Pro multimodal AI model
- *Rate Limiting*: Intelligent request throttling and queue management

### Development Tools

- *ESLint*: Code linting and style enforcement
- *Prettier*: Code formatting and consistency
- *Jest*: JavaScript testing framework
- *Supertest*: HTTP assertion library for API testing
- *Nodemon*: Development server with automatic restart
- *TypeChain*: TypeScript bindings for smart contracts

## Smart Contracts

### Contract Architecture

The PΛNTHERΛ platform currently consists of one primary smart contract deployed on Algorand:

#### agent_factory.py

The factory contract responsible for creating and managing AI agent tokens.

*Key Features:*

- Agent token deployment with customizable parameters
- Creator registration and agent metadata storage
- Platform fee collection and treasury management
- Agent discovery and enumeration functions
- Access control and administrative functions

### Bonding Curve Mathematics

The platform implements a Bancor-inspired bonding curve formula for price discovery:

*Purchase Formula:*

`tokensReceived = currentSupply * ((1 + AlgorandAmount/reserveBalance)^(reserveRatio/1000000) - 1)`

*Sale Formula:*

`AlgorandReceived = reserveBalance * (1 - (1 - tokenAmount/currentSupply)^(1000000/reserveRatio))`

*Parameters:*

- Reserve Ratio: 50% (500,000 PPM)
- Maximum Supply: 1 billion tokens
- Platform Fee: 2.5%
- Creator Fee: 5%
- Initial Price: 0.001 Algorand

### Contract Deployment

*Algorand Testnet:*

- Network: Algorand Testnet (Chain ID: 1114)
- Explorer: [https://lora.algokit.io/testnet](https://lora.algokit.io/testnet)

## Installation

### Prerequisites

Before setting up PΛNTHERΛ, ensure you have the following installed:

- *Node.js* (v18.0.0 or higher)
- *npm* or *yarn* package manager
- *MongoDB* (v5.0 or higher)
- *Redis* (v6.0 or higher)
- *Git* for version control

### Quick Start

1. *Clone the Repository*

   ```bash
   git clone https://github.com/P-NTHER-AI/PantheraMonorepo
   cd PantheraMonorepo
   ```

2. *Install Dependencies*

    ```bash
    # Install smart contract dependencies
    npm install

    # Install backend dependencies
    cd panthera-backend
    npm install

    # Install frontend dependencies
    cd ../panthera-frontend
    npm install
    ```

3. *Environment Configuration*

    ```bash
    # Backend environment
    cd ../panthera-backend
    cp .env.example .env
    # Edit .env with your configuration

    # Smart contracts environment
    cd ..
    cp .env.example .env
    # Edit .env with your private key and API keys
    ```

4. *Start Services*

    ```bash
    # Start MongoDB and Redis (if not running)
    # MongoDB: mongod
    # Redis: redis-server

    # Start backend server
    cd panthera-backend
    npm run dev

    # Start frontend development server
    cd ../panthera-frontend
    npm run dev
    ```

5. *Deploy Smart Contracts* (Optional for development)

    ```bash
    # Compile contracts
    npm run compile

    # Deploy to testnet
    npm run deploy:testnet
    ```

## Development Setup

### Backend Configuration

Create and configure the backend environment file:

```bash
# panthera-backend/.env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Algorand Blockchain
Algorand_RPC_URL=https://testnet-api.algonode.cloud
AGENT_FACTORY_ADDRESS=0xYourDeployedFactoryAddress

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Database Configuration
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/panthera

# Security
JWT_SECRET=your_jwt_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/panthera-backend.log
```

### Smart Contract Configuration

Configure the smart contract deployment environment:

```bash
# .env (root directory)
ALGOD_ADDRESS=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_NETWORK=testnet
DEPLOYER_MNEMONIC=
TEST_RECEIVER_MNEMONIC=
APP_ID=
APP_ADDRESS=
```

### Frontend Configuration

The frontend automatically connects to the backend API and blockchain through environment variables:

```typescript
// panthera-frontend/src/config/chains.ts
export const Algorand_TESTNET_CONTRACTS = {
  AGENT_FACTORY: "your_deployed_factory_address",
  // ... other contract addresses
};
```

### Database Setup

#### MongoDB Collections

The platform uses the following MongoDB collections:

- *agents*: Agent metadata and configuration
- *trades*: Trading history and transaction records
- *users*: User profiles and authentication data
- *interactions*: AI agent interaction logs
- *analytics*: Platform analytics and metrics

#### Redis Cache Structure

Redis is used for:

- *Rate limiting*: User request throttling
- *Session management*: WebSocket connection tracking
- *Real-time data*: Price feeds and trading updates
- *Cache*: Frequently accessed blockchain data

### Development Workflow

1. *Start Development Environment*

    ```bash
    # Terminal 1: Backend
    cd panthera-backend && npm run dev

    # Terminal 2: Frontend
    cd panthera-frontend && npm run dev

    # Terminal 3: Blockchain (if needed)
    npx hardhat node
    ```

2. *Code Quality Checks*

    ```bash
    # Lint frontend code
    cd panthera-frontend && npm run lint

    # Run tests
    cd panthera-backend && npm test
    npx hardhat test
    ```

3. *Build for Production*

    ```bash
    # Build frontend
    cd panthera-frontend && npm run build

    # Prepare backend
    cd panthera-backend && npm start
    ```

## API Documentation

### Authentication

The PΛNTHERΛ API uses JWT-based authentication for protected endpoints:

```http
Authorization: Bearer <jwt_token>
```

### Base URL

- *Development*: http://localhost:3001/api
- *Production*: https://api.panthera.ai/api

### Algorand Endpoints

#### Agent Management

*GET /api/agents*
Retrieve a paginated list of all agents.

```http
GET /api/agents?page=1&limit=20&category=trading&sort=marketCap
```

Response:

```json
{
  "success": true,
  "data": {
    "agents": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

*GET /api/agents/:address*
Get detailed information about a specific agent.

```http
GET /api/agents/0x1234567890abcdef1234567890abcdef12345678
```

*POST /api/agents*
Create a new AI agent (requires authentication).

```http
POST /api/agents
Content-Type: application/json

{
  "name": "Trading Bot Alpha",
  "symbol": "TBA",
  "description": "Advanced trading analysis agent",
  "instructions": "You are a professional trading analyst...",
  "model": "gpt-4",
  "category": "trading",
  "creatorAddress": "0x..."
}
```

#### Chat & AI Interaction

*POST /api/chat*
Send a message to an AI agent.

```http
POST /api/chat
Content-Type: application/json

{
  "agentAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "message": "What's your analysis of the current market?",
  "userAddress": "0x...",
  "sessionId": "optional-session-id"
}
```

Response:

```json
{
  "success": true,
  "response": "Based on current market conditions...",
  "agent": {
    "address": "0x...",
    "name": "Trading Bot Alpha",
    "symbol": "TBA",
    "model": "gpt-4",
    "category": "trading"
  },
  "metadata": {
    "responseTime": 1250,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "sessionId": "session-123",
    "messageLength": 45,
    "responseLength": 312
  }
}
```

*GET /api/chat/agents/:address/info*
Get chat capabilities and information for an agent.

#### Trading Operations

*GET /api/trading/quote*
Get a trading quote for buying or selling tokens.

```http
GET /api/trading/quote?agentAddress=0x...&type=buy&amount=1.5
```

*POST /api/trading/execute*
Execute a trade transaction.

```http
POST /api/trading/execute
Content-Type: application/json

{
  "agentAddress": "0x...",
  "type": "buy",
  "amount": "1.5",
  "slippage": 0.5,
  "userAddress": "0x..."
}
```

#### Blockchain Integration

*GET /api/blockchain/stats*
Get platform-wide blockchain statistics.

*GET /api/blockchain/agents/:address/stats*
Get blockchain statistics for a specific agent.

*POST /api/blockchain/verify*
Verify a transaction hash.

#### Analytics

*GET /api/analytics/platform*
Get platform-wide analytics and metrics.

*GET /api/analytics/agents/:address*
Get detailed analytics for a specific agent.

*GET /api/analytics/portfolio/:userAddress*
Get portfolio analytics for a user.

### WebSocket API

The platform provides real-time updates through WebSocket connections:

*Connection URL*: ws://localhost:3001 (development)

#### Event Types

- agentCreated: New agent deployment
- tokensPurchased: Token purchase transaction
- tokensSold: Token sale transaction
- agentInteraction: AI agent interaction
- priceUpdate: Real-time price changes
- statsUpdate: Agent statistics update

## Frontend Components

### Component Architecture

The frontend follows a modular component architecture with clear separation of concerns:

```
src/
├── components/           # Reusable UI components
│   ├── AgentGrid.tsx    # Agent listing and filtering
│   ├── TradingInterface.tsx  # Trading UI
│   ├── ChatInterface.tsx     # AI chat interface
│   ├── PriceChart.tsx   # Interactive price charts
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useWebSocket.ts  # WebSocket connection management
│   ├── useAgentToken.ts # Agent token interactions
│   └── ...
├── services/            # API and external service integrations
│   ├── api.ts          # REST API client
│   ├── websocket.ts    # WebSocket service
│   └── ...
├── config/             # Configuration files
│   ├── wagmi.ts        # Web3 wallet configuration
│   ├── chains.ts       # Blockchain network configuration
│   └── ...
└── utils/              # Utility functions and helpers
```

### Key Components

#### AgentGrid Component

Displays a responsive grid of AI agents with filtering and sorting capabilities.

*Features:*

- Infinite scrolling pagination
- Real-time price updates
- Category filtering
- Sort by various metrics
- Responsive design for mobile/desktop

#### TradingInterface Component

Comprehensive trading interface for buying and selling agent tokens.

*Features:*

- Real-time price quotes
- Slippage protection
- Transaction confirmation
- Price impact calculation
- Trading history

#### ChatInterface Component

Interactive chat interface for communicating with AI agents.

*Features:*

- Real-time messaging
- Message history
- Typing indicators
- Multi-model support
- Session management

#### PriceChart Component

Interactive price charts with technical analysis tools.

*Features:*

- Candlestick charts
- Volume indicators
- Technical overlays
- Zoom and pan functionality
- Real-time updates

### State Management

The application uses a combination of React hooks and context for state management:

- *Local State*: Component-specific state using useState and useReducer
- *Global State*: Application-wide state using React Context
- *Server State*: API data management using React Query
- *WebSocket State*: Real-time data using custom WebSocket hooks

### Responsive Design

The frontend is built with mobile-first responsive design principles:

- *Breakpoints*: Tailwind CSS responsive breakpoints
- *Touch-Friendly*: Optimized for touch interactions
- *Performance*: Optimized for mobile networks
- *Accessibility*: WCAG 2.1 AA compliance

## Blockchain Integration

### Web3 Wallet Integration

PΛNTHERΛ supports multiple wallet providers through the Wagmi library:

*Supported Wallets:*

- Pera Wallet
- Defly Wallet
- Exodus Wallet
- Lute Wallet

*Connection Flow:*

1. User clicks "Connect Wallet"
2. Wallet selection modal appears
3. User authorizes connection
4. Application detects network and switches to Algorand if needed
5. User can interact with smart contracts

### Smart Contract Interaction

The platform interacts with smart contracts through ethers.js and Wagmi hooks:

```typescript
// Example: Purchasing agent tokens
const { write: purchaseTokens } = useContractWrite({
  address: agentAddress,
  abi: AGENT_TOKEN_ABI,
  functionName: 'purchaseTokens',
  value: parseEther(AlgorandAmount),
})
```

### Event Listening

Real-time blockchain event processing:

```javascript
// Backend event listener
this.agentFactory.on('AgentCreated', async (tokenAddress, creator, name, symbol, description, category, event) => {
  // Process agent creation
  // Update database
  // Broadcast to WebSocket clients
});
```

### Transaction Management

*Transaction Flow:*

1. User initiates transaction through UI
2. Frontend prepares transaction parameters
3. Wallet prompts user for confirmation
4. Transaction is broadcast to Algorand network
5. Backend monitors for confirmation
6. UI updates with transaction status
7. Database records transaction details

## AI Services

### Multi-Provider Architecture

PΛNTHERΛ integrates with multiple AI providers for diverse capabilities:

#### OpenAI Integration

- *Models*: GPT-4, GPT-3.5-turbo
- *Use Cases*: General conversation, analysis, creative tasks
- *Rate Limits*: Configurable per-user limits
- *Cost Management*: Token usage tracking and optimization

#### Anthropic Claude Integration

- *Models*: Claude-3
- *Use Cases*: Advanced reasoning, complex analysis, safety-focused responses
- *Features*: Constitutional AI, harmlessness training
- *Specialization*: Ethical AI responses and nuanced understanding

#### Google AI Integration

- *Models*: Gemini Pro
- *Use Cases*: Multimodal understanding, code generation, mathematical reasoning
- *Features*: Vision capabilities, code execution, advanced reasoning

### AI Service Architecture

```javascript
class AIService {
  async generateResponse(model, instructions, userMessage, userAddress) {
    // Route to appropriate AI provider
    // Apply rate limiting
    // Sanitize input/output
    // Log interactions
    // Return formatted response
  }
}
```

### Agent Personality System

Each AI agent has customizable personality traits:

*Configuration Parameters:*

- *Instructions*: Algorand personality and behavior guidelines
- *Model Selection*: Preferred AI model for responses
- *Response Style*: Formal, casual, technical, creative
- *Expertise Areas*: Specialized knowledge domains
- *Interaction Limits*: Rate limiting and usage constraints

### Safety and Moderation

*Content Filtering:*

- Input sanitization and validation
- Output content moderation
- Harmful content detection
- User reporting system
- Automated flagging and review

*Rate Limiting:*

- Per-user interaction limits
- Model-specific rate limiting
- Cost-based throttling
- Fair usage policies

## Trading System

### Bonding Curve Implementation

The trading system implements an automated market maker using bonding curves:

#### Mathematical Model

*Price Function:*

`P(s) = (R / (s * CW)) * (s / S)^((1-CW)/CW)`

Where:

- P(s) = Price at supply s
- R = Reserve balance
- s = Current supply
- S = Total supply
- CW = Connector weight (reserve ratio)

#### Trading Mechanics

*Buy Process:*

1. User specifies Algorand amount to spend
2. System calculates tokens to receive using bonding curve
3. Fees are deducted (platform + creator)
4. Remaining Algorand is added to reserve
5. Tokens are minted to user
6. Price updates automatically

*Sell Process:*

1. User specifies tokens to sell
2. System calculates Algorand to receive
3. Tokens are burned
4. Algorand is transferred from reserve
5. Fees are distributed
6. Price updates automatically

### Fee Structure

*Platform Fees:*

- Creation Fee: 2.5 Algorand (fixed)
- Trading Fee: 2.5% (on each transaction)
- Creator Royalty: 5% (on each transaction)
- Liquidity Pool: 92.5% (remaining amount)

### Slippage Protection

*Slippage Calculation:*

```typescript
const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;
const slippage = Math.max(priceImpact, minimumSlippage);
```

*Protection Mechanisms:*

- Maximum slippage limits
- Price impact warnings
- Transaction reversion on excessive slippage
- Real-time quote updates

### Trading Analytics

*Metrics Tracked:*

- Volume (24h, 7d, 30d, all-time)
- Price changes and volatility
- Holder count and distribution
- Transaction frequency
- Liquidity depth

## WebSocket Services

### Real-Time Architecture

The platform provides comprehensive real-time updates through WebSocket connections:

```javascript
class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
    this.setupEventListeners();
  }
}
```

### Subscription Management

*Event Broadcasting:*

```javascript
broadcast(event) {
  this.clients.forEach((client, clientId) => {
    if (client.subscriptions.has(event.channel)) {
      this.sendToClient(clientId, event);
    }
  });
}
```

### Event Types

*Platform Events:*

- Agent creation notifications
- Platform statistics updates
- System announcements
- Maintenance notifications

*Trading Events:*

- Real-time price updates
- Trade execution confirmations
- Volume and liquidity changes
- Market alerts and notifications

*Agent Events:*

- Interaction notifications
- Performance metric updates
- Status changes
- Creator announcements

### Connection Management

*Features:*

- Automatic reconnection
- Heartbeat/ping-pong
- Connection state tracking
- Error handling and recovery
- Graceful degradation

## Testing

### Testing Strategy

PΛNTHERΛ employs comprehensive testing across all layers:

#### Smart Contract Testing

*Test Coverage:*

- Contract deployment and initialization
- Agent creation and configuration
- Token purchase and sale mechanics
- Fee calculation and distribution
- Access control and security
- Edge cases and error conditions

#### Backend API Testing

*Framework*: Jest with Supertest

```javascript
describe('POST /api/agents', () => {
  it('should create a new agent with valid data', async () => {
    const response = await request(app)
      .post('/api/agents')
      .send(validAgentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.contractAddress).toBeDefined();
  });
});
```

*Test Categories:*

- API endpoint functionality
- Authentication and authorization
- Input validation and sanitization
- Database operations
- AI service integration
- WebSocket functionality
- Error handling and edge cases

#### Frontend Testing

*Framework*: Jest with React Testing Library

```typescript
describe('TradingInterface', () => {
  it('should display correct quote information', () => {
    render(<TradingInterface agent={mockAgent} />);

    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('0.001 Algorand')).toBeInTheDocument();
  });
});
```

*Test Types:*

- Component rendering and behavior
- User interaction flows
- State management
- API integration
- Wallet connection
- Real-time updates

### Running Tests

```bash
# Smart contract tests
cd projects/panthera-contracts
python tests/test_agent_factory.py

# Backend tests
cd projects/panthera-backend
npm test

# Frontend tests
cd projects/panthera-frontend
npm test

# Coverage reports
npm run test:coverage
```

### Test Outputs

```text
Testing Agent Factory Contract with FIXED Graduation System on TESTNET...
App ID: 746512710
Using account: 4FIIQZ5MH5VHVO7AB53M7CFYUP6GLVFTD4MYL44WE6HV2Z4Q7VHUJ6AWRU
Account balance: 46.373563 ALGO
App address: 4BX3ZFWWWZYCXWQ5LYYO2ZVAUQEB5NHO3AQ75AOOSFN5QQ3NDPSGOW45BQ

=== Test 0: Reset Contract ===
✅ Emergency reset: Graduation status reset
✅ Contract re-initialized: Contract re-initialized

=== Test 1: Create Agent ===
✅ Transaction ID: AHCHOMALHWUSLWVONGOESEMOVFP6ANFOHZRT4TYGDPPJV54BH7IA
✅ Created ASA ID: 746516331
🔗 Explorer: https://lora.algokit.io/testnet/asset/746516331
🔗 Tx Explorer: https://lora.algokit.io/testnet/transaction/AHCHOMALHWUSLWVONGOESEMOVFP6ANFOHZRT4TYGDPPJV54BH7IA

=== Test 2: Check Initial Graduation Eligibility ===
Eligible for graduation: 0
Current reserve: 0.0 ALGO
Graduation threshold: 5.0 ALGO

=== Test 3: Opt-in to ASA ===
✅ Opted in to ASA 746516331. TxID: ZDDM4I4HOKU2MQ33ZRJ3ZMZ7HKDVVSRCEQVT5FVSVZDY32ZQMDVA
🔗 Opt-in Explorer: https://lora.algokit.io/testnet/transaction/ZDDM4I4HOKU2MQ33ZRJ3ZMZ7HKDVVSRCEQVT5FVSVZDY32ZQMDVA

=== Test 4: Buy Agent Tokens (Targeting Graduation) ===
⚠️ Requested amount (30500.0) exceeds balance (46.373563)
🔄 Using 41.736206 ALGO instead
✅ Buy transaction ID: RGYNTWINZVODXPV5CBT3PH2XITJBDVETAC7R3LL7SNYF4KNI7KQA
✅ Tokens received: 1072230
✅ Amount spent: 41.736206 ALGO
🔗 Buy Explorer: https://lora.algokit.io/testnet/transaction/RGYNTWINZVODXPV5CBT3PH2XITJBDVETAC7R3LL7SNYF4KNI7KQA

=== Test 5: Check Graduation Eligibility (After Buy) ===
Eligible for graduation: 1
Current reserve: 41.736206 ALGO
Graduation threshold: 5.0 ALGO
✅ NOW ELIGIBLE FOR GRADUATION!

=== Test 6: Get Graduation Preview ===
Preview - Liquidity ALGO: 33.388964
Preview - Creator allocation: 6.26043
Preview - Platform fee: 2.086812
Preview - Remaining tokens: 999999998927770

=== Test 7: Prepare Graduation ===
✅ Graduation prepared!
✅ Liquidity allocation: 33.388964 ALGO
✅ Creator received: 6.26043 ALGO
✅ Platform fee: 2.086812 ALGO
🔗 Graduation Explorer: https://lora.algokit.io/testnet/transaction/PTZ4PCXJICXYOCNHRX4L46BGO42X5BIE2EPX3VJBN7KXMO6R53PA

=== Test 8: Check Status After Prepare ===
Graduated: 0
Threshold met: 1
Graduation timestamp: 1759025166
Pool token ID: 0

=== Test 9: Withdraw Graduation Funds ===
✅ Withdrawn for liquidity: 33.388964 ALGO
🔗 Withdraw Explorer: https://lora.algokit.io/testnet/transaction/VRTQIQKYRWQA5X3H2ERBDNZ5PML7U4INAZKRPUSZ347VMPMHAUYA

=== Test 10: Mint Graduation Tokens ===
✅ Minted for liquidity: 500000000 tokens
🔗 Mint Explorer: https://lora.algokit.io/testnet/transaction/YQCAOZIBOX4IRFYYZA44S3H6WKB2DUYYWHPW2ZLOBWHCMV5DO4FQ

=== Test 11: Simulate Tinyman Pool Confirmation ===
✅ Pool confirmation: Tinyman pool confirmed
🔗 Pool Confirm Explorer: https://lora.algokit.io/testnet/transaction/TILHOODLS67MSLMAVSILORGMHPI5T7VGC22V4QH7MOWG5SRZQTDA

=== Test 12: Final Graduation Status ===
Final graduated status: 1
Threshold met: 0
Graduation timestamp: 1759025166
Pool token ID: 9999

=== Test 13: Try Trading After Graduation (Should Fail) ===
✅ Trading correctly blocked after graduation: TransactionPool.Remember: transaction ZBCJXJGUXVR3ZBHQORRVRL4TBF2CJ62KP5RXARUXG57V4CWKGEQQ: logic eval error: assert failed pc=1593. Details: app=746512710, pc=1593, opcodes=assert; !; assert

================================================================================
🎉 TESTNET GRADUATION SYSTEM TESTS COMPLETED SUCCESSFULLY! 🎉
================================================================================
Summary:
✅ Created agent token: TestnetGradAgent (TGA)
✅ Bought tokens to reach graduation threshold
✅ Verified graduation eligibility
✅ Executed graduation preparation
✅ Withdrew graduation funds
✅ Minted tokens for liquidity
✅ Confirmed Tinyman pool creation
✅ Verified trading is blocked after graduation

🚀 Agent successfully graduated to Tinyman on TESTNET!
================================================================================
🔍 TESTNET LINKS:
🌐 ASA: https://lora.algokit.io/testnet/asset/746516331
🌐 App: https://lora.algokit.io/testnet/application/746512710
🌐 Account: https://lora.algokit.io/testnet/account/4FIIQZ5MH5VHVO7AB53M7CFYUP6GLVFTD4MYL44WE6HV2Z4Q7VHUJ6AWRU
🔍 Tinyman Testnet: https://testnet.tinyman.org
🔍 Search for ASA ID: 746516331
================================================================================
```

### Continuous Integration

*GitHub Actions Workflow:*

- Automated testing on pull requests
- Code quality checks (ESLint, Prettier)
- Security vulnerability scanning
- Build verification
- Deployment automation

## Deployment

### Production Environment Setup

#### Infrastructure Requirements

*Server Specifications:*

- *CPU*: 4+ Algorands (8+ recommended)
- *RAM*: 8GB minimum (16GB+ recommended)
- *Storage*: 100GB SSD (500GB+ recommended)
- *Network*: High-bandwidth connection with low latency
- *OS*: Ubuntu 20.04 LTS or similar

*External Services:*

- *MongoDB Atlas*: Managed MongoDB cluster
- *Redis Cloud*: Managed Redis instance
- *CDN*: Content delivery network for static assets
- *Load Balancer*: For high availability and scaling

#### Environment Configuration

*Production Environment Variables:*

```bash
# Backend Production Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://panthera.ai

# Algorand Mainnet
- https://mainnet-api.algonode.cloud
AGENT_FACTORY_ADDRESS=YourMainnetFactoryAddress

# Algorand TestNet
- https://testnet-api.algonode.cloud

Algorand Explorer
- https://lora.algokit.io

# AI Services (Production Keys)
OPENAI_API_KEY=prod_openai_key
ANTHROPIC_API_KEY=prod_anthropic_key
GOOGLE_AI_API_KEY=prod_google_key

# Production Database
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/panthera
REDIS_URL=rediss://user:pass@redis-cluster.com:6380

# Security (Strong Production Values)
JWT_SECRET=strong_production_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring and Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/panthera/backend.log
SENTRY_DSN=https://your-sentry-dsn
```

#### Smart Contract Deployment

*Mainnet Deployment Process:*

1. *Prepare Deployment Environment*

    ```bash
    # Set environment variables
    export PRIVATE_KEY=your_mainnet_private_key

    # Compile contracts
    npm run compile
    ```

2. *Deploy to Algorand Mainnet*

    ```bash
    # Deploy contracts
    npm run deploy:mainnet

    # Verify contracts on AlgorandScan
    npm run verify:mainnet
    ```

3. *Update Configuration*

    ```bash
    # Update frontend configuration
    # Update backend environment variables
    # Update API documentation
    ```

#### Backend Deployment

*Using PM2 for Process Management:*

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'panthera-backend',
    script: 'server.js',
    cwd: './panthera-backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/panthera/backend-error.log',
    out_file: '/var/log/panthera/backend-out.log',
    log_file: '/var/log/panthera/backend.log'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Frontend Deployment

*Build and Deploy Process:*

```bash
# Build for production
cd panthera-frontend
npm run build

# Deploy to CDN/Static Hosting
# Options: Vercel, Netlify, AWS S3 + CloudFront, etc.

# Example: Deploy to Vercel
npm install -g vercel
vercel --prod
```

#### Database Setup

*MongoDB Production Setup:*

```javascript
// Database indexes for production
db.agents.createIndex({ "contractAddress": 1 }, { unique: true });
db.agents.createIndex({ "creator": 1 });
db.agents.createIndex({ "category": 1 });
db.agents.createIndex({ "createdAt": -1 });
db.agents.createIndex({ "metrics.marketCap": -1 });

db.trades.createIndex({ "agentAddress": 1, "timestamp": -1 });
db.trades.createIndex({ "userAddress": 1, "timestamp": -1 });
db.trades.createIndex({ "timestamp": -1 });

db.interactions.createIndex({ "agentAddress": 1, "timestamp": -1 });
db.interactions.createIndex({ "userAddress": 1, "timestamp": -1 });
```

*Redis Production Configuration:*

```redis
# Redis configuration for production
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Monitoring and Observability

#### Application Monitoring

*Metrics to Track:*

- API response times and error rates
- WebSocket connection counts and stability
- Database query performance
- AI service usage and costs
- Blockchain interaction success rates

*Monitoring Tools:*

- *Application Performance*: New Relic, DataDog, or Sentry
- *Infrastructure*: Prometheus + Grafana
- *Logs*: ELK Stack (Elasticsearch, Logstash, Kibana)
- *Uptime*: Pingdom, UptimeRobot

#### Health Checks

*Backend Health Endpoint:*

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      blockchain: await checkBlockchainHealth(),
      ai_services: await checkAIServicesHealth()
    }
  };

  res.json(health);
});
```

#### Alerting

*Critical Alerts:*

- Service downtime or high error rates
- Database connection failures
- Blockchain network issues
- AI service quota exhaustion
- Security incidents or unusual activity

### Security Considerations

#### Smart Contract Security

*Security Measures:*

- Comprehensive testing and auditing
- Reentrancy protection
- Access control mechanisms
- Input validation and sanitization
- Emergency pause functionality

*Audit Checklist:*

- [ ] Reentrancy vulnerabilities
- [ ] Integer overflow/underflow
- [ ] Access control bypasses
- [ ] Front-running attacks
- [ ] Gas optimization issues

#### Backend Security

*Security Implementations:*

- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Helmet.js security headers

#### Frontend Security

*Security Features:*

- Content Security Policy (CSP)
- Secure wallet integration
- Input sanitization
- XSS prevention
- Secure API communication

### Scaling Considerations

#### Horizontal Scaling

*Backend Scaling:*

- Load balancer configuration
- Stateless application design
- Database connection pooling
- Redis clustering
- Microservices architecture (future)

*Database Scaling:*

- Read replicas for query distribution
- Sharding for large datasets
- Caching strategies
- Query optimization

#### Performance Optimization

*Frontend Optimization:*

- Code splitting and lazy loading
- Image optimization and compression
- CDN for static asset delivery
- Service worker for offline functionality
- Bundle size optimization

*Backend Optimization:*

- Database query optimization
- Caching strategies (Redis)
- API response compression
- Connection pooling
- Asynchronous processing

## Contributing

### Development Guidelines

We welcome contributions to the PΛNTHERΛ platform! Please follow these guidelines:

#### Code Standards

*JavaScript/TypeScript:*

- Use ESLint and Prettier for code formatting
- Follow TypeScript strict mode guidelines
- Write comprehensive JSDoc comments
- Use meaningful variable and function names
- Implement proper error handling

*Solidity:*

- Follow Solidity style guide
- Use NatSpec documentation
- Implement comprehensive testing
- Follow security best practices
- Use OpenZeppelin libraries when possible

#### Git Workflow

*Branch Naming:*

- feature/description - New features
- bugfix/description - Bug fixes
- hotfix/description - Critical fixes
- docs/description - Documentation updates

*Commit Messages:*

type(scope): description

feat(trading): add slippage protection to trading interface
fix(api): resolve rate limiting issue for chat endpoints
docs(readme): update installation instructions
test(contracts): add comprehensive bonding curve tests

#### Pull Request Process

1. *Fork the Repository*

    ```bash
    git clone https://github.com/your-username/panthera.git
    cd panthera
    git remote add upstream https://github.com/original-org/panthera.git
    ```

2. *Create Feature Branch*

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. *Make Changes*
   - Write code following project standards
   - Add comprehensive tests
   - Update documentation as needed
   - Ensure all tests pass

4. *Submit Pull Request*
   - Provide clear description of changes
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI/CD checks pass

#### Testing Requirements

*Required Tests:*

- Unit tests for new functions/components
- Integration tests for API endpoints
- Smart contract tests for new functionality
- End-to-end tests for critical user flows

*Test Coverage:*

- Maintain minimum 80% code coverage
- Test both success and error scenarios
- Include edge case testing
- Performance testing for critical paths

### Issue Reporting

*Bug Reports:*

- Use the bug report template
- Include reproduction steps
- Provide environment details
- Include relevant logs/screenshots

*Feature Requests:*

- Use the feature request template
- Provide clear use case description
- Include mockups or wireframes if applicable
- Discuss implementation approach

### Community Guidelines

*Code of Conduct:*

- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers learn and contribute
- Follow project communication channels

*Communication Channels:*

- GitHub Issues for bugs and features
- Discord for real-time discussion
- Twitter for announcements
- Documentation for guides and tutorials

## License

### MIT License

```text
MIT License

Copyright (c) 2024 PΛNTHERΛ Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Third-Party Licenses

This project uses various open-source libraries and frameworks. Please refer to their respective licenses:

- *React*: MIT License
- *Node.js*: MIT License
- *Express.js*: MIT License
- *MongoDB*: Server Side Public License (SSPL)
- *Redis*: BSD 3-Clause License
- *OpenZeppelin*: MIT License
- *Hardhat*: MIT License
- *Ethers.js*: MIT License

### Disclaimer

*Important Notice:*

PΛNTHERΛ is experimental software built for educational and research purposes. Users should be aware of the following:

- *Financial Risk*: Trading AI agent tokens involves financial risk. Users may lose money.
- *Smart Contract Risk*: Smart contracts may contain bugs or vulnerabilities.
- *AI Limitations*: AI responses are generated by machine learning models and may be inaccurate.
- *Regulatory Compliance*: Users are responsible for compliance with local regulations.
- *No Warranty*: The software is provided "as is" without warranty of any kind.

*Use at Your Own Risk*: The PΛNTHERΛ team is not responsible for any financial losses, damages, or other consequences resulting from the use of this platform.

---

*Built with ❤️ by the PΛNTHERΛ Team*

Revolutionizing AI and DeFi on Algorand
