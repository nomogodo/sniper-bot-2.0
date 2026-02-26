const axios = require('axios');
const config = require('../config');

// Calcular inversión dinámica
function calcularInversion(saldo) {
    let inversion = saldo * (config.STRATEGY.INVESTMENT_PERCENTAGE / 100);
    inversion = Math.max(inversion, config.STRATEGY.MIN_INVESTMENT);
    inversion = Math.min(inversion, config.STRATEGY.MAX_INVESTMENT);
    return inversion;
}

// Calcular tiempo de espera aleatorio
function calcularTiempoEspera() {
    return Math.floor(
        Math.random() * (config.TIMING.MAX_WAIT - config.TIMING.MIN_WAIT + 1) + config.TIMING.MIN_WAIT
    );
}

// Obtener precio de token desde DexScreener
async function getTokenPrice(tokenMint) {
    try {
        const response = await axios.get(
            `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
            { timeout: 5000 }
        );
        
        if (!response.data.pairs || response.data.pairs.length === 0) {
            return null;
        }

        // Filtrar por liquidez
        const validPairs = response.data.pairs.filter(
            pair => (pair.liquidity?.usd || 0) >= config.FILTERS.MIN_LIQUIDITY_USD
        );

        if (validPairs.length === 0) {
            return null;
        }

        // Ordenar por liquidez
        validPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

        return {
            price: validPairs[0].priceUsd,
            liquidity: validPairs[0].liquidity?.usd || 0,
            volume5m: validPairs[0].volume?.h24 || 0,
            priceChange5m: validPairs[0].priceChange?.m5 || 0,
            priceChange1h: validPairs[0].priceChange?.h1 || 0,
            pair: validPairs[0],
        };
    } catch (error) {
        console.error('Error obteniendo precio:', error.message);
        return null;
    }
}

// Formatear número como moneda
function formatMoney(amount, decimals = 4) {
    return parseFloat(amount).toFixed(decimals);
}

// Calcular P&L
function calcularPnL(entryAmount, exitAmount) {
    const profit = exitAmount - entryAmount;
    const percentage = ((profit / entryAmount) * 100);
    return { profit, percentage };
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generar ID único para operación
function generateOperationId() {
    return `OP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

module.exports = {
    calcularInversion,
    calcularTiempoEspera,
    getTokenPrice,
    formatMoney,
    calcularPnL,
    sleep,
    generateOperationId,
};
