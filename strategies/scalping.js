const config = require('../config');
const helpers = require('../utils/helpers');

class ScalpingStrategy {
    constructor() {
        this.tpLevels = config.TRADING.TP_LEVELS;
        this.stopLoss = config.TRADING.STOP_LOSS;
    }

    // Calcular salida basada en precio actual
    calcularSalida(entryAmount, currentPriceChange) {
        let multiplicador = 1 + (currentPriceChange / 100);
        let accion = 'HOLD';
        let porcentajeSalida = 0;

        // Verificar Stop Loss
        if (currentPriceChange <= this.stopLoss) {
            accion = 'SELL_ALL';
            porcentajeSalida = 100;
            multiplicador = 1 + (this.stopLoss / 100);
        }
        // Verificar Take Profit levels
        else {
            for (const level of this.tpLevels) {
                if (currentPriceChange >= level.percentage) {
                    accion = 'SELL_PARTIAL';
                    porcentajeSalida = level.fraction * 100;
                    break;
                }
            }

            // Si alcanzó el último TP, vender todo
            const lastTP = this.tpLevels[this.tpLevels.length - 1];
            if (currentPriceChange >= lastTP.percentage) {
                accion = 'SELL_ALL';
                porcentajeSalida = 100;
            }
        }

        return {
            accion,
            porcentajeSalida,
            multiplicador,
            amountOut: entryAmount * multiplicador,
        };
    }

    // Evaluar si entrar en una operación
    evaluarEntrada(tokenData) {
        const score = {
            total: 0,
            maxScore: 100,
            recommendations: [],
        };

        // Liquidez (30 puntos)
        if (tokenData.liquidity >= 50000) {
            score.total += 30;
        } else if (tokenData.liquidity >= 10000) {
            score.total += 15;
            score.recommendations.push('⚠️ Liquidez baja');
        } else {
            score.recommendations.push('❌ Liquidez insuficiente');
            return { ...score, shouldEnter: false };
        }

        // Volumen 5min (25 puntos)
        if (tokenData.volume5m >= 10000) {
            score.total += 25;
        } else if (tokenData.volume5m >= 5000) {
            score.total += 12;
        } else {
            score.recommendations.push('⚠️ Volumen bajo');
        }

        // Momentum precio (25 puntos)
        if (tokenData.priceChange5m >= 10) {
            score.total += 25;
        } else if (tokenData.priceChange5m >= 5) {
            score.total += 15;
        } else if (tokenData.priceChange5m < -5) {
            score.recommendations.push('❌ Momentum negativo');
            score.total -= 10;
        }

        // Trend 1h (20 puntos)
        if (tokenData.priceChange1h >= 20) {
            score.total += 20;
        } else if (tokenData.priceChange1h >= 10) {
            score.total += 10;
        } else if (tokenData.priceChange1h < -10) {
            score.recommendations.push('⚠️ Trend hourly negativo');
        }

        score.shouldEnter = score.total >= 60;
        score.rating = score.total >= 80 ? 'EXCELLENT' : score.total >= 60 ? 'GOOD' : 'RISKY';

        return score;
    }

    // Calcular tamaño de posición basado en riesgo
    calcularTamanioPosicion(saldo, confidence) {
        const basePercentage = config.STRATEGY.INVESTMENT_PERCENTAGE;
        
        // Ajustar según confianza
        let adjustedPercentage = basePercentage;
        if (confidence >= 80) {
            adjustedPercentage = basePercentage * 1.2; // +20% para alta confianza
        } else if (confidence <= 50) {
            adjustedPercentage = basePercentage * 0.5; // -50% para baja confianza
        }

        return helpers.calcularInversion(saldo * (adjustedPercentage / basePercentage));
    }
}

module.exports = new ScalpingStrategy();
