const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const logger = require('../utils/logger');

class TelegramAlerts {
    constructor() {
        this.enabled = config.TELEGRAM.ENABLED;
        this.bot = null;

        if (this.enabled) {
            try {
                this.bot = new TelegramBot(config.TELEGRAM.BOT_TOKEN, { polling: false });
                logger.info('✅ Alertas de Telegram activadas');
            } catch (error) {
                logger.error('❌ Error inicializando Telegram: ' + error.message);
                this.enabled = false;
            }
        }
    }

    async sendMessage(message) {
        if (!this.enabled || !this.bot) return;

        try {
            await this.bot.sendMessage(config.TELEGRAM.CHAT_ID, message, {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            logger.error('Error enviando mensaje a Telegram: ' + error.message);
        }
    }

    async sendTradeAlert(operation) {
        const message = `
📊 *NUEVA OPERACIÓN*

🆔 ID: \`${operation.id}\`
💰 Inversión: \`${operation.investment} SOL\`
📈 Plataforma: \`${operation.platform}\`
⏰ Hora: \`${new Date().toLocaleTimeString()}\`
        `.trim();

        await this.sendMessage(message);
    }

    async sendProfitAlert(operation) {
        const emoji = operation.profit > 0 ? '✅' : '❌';
        const message = `
${emoji} *OPERACIÓN CERRADA*

🆔 ID: \`${operation.id}\`
💹 P&L: \`${operation.percentage.toFixed(2)}%\`
💰 Ganancia/Pérdida: \`${operation.profit.toFixed(4)} SOL\`
💼 Saldo Actual: \`${operation.balance.toFixed(4)} SOL\`
🔥 Racha: \`${operation.streak}\`
        `.trim();

        await this.sendMessage(message);
    }

    async sendBalanceAlert(balance, change) {
        const emoji = change >= 0 ? '📈' : '📉';
        const message = `
${emoji} *ACTUALIZACIÓN DE SALDO*

💰 Saldo: \`${balance.toFixed(4)} SOL\`
📊 Cambio: \`${change >= 0 ? '+' : ''}${change.toFixed(4)} SOL\`
        `.trim();

        await this.sendMessage(message);
    }

    async sendErrorAlert(error) {
        const message = `
🚨 *ERROR CRÍTICO*

⚠️ Error: \`${error.message}\`
⏰ Hora: \`${new Date().toLocaleTimeString()}\`
        `.trim();

        await this.sendMessage(message);
    }
}

module.exports = new TelegramAlerts();
