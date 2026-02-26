require('dotenv').config();
const figlet = require('figlet');
const chalk = require('chalk');
const { Connection, PublicKey } = require('@solana/web3.js');

const config = require('./config');
const logger = require('./utils/logger');
const stats = require('./utils/stats');
const telegram = require('./alerts/telegram');
const scalping = require('./strategies/scalping');
const helpers = require('./utils/helpers');

// ==================== ESTADO GLOBAL ====================
let saldo = config.STRATEGY.INITIAL_BALANCE;
let operando = 0;
let balancePeak = saldo;

// ==================== CONEXIÓN ====================
const connection = new Connection(config.HELIUS.RPC_URL, {
    wsEndpoint: config.HELIUS.WSS_URL,
    commitment: 'processed',
});

// ==================== Banner ====================
console.log(
    chalk.cyan(
        figlet.textSync('SOLANA SCALPING', {
            font: 'ANSI Shadow',
            horizontalLayout: 'default',
        })
    )
);
console.log(chalk.gray('========================================='));
console.log(chalk.green('🔥 MODO: SCALPING EXTREMO CON COMPOUND'));
console.log(chalk.gray('=========================================\n'));

// ==================== INICIALIZACIÓN ====================
async function iniciar() {
    logger.info('🚀 Iniciando bot de scalping...');

    // Mostrar configuración
    console.log(chalk.yellow('📊 CONFIGURACIÓN:'));
    console.log(`   💰 Saldo Inicial: ${chalk.green(saldo.toFixed(4))} SOL`);
    console.log(`   📈 Inversión por Op: ${chalk.green(helpers.calcularInversion(saldo).toFixed(4))} SOL`);
    console.log(`   🎯 Take Profit: ${config.TRADING.TP_LEVELS.map(t => `+${t.percentage}%`).join(' / ')}`);
    console.log(`   🛑 Stop Loss: ${chalk.red(config.TRADING.STOP_LOSS)}%`);
    console.log(`   ⚡ Ops Paralelas: ${config.STRATEGY.MAX_PARALLEL_OPERATIONS}`);
    console.log(`   📱 Telegram: ${config.TELEGRAM.ENABLED ? chalk.green('ACTIVADO') : chalk.gray('DESACTIVADO')}`);
    console.log(chalk.gray('=========================================\n'));

    // Test de conexión
    try {
        const slot = await connection.getSlot();
        logger.info(`✅ Conectado a Solana Mainnet - Slot: ${slot}`);
    } catch (error) {
        logger.error('❌ Error de conexión: ' + error.message);
        process.exit(1);
    }

    // Monitor de slots
    connection.onSlotChange((slot) => {
        if (slot % 20 === 0) {
            const cambio = saldo - config.STRATEGY.INITIAL_BALANCE;
            const emoji = cambio >= 0 ? '📈' : '📉';
            process.stdout.write(
                `\r${chalk.gray(`[Slot: ${slot}]`)} ${emoji} ${chalk.green(saldo.toFixed(4))} SOL | ${chalk.yellow(operando)} ops activas`
            );
        }
    });

    // Escuchar Raydium
    connection.onLogs(
        config.PROGRAMS.RAYDIUM,
        ({ logs, signature }) => {
            if (logs.some(l => l.includes('initialize2') || l.includes('InitializeInstruction2'))) {
                manejarNuevoToken(signature, 'RAYDIUM');
            }
        },
        'processed'
    );

    // Escuchar Pump.fun
    connection.onLogs(
        config.PROGRAMS.PUMP,
        ({ logs, signature }) => {
            if (logs.some(l => l.includes('Create'))) {
                manejarNuevoToken(signature, 'PUMP');
            }
        },
        'processed'
    );

    logger.info('✅ Bot listo y escuchando nuevos tokens...');
}

// ==================== MANEJAR NUEVO TOKEN ====================
async function manejarNuevoToken(firmaTx, plataforma) {
    if (operando >= config.STRATEGY.MAX_PARALLEL_OPERATIONS) {
        return;
    }

    if (saldo < config.STRATEGY.MIN_INVESTMENT) {
        logger.alert('💸 Saldo insuficiente. Deteniendo bot.');
        mostrarEstadisticasFinales();
        process.exit();
    }

    operando++;
    const idOperacion = helpers.generateOperationId();
    const inversion = helpers.calcularInversion(saldo);

    saldo -= inversion;
    balancePeak = Math.max(balancePeak, saldo + inversion);

    logger.trade(`[${idOperacion}] Entrada: ${inversion.toFixed(4)} SOL en ${plataforma}`);
    
    if (config.TELEGRAM.ENABLED) {
        await telegram.sendTradeAlert({
            id: idOperacion,
            investment: inversion.toFixed(4),
            platform: plataforma,
        });
    }

    const tiempoEspera = helpers.calcularTiempoEspera();
    await helpers.sleep(tiempoEspera);

    await cerrarOperacion(firmaTx, inversion, idOperacion, plataforma);
    operando--;
}

// ==================== CERRAR OPERACIÓN ====================
async function cerrarOperacion(firmaTx, inversion, idOperacion, plataforma) {
    try {
        const tx = await connection.getParsedTransaction(firmaTx, {
            maxSupportedTransactionVersion: 0,
        });

        const balances = tx?.meta?.postTokenBalances || [];
        const token = balances.find(b => b.mint !== 'So11111111111111111111111111111111111111112');

        if (!token) {
            logger.loss(`[${idOperacion}] Token no encontrado. Reembolso.`);
            saldo += inversion;
            stats.recordOperation({
                id: idOperacion,
                profit: 0,
                percentage: 0,
                balance: saldo,
                platform: plataforma,
            });
            return;
        }

        const tokenData = await helpers.getTokenPrice(token.mint);

        if (!tokenData) {
            logger.loss(`[${idOperacion}] 💀 RUG PULL - Sin datos`);
            stats.recordOperation({
                id: idOperacion,
                profit: -inversion,
                percentage: -100,
                balance: saldo,
                platform: plataforma,
            });
            return;
        }

        // Evaluar estrategia
        const evaluacion = scalping.evaluarEntrada(tokenData);
        const resultado = scalping.calcularSalida(inversion, tokenData.priceChange5m);

        let dineroRecuperado = resultado.amountOut;

        // Bonus por racha
        const currentStreak = stats.stats.currentStreak;
        if (currentStreak >= 3) {
            const bonus = 1 + (currentStreak * 0.02);
            dineroRecuperado *= bonus;
            logger.info(`🔥 Bonus por racha: +${((bonus - 1) * 100).toFixed(1)}%`);
        }

        saldo += dineroRecuperado;
        const profit = dineroRecuperado - inversion;
        const percentage = (profit / inversion) * 100;

        // Registrar estadísticas
        stats.recordOperation({
            id: idOperacion,
            profit,
            percentage,
            balance: saldo,
            platform: plataforma,
            token: token.mint,
        });

        // Logs
        if (profit > 0) {
            logger.profit(`[${idOperacion}] ✅ +${percentage.toFixed(2)}% | +${profit.toFixed(4)} SOL`);
        } else {
            logger.loss(`[${idOperacion}] ❌ ${percentage.toFixed(2)}% | ${profit.toFixed(4)} SOL`);
        }

        logger.info(`💼 Saldo: ${saldo.toFixed(4)} SOL | Próxima inversión: ${helpers.calcularInversion(saldo).toFixed(4)} SOL`);

        // Alerta Telegram
        if (config.TELEGRAM.ENABLED) {
            await telegram.sendProfitAlert({
                id: idOperacion,
                profit,
                percentage,
                balance: saldo,
                streak: stats.stats.currentStreak,
            });
        }

    } catch (error) {
        logger.error(`[${idOperacion}] Error: ${error.message}`);
        saldo += inversion;

        if (config.TELEGRAM.ENABLED) {
            await telegram.sendErrorAlert(error);
        }
    }
}

// ==================== ESTADÍSTICAS FINALES ====================
function mostrarEstadisticasFinales() {
    const resumen = stats.getSummary();
    const crecimiento = (((saldo - config.STRATEGY.INITIAL_BALANCE) / config.STRATEGY.INITIAL_BALANCE) * 100).toFixed(2);

    console.log('\n' + chalk.gray('========================================='));
    console.log(chalk.cyan('📊 ESTADÍSTICAS FINALES'));
    console.log(chalk.gray('========================================='));
    console.log(`⏱️  Tiempo de Ejecución: ${chalk.yellow(resumen.runtime)}`);
    console.log(`📈 Operaciones Totales: ${chalk.white(resumen.totalOperations)}`);
    console.log(`✅ Ganadas: ${chalk.green(resumen.wins)}`);
    console.log(`❌ Perdidas: ${chalk.red(resumen.losses)}`);
    console.log(`🎯 Win Rate: ${chalk.cyan(resumen.winRate)}%`);
    console.log(`📊 Profit Factor: ${chalk.yellow(resumen.profitFactor)}`);
    console.log(`🔥 Mejor Racha: ${chalk.magenta(resumen.bestStreak)}`);
    console.log(`💰 Saldo Final: ${chalk.green(saldo.toFixed(4))} SOL`);
    console.log(`📈 Crecimiento: ${crecimiento >= 0 ? chalk.green('+') : chalk.red('')}${crecimiento}%`);
    console.log(chalk.gray('=========================================\n'));
}

// ==================== INICIAR ====================
iniciar().catch(err => {
    logger.error('❌ ERROR CRÍTICO: ' + err.message);
    mostrarEstadisticasFinales();
    process.exit(1);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', () => {
    console.log('\n\n' + chalk.yellow('🛑 Deteniendo bot...'));
    mostrarEstadisticasFinales();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception: ' + err.message);
    mostrarEstadisticasFinales();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection: ' + reason);
    mostrarEstadisticasFinales();
    process.exit(1);
});
