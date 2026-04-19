# API Reference

Complete API documentation for Binance Trading Bot.

## Base URL

```
http://localhost:3000
```

## Headers

All POST requests require:
```
Content-Type: application/json
```

---

## Market Data

### Fetch OHLCV Data

**Endpoint:** `POST /api/candles`

**Request:**
```json
{
  "symbol": "BTC/USDT",
  "timeframe": "1d",
  "limit": 500
}
```

**Response:**
```json
{
  "success": true,
  "candles": 500,
  "data": [...]
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/candles \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTC/USDT", "timeframe": "1d", "limit": 500}'
```

---

## Backtesting

### Run Backtest

**Endpoint:** `POST /api/backtest`

**Request:**
```json
{
  "strategy": {
    "code": "function strategy(ohlcv, params) { return 'BUY'; }",
    "params": { "slPct": 2, "tpPct": 4 }
  },
  "symbol": "BTC/USDT",
  "initialCapital": 10000,
  "exitConfig": {
    "mode": "LONG"
  }
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"strategy": {"code": "function strategy(ohlcv, params) { return \"BUY\"; }"}}'
```

---

## Full API in docs/API.md

See `docs/API.md` for complete endpoint documentation.