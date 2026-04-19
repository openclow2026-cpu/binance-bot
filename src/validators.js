const DEFAULTS = {
    populationSize: { min: 10, max: 500, default: 100 },
    generations: { min: 5, max: 100, default: 50 },
    mutationRate: { min: 0.01, max: 0.5, default: 0.2 },
    eliteSize: { min: 1, max: 20, default: 5 }
};

class ValidationError extends Error {
    constructor(field, message, suggestion) {
        super(message);
        this.field = field;
        this.suggestion = suggestion;
        this.type = 'VALIDATION_ERROR';
    }
}

function validatePositiveInteger(value, fieldName, config = {}) {
    const { min = 1, max = Infinity, default: def = 10 } = config;
    if (value === undefined || value === null || value === '') {
        return { valid: false, value: def, error: `El campo ${fieldName} es requerido` };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, value: def, error: `${fieldName} debe ser un número` };
    }
    if (num < min || num > max) {
        return { valid: false, value: def, error: `${fieldName} debe estar entre ${min} y ${max}` };
    }
    return { valid: true, value: Math.floor(num) };
}

function validateFloat(value, fieldName, config = {}) {
    const { min = 0, max = Infinity, default: def = 0 } = config;
    if (value === undefined || value === null || value === '') {
        return { valid: false, value: def, error: `El campo ${fieldName} es requerido` };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, value: def, error: `${fieldName} debe ser un número` };
    }
    if (num < min || num > max) {
        return { valid: false, value: def, error: `${fieldName} debe estar entre ${min} y ${max}` };
    }
    return { valid: true, value: num };
}

function validateGAConfig(config) {
    const errors = [];
    const warnings = [];
    const sanitized = {};
    
    const popResult = validatePositiveInteger(config.populationSize, 'Población', DEFAULTS.populationSize);
    if (!popResult.valid) errors.push(new ValidationError('populationSize', popResult.error, popResult.suggestion));
    sanitized.populationSize = popResult.value;
    
    const genResult = validatePositiveInteger(config.generations, 'Generaciones', DEFAULTS.generations);
    if (!genResult.valid) errors.push(new ValidationError('generations', genResult.error, genResult.suggestion));
    sanitized.generations = genResult.value;
    
    const mutResult = validateFloat(config.mutationRate, 'Mutación', DEFAULTS.mutationRate);
    if (!mutResult.valid) warnings.push(new ValidationError('mutationRate', mutResult.error, mutResult.suggestion));
    sanitized.mutationRate = mutResult.value;
    
    return { valid: errors.length === 0, errors, warnings, sanitized, hasWarnings: warnings.length > 0 };
}

function validateDataRequirement(data, minLength = 100) {
    if (!data || !Array.isArray(data)) {
        return { valid: false, error: 'No hay datos de mercado', suggestion: 'Cargue datos primero' };
    }
    if (data.length < minLength) {
        return { valid: false, error: `Datos insuficientes: ${data.length}`, suggestion: `Mínimo ${minLength} velas` };
    }
    return { valid: true, length: data.length };
}

function validateFitnessWeights(weights) {
    const errors = [];
    const required = ['profit', 'sharpe', 'calmar', 'stability', 'winRate'];
    const missing = required.filter(k => weights[k] === undefined);
    if (missing.length > 0) {
        errors.push(new ValidationError('weights', `Faltan: ${missing.join(', ')}`, 'Todos los pesos requeridos'));
    }
    const sanitized = {};
    let total = 0;
    for (const key of required) {
        const w = parseFloat(weights[key]);
        if (isNaN(w) || w < 0 || w > 1) continue;
        sanitized[key] = w;
        total += w;
    }
    return { valid: errors.length === 0, errors, sanitized };
}

module.exports = { ValidationError, validateGAConfig, validateDataRequirement, validateFitnessWeights, DEFAULTS };
