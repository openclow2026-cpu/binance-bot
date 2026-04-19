# Binance Trading Bot

Algorithmic trading bot with genetic algorithm strategy optimizer.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your Binance API keys
node src/server.js
# Open: http://localhost:3000
```

## Features

- Strategy Mining with genetic algorithm
- Backtesting
- Paper Trading
- Robustness testing (Monte Carlo, Walk-Forward)

## API Endpoints

- `GET /api/strategies` - List strategies
- `POST /api/backtest` - Run backtest
- `POST /api/genetic/start` - Start GA optimization
- `GET /api/paper/trades` - Paper trading history

## License
MIT
