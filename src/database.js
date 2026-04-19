const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-bot';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[DB] Conectado a MongoDB');
    } catch (err) {
        console.error('[DB] Error:', err.message);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    await mongoose.disconnect();
    console.log('[DB] Desconectado');
};

const tradeSchema = new mongoose.Schema({
    strategyId: String,
    strategyName: String,
    type: { type: String, enum: ['LONG', 'SHORT'], required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: Number,
    quantity: Number,
    pnl: Number,
    pnlPercent: Number,
    entryTime: { type: Date, required: true },
    exitTime: Date,
    duration: Number,
    commission: Number,
    slippage: Number,
    reason: String,
    symbol: String,
    timeframe: String
}, { timestamps: true });

const strategySchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    templateId: String,
    params: mongoose.Schema.Types.Mixed,
    metrics: {
        profit: Number,
        drawdown: Number,
        winRate: Number,
        profitFactor: Number,
        sharpe: Number,
        trades: Number
    },
    tags: [String],
    isActive: { type: Boolean, default: false },
    savedAt: Date
}, { timestamps: true });

const backtestSchema = new mongoose.Schema({
    strategyId: String,
    strategyCode: String,
    params: mongoose.Schema.Types.Mixed,
    config: mongoose.Schema.Types.Mixed,
    symbol: String,
    timeframe: String,
    initialCapital: Number,
    metrics: mongoose.Schema.Types.Mixed,
    mode: String,
    createdAt: { type: Date, default: Date.now }
});

const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);
const Strategy = mongoose.models.Strategy || mongoose.model('Strategy', strategySchema);
const Backtest = mongoose.models.Backtest || mongoose.model('Backtest', backtestSchema);

module.exports = {
    connectDB,
    disconnectDB,
    Trade,
    Strategy,
    Backtest
};