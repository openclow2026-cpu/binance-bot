const indicators = require('../indicators/core');

function compileStrategy(code) {
    try {
        const fn = new Function('SMA', 'EMA', 'WMA', 'RSI', 'MACD', 'ATR', 'BollingerBands', 'SuperTrend', 'crossOver', 'crossUnder', 'highest', 'lowest',
            'return ' + code);
        return fn.bind(null, indicators.SMA, indicators.EMA, indicators.WMA, indicators.RSI, indicators.MACD, indicators.ATR, indicators.BollingerBands, indicators.SuperTrend,
            indicators.crossOver, indicators.crossUnder, indicators.highest, indicators.lowest);
    } catch (e) {
        console.error('[Backtest] Error compilando:', e.message);
        return () => false;
    }
}

function runBacktest(strategyFn, data, params = {}, config = {}) {
    const capital = config.initialCapital || 10000;
    const commission = config.commission || 0.1;
    const orderSize = config.orderSizePct || 100;
    const warmup = config.warmup || 20;
    
    let balance = capital;
    let position = null;
    const trades = [];
    let peakBalance = capital;
    let drawdown = 0;
    
    const exitConfig = config.exitConfig || { sl: true, tp: true, slPct: params.slPct || 2, tpPct: params.tpPct || 4 };
    
    for (let i = warmup; i < data.length; i++) {
        const slice = data.slice(0, i + 1);
        const signal = strategyFn(slice, params);
        
        if (signal === 'BUY' && !position) {
            const price = data[i].close;
            const size = (balance * orderSize / 100) / price;
            position = { type: 'LONG', entryPrice: price, size, entryIndex: i };
            balance -= size * price * (1 + commission / 100);
        }
        else if (signal === 'SELL' && position) {
            const price = data[i].close;
            const proceeds = position.size * price * (1 - commission / 100);
            const pnl = proceeds - (position.size * position.entryPrice * (1 + commission / 100));
            balance += proceeds;
            trades.push({ ...position, exitPrice: price, pnl, exitIndex: i });
            position = null;
        }
        
        if (exitConfig.sl && position) {
            const sl = position.entryPrice * (1 - exitConfig.slPct / 100);
            if (data[i].low <= sl) {
                const price = sl;
                const proceeds = position.size * price * (1 - commission / 100);
                const pnl = proceeds - (position.size * position.entryPrice * (1 + commission / 100));
                balance += proceeds;
                trades.push({ ...position, exitPrice: price, pnl, exitIndex: i, reason: 'SL' });
                position = null;
            }
        }
        
        if (exitConfig.tp && position) {
            const tp = position.entryPrice * (1 + exitConfig.tpPct / 100);
            if (data[i].high >= tp) {
                const price = tp;
                const proceeds = position.size * price * (1 - commission / 100);
                const pnl = proceeds - (position.size * position.entryPrice * (1 + commission / 100));
                balance += proceeds;
                trades.push({ ...position, exitPrice: price, pnl, exitIndex: i, reason: 'TP' });
                position = null;
            }
        }
        
        if (balance > peakBalance) peakBalance = balance;
        const currentDD = (peakBalance - balance) / peakBalance * 100;
        if (currentDD > drawdown) drawdown = currentDD;
    }
    
    if (position) {
        const price = data[data.length - 1].close;
        const proceeds = position.size * price * (1 - commission / 100);
        const pnl = proceeds - (position.size * position.entryPrice * (1 + commission / 100));
        balance += proceeds;
        trades.push({ ...position, exitPrice: price, pnl, exitIndex: data.length - 1, reason: 'CLOSE' });
    }
    
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl <= 0).length;
    const profit = ((balance - capital) / capital) * 100;
    const profitFactor = wins > 0 && losses > 0 ? (trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))) : 0;
    
    return {
        profit: Math.round(profit * 100) / 100,
        trades: trades.length,
        wins,
        losses,
        winRate: trades.length > 0 ? Math.round(wins / trades.length * 100) : 0,
        drawdown: Math.round(drawdown * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        finalBalance: Math.round(balance * 100) / 100
    };
}

module.exports = { compileStrategy, runBacktest };
