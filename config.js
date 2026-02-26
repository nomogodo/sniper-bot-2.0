require('dotenv').config();

module.exports = {
    // Entorno
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Helius RPC
    HELIUS: {
        API_KEY: process.env.HELIUS_API_KEY,
        RPC_URL: `${process.env.RPC_URL}${process.env.HELIUS_API_KEY}`,
        WSS_URL: `${process.env.WSS_URL}${process.env.HELIUS_API_KEY}`,
    },

    // Programas Solana
    PROGRAMS: {
        RAYDIUM: new (require('@solana/web3.js').PublicKey)("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"),
        PUMP: new (require('@solana/web3.js').PublicKey)("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
    },

    // Estrategia
    STRATEGY: {
        INITIAL_BALANCE: parseFloat(process.env.INITIAL_BALANCE) || 1.5,
        INVESTMENT_PERCENTAGE: parseFloat(process.env.INVESTMENT_PERCENTAGE) || 35,
        MIN_INVESTMENT: parseFloat(process.env.MIN_INVESTMENT) || 0.1,
        MAX_INVESTMENT: parseFloat(process.env.MAX_INVESTMENT) || 5.0,
        MAX_PARALLEL_OPERATIONS: parseInt(process.env.MAX_PARALLEL_OPERATIONS) || 3,
    },

    // Take Profit / Stop Loss
    TRADING: {
        TP_LEVELS: [
            { percentage: parseInt(process.env.TP_LEVEL_1) || 25, fraction: 0.4 },
            { percentage: parseInt(process.env.TP_LEVEL_2) || 50, fraction: 0.35 },
            { percentage: parseInt(process.env.TP_LEVEL_3) || 100, fraction: 0.25 },
        ],
        STOP_LOSS: parseInt(process.env.STOP_LOSS) || -15,
    },

    // Tiempos
    TIMING: {
        MIN_WAIT: parseInt(process.env.MIN_WAIT_TIME) || 15000,
        MAX_WAIT: parseInt(process.env.MAX_WAIT_TIME) || 45000,
    },

    // Filtros
    FILTERS: {
        MIN_LIQUIDITY_USD: parseFloat(process.env.MIN_LIQUIDITY_USD) || 10000,
        MIN_VOLUME_5M: parseFloat(process.env.MIN_VOLUME_5M) || 5000,
    },

    // Telegram (Opcional)
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || null,
        CHAT_ID: process.env.TELEGRAM_CHAT_ID || null,
        ENABLED: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    },

    // Wallet (Solo producción)
    WALLET: {
        PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY || null,
        ADDRESS: process.env.WALLET_ADDRESS || null,
        IS_PRODUCTION: !!(process.env.WALLET_PRIVATE_KEY),
    },
};
