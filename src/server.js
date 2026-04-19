require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
const StrategyMiner = require('./strategyMiner');
const PaperTrader = require('./paperTrader');
const RobustnessTester = require('./robustnessTester');
const { compileStrategy, runBacktest } = require('./backtester');
const { exportStrategyToPineScript } = require('./pineScriptGenerator');

const app = express();
const PORT = process.env.PORT || 3000;
const binance = new ccxt.binance({ enableRateLimit: true });

const DATA_DIR = path.join(__dirname, '../data');
const PAPER_STATE_FILE = path.join(DATA_DIR, 'paper_state.json');
const STRATEGIES_FILE = path.join(DATA_DIR, 'strategies.json');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public'));

let currentMarketData = [];
let geneticOptimizer = null;
let paperTrader = new PaperTrader();

function loadPaperState() {
    try {
        if (fs.existsSync(PAPER_STATE_FILE)) {
            const data = JSON.parse(fs.readFileSync(PAPER_STATE_FILE));
            paperTrader = new PaperTrader(data.config);
        }
    } catch (e) {
        console.log('[Paper] Estado no encontrado, creando nuevo');
    }
}

function savePaperState() {
    try {
        fs.writeFileSync(PAPER_STATE_FILE, JSON.stringify(paperTrader.getState(), null, 2));
    } catch (e) {
        console.error('[Paper] Error guardando:', e.message);
    }
}

async function fetchBinanceData(symbol, timeframe, limit) {
    const data = await binance.fetchOHLCV(symbol, timeframe, undefined, limit);
    return data.map(d => ({
        time: d[0] / 1000,
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
        volume: d[5]
    }));
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/sq-style.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/market/data', async (req, res) => {
    try {
        const { symbol = 'BTC/USDT', timeframe = '1d', limit = 2000 } = req.body;
        currentMarketData = await fetchBinanceData(symbol, timeframe, limit);
        res.json({ success: true, candles: currentMarketData.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/market/current', (req, res) => {
    res.json({ success: true, data: currentMarketData });
});

app.post('/api/backtest', async (req, res) => {
    try {
        const { strategy, symbol, timeframe, capital = 10000, commission = 0.1 } = req.body;
        if (!strategy || !strategy.code) {
            return res.status(400).json({ success: false, error: 'Código requerido' });
        }
        const data = currentMarketData.length > 0 ? currentMarketData : await fetchBinanceData(symbol || 'BTC/USDT', timeframe || '1d', 2000);
        const strategyFn = compileStrategy(strategy.code);
        const params = strategy.params || {};
        const result = runBacktest(strategyFn, data, params, { initialCapital: capital, commission, orderSizePct: 100 });
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/strategies', (req, res) => {
    try {
        let strategies = [];
        if (fs.existsSync(STRATEGIES_FILE)) {
            strategies = JSON.parse(fs.readFileSync(STRATEGIES_FILE));
        }
        res.json({ success: true, strategies });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/strategies/save', (req, res) => {
    try {
        const strategy = req.body;
        let strategies = [];
        if (fs.existsSync(STRATEGIES_FILE)) {
            strategies = JSON.parse(fs.readFileSync(STRATEGIES_FILE));
        }
        strategy.id = strategy.id || `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        strategy.savedAt = new Date().toISOString();
        strategies.unshift(strategy);
        strategies = strategies.slice(0, 1000);
        fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(strategies, null, 2));
        res.json({ success: true, strategy });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete('/api/strategies/:id', (req, res) => {
    try {
        const { id } = req.params;
        let strategies = [];
        if (fs.existsSync(STRATEGIES_FILE)) {
            strategies = JSON.parse(fs.readFileSync(STRATEGIES_FILE));
        }
        const filtered = strategies.filter(s => s.id !== id);
        fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/genetic/start', async (req, res) => {
    try {
        const config = req.body;
        if (!currentMarketData || currentMarketData.length < 100) {
            return res.status(400).json({ success: false, error: 'Cargue datos primero' });
        }
        const GeneticOptimizer = require('./geneticOptimizer');
        geneticOptimizer = new GeneticOptimizer(config);
        geneticOptimizer.setMarketData(currentMarketData);
        geneticOptimizer.setCallbacks({ onProgress: (p) => res.io && res.io.emit('ga-progress', p) });
        const results = await geneticOptimizer.start();
        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/genetic/status', (req, res) => {
    if (!geneticOptimizer) return res.json({ running: false });
    res.json({ success: true, ...geneticOptimizer.getStatus() });
});

app.post('/api/genetic/stop', (req, res) => {
    if (!geneticOptimizer) return res.json({ success: false, error: 'No hay GA' });
    geneticOptimizer.stop();
    res.json({ success: true });
});

app.get('/api/genetic/results', (req, res) => {
    if (!geneticOptimizer) return res.json({ success: false, error: 'No hay resultados' });
    res.json({ success: true, ...geneticOptimizer.getResults() });
});

app.post('/api/paper/trade', (req, res) => {
    try {
        const { type, price, quantity } = req.body;
        const trade = paperTrader.addTrade(type, price, quantity);
        savePaperState();
        res.json({ success: true, trade });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/paper/state', (req, res) => {
    res.json({ success: true, state: paperTrader.getState() });
});

app.get('/api/paper/trades', (req, res) => {
    res.json({ success: true, trades: paperTrader.getTrades() });
});

app.post('/api/paper/reset', (req, res) => {
    try {
        paperTrader = new PaperTrader();
        savePaperState();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

loadPaperState();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
