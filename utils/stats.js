const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '../stats/trading-stats.json');

// Crear directorio de stats si no existe
const statsDir = path.join(__dirname, '../stats');
if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
}

class StatsManager {
    constructor() {
        this.stats = this.loadStats();
    }

    loadStats() {
        try {
            if (fs.existsSync(statsFile)) {
                return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error.message);
        }

        return {
            totalOperations: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            totalLoss: 0,
            bestStreak: 0,
            currentStreak: 0,
            highestBalance: 0,
            lowestBalance: 0,
            startTime: new Date().toISOString(),
            operations: [],
        };
    }

    saveStats() {
        try {
            fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.error('Error guardando estadísticas:', error.message);
        }
    }

    recordOperation(result) {
        this.stats.totalOperations++;
        this.stats.operations.push({
            ...result,
            timestamp: new Date().toISOString(),
        });

        if (result.profit > 0) {
            this.stats.wins++;
            this.stats.currentStreak++;
            this.stats.totalProfit += result.profit;
            
            if (this.stats.currentStreak > this.stats.bestStreak) {
                this.stats.bestStreak = this.stats.currentStreak;
            }
        } else {
            this.stats.losses++;
            this.stats.currentStreak = 0;
            this.stats.totalLoss += Math.abs(result.profit);
        }

        if (result.balance > this.stats.highestBalance) {
            this.stats.highestBalance = result.balance;
        }

        if (this.stats.lowestBalance === 0 || result.balance < this.stats.lowestBalance) {
            this.stats.lowestBalance = result.balance;
        }

        this.saveStats();
    }

    getWinRate() {
        if (this.stats.totalOperations === 0) return 0;
        return ((this.stats.wins / this.stats.totalOperations) * 100).toFixed(2);
    }

    getProfitFactor() {
        if (this.stats.totalLoss === 0) return this.stats.totalProfit;
        return (this.stats.totalProfit / this.stats.totalLoss).toFixed(2);
    }

    getSummary() {
        return {
            ...this.stats,
            winRate: this.getWinRate(),
            profitFactor: this.getProfitFactor(),
            runtime: this.getRuntime(),
        };
    }

    getRuntime() {
        const start = new Date(this.stats.startTime);
        const now = new Date();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    reset() {
        this.stats = this.loadStats();
        this.stats.startTime = new Date().toISOString();
        this.saveStats();
    }
}

module.exports = new StatsManager();
