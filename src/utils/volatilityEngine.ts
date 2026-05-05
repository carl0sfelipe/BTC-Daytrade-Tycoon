export interface VolatilityData {
  currentVolatility: number;
  historicalVolatility: number[];
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns = prices.slice(1).map((price, i) => price - prices[i]);
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

export function calculateHistoricalVolatility(prices: number[], period: number = 14): number[] {
  const volatilitys: number[] = [];
  
  for (let i = 0; i < prices.length - period + 1; i++) {
    const slice = prices.slice(i, i + period);
    volatilitys.push(calculateVolatility(slice));
  }
  
  return volatilitys;
}

export function determineTrend(prices: number[], shortPeriod: number = 20): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (prices.length < shortPeriod) {
    return "NEUTRAL";
  }

  const recentPrices = prices.slice(-shortPeriod);
  const maShort = calculateMovingAverage(recentPrices, 5);
  const maLong = calculateMovingAverage(recentPrices, 10);
  
  if (maShort > maLong) return "BULLISH";
  if (maShort < maLong) return "BEARISH";
  return "NEUTRAL";
}

export function calculateMovingAverage(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function generateVolatilityEngine(): VolatilityData {
  const historicalVolatilitys: number[] = Array.from({ length: 50 }, () => 
    Math.random() * 3 + 1.5 // Random volatility between 1.5 and 4.5
  );

  return {
    currentVolatility: calculateVolatility(historicalVolatilitys),
    historicalVolatility: historicalVolatilitys,
    trend: determineTrend(historicalVolatilitys),
  };
}
