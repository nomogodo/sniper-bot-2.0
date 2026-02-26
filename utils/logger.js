const winston = require('winston');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado para consola
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        const colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.green,
            debug: chalk.blue,
        };
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level] ? colors[level](level.toUpperCase()) : level}: ${message}`;
    })
);

// Formato para archivos
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transports: [
        // Consola
        new winston.transports.Console({
            format: consoleFormat,
        }),
        // Archivo de errores
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        // Archivo general
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
        }),
    ],
});

// Funciones helper para trading
logger.trade = (message) => logger.info(chalk.cyan('📊 TRADE: ') + message);
logger.profit = (message) => logger.info(chalk.green('✅ PROFIT: ') + message);
logger.loss = (message) => logger.warn(chalk.red('❌ LOSS: ') + message);
logger.alert = (message) => logger.info(chalk.magenta('🚨 ALERT: ') + message);

module.exports = logger;
