# Binance Trading Bot

Algorithmic trading bot with genetic algorithm strategy optimizer, backtesting, paper trading, and advanced risk management for Binance.

## Features

- Strategy Mining - Genetic algorithm optimization
- Backtesting - LONG/SHORT/BOTH modes with in-sample/out-of-sample validation
- Trailing Stop Loss - Dynamic SL with price/ATR modes
- Paper Trading - Risk-free simulation
- Robustness Testing - Monte Carlo, Walk-Forward
- MongoDB Persistence - Strategies, trades, and backtests
- Docker Ready - Deploy anywhere with docker-compose
- Unit Tests - 43+ tests with Jest
- REST API - Full trading bot API

## Project Structure

```
binance-bot/
├── src/
│   ├── server.js              # Express server & API endpoints
│   ├── backtester.js          # LONG/SHORT/BOTH backtest engine
│   ├── fitness.js             # Genetic algorithm fitness evaluator
│   ├── database.js            # MongoDB schemas & CRUD helpers
│   ├── validators.js          # Input validation
│   ├── strategyMiner.js       # Strategy generation
│   ├── geneticOptimizer.js    # GA engine
│   ├── paperTrader.js        # Paper trading
│   ├── indicators/
│   │   └── core.js            # Technical indicators (SMA, EMA, RSI, MACD, etc.)
│   └── ...
├── tests/
│   ├── backtester.test.js     # 18 tests
│   ├── fitness.test.js        # 12 tests
│   └── validators.test.js     # 13 tests
├── public/
│   └── sq-style.html          # Web UI
├── Dockerfile                 # Container image
├── docker-compose.yml         # Docker services (app + MongoDB)
├── package.json               # Dependencies
└── .env.example               # Environment variables template
```

## Quick Start

### Local Development

```bash

git clone https://github.com/openclow2026-cpu/binance-bot.git
cd binance-bot
npm install

# Configure environment
cp .env.example .env

# Run tests
npm test

# Start server
npm start
# Open: http://localhost:3000
```

### Docker

```bash
docker-compose up
```

## API Endpoints

- POST /api/backtest - Run backtest
- POST /api/backtest/save - Save to MongoDB
- POST /api/genetic/start - Start GA
- POST /api/paper/trade - Paper trade

## Testing

```bash
npm test
```

## License

MIT
