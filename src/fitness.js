const { runBacktest, compileStrategy } = require('./backtester');
const { validateFitnessWeights } = require('./validators');

const DEFAULT_CONFIG = {
    weights: { profit: 0.35, sharpe: 0.25, calmar: 0.20, stability: 0.10, winRate: 0.10 },
    minTrades: 3,
    maxDrawdown: 60,
    minWinRate: 35,
    oosPeriodPct: 0.25
};

class FitnessEvaluator {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (config.weights) {
            const wv = validateFitnessWeights(config.weights);
            if (wv.valid) this.config.weights = wv.sanitized;
        }
    }

    setWeights(weights) {
        const v = validateFitnessWeights(weights);
        if (v.valid) {
            this.config.weights = v.sanitized;
            return { success: true, weights: this.config.weights };
        }
        return { success: false, errors: v.errors.map(e => e.message) };
    }

    getWeights() { return { ...this.config.weights }; }
    getConfig() { return { ...this.config }; }
    resetWeights() { this.config.weights = { ...DEFAULT_CONFIG.weights }; }

    evaluate(genome, data, config = {}) {
        if (!data || data.length < 100) return this.emptyResult('Datos insuficientes');
        
        const oosPct = config.oosPeriodPct || this.config.oosPeriodPct;
        const split = Math.floor(data.length * (1 - oosPct));
        const isData = data.slice(0, split);
        const oosData = data.slice(split);
        
        const isM = this.runBacktest(genome, isData, config);
        const oosM = this.runBacktest(genome, oosData, config);
        
        if (!isM || isM.trades < this.config.minTrades) {
            return this.emptyResult('Trades insuficientes');
        }
        
        const score = this.calculateScore(isM, oosM);
        return { success: true, fitness: score, metrics: isM, oosMetrics: oosM };
    }

    calculateScore(isM, oosM) {
        const w = this.config.weights;
        const profitScore = Math.max(0, Math.min(100, isM.profit + 50));
        const winScore = isM.winRate;
        const ddScore = Math.max(0, 100 - isM.drawdown);
        const stability = isM.profit > 0 && oosM.profit > 0 ? 1 : (Math.min(Math.abs(isM.profit), Math.abs(oosM.profit)) / Math.max(Math.abs(isM.profit), Math.abs(oosM.profit)));
        return profitScore * w.profit + winScore * w.winRate + ddScore * w.calmar + stability * w.stability;
    }

    runBacktest(genome, data, config = {}) {
        if (!genome || !genome.code || !data) return this.emptyMetrics();
        try {
            const fn = compileStrategy(genome.code);
            return runBacktest(fn, data, genome.params || {}, config);
        } catch (e) { return this.emptyMetrics(); }
    }

    emptyMetrics() { return { profit: 0, drawdown: 0, trades: 0, winRate: 0, profitFactor: 0 }; }
    emptyResult(error) { return { success: false, fitness: 0, error }; }
}

module.exports = FitnessEvaluator;
