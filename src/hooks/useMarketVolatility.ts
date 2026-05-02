"use client";

import { useEffect, useState } from "react";

export function useMarketVolatility() {
  const [volatility, setVolatility] = useState<number>(0);
  const [trend, setTrend] = useState<"BULLISH" | "BEARISH" | "NEUTRAL">("NEUTRAL");

  useEffect(() => {
    // Simulates volatility engine based on current price
    const calculateVolatility = (basePrice: number) => {
      return Math.random() * 5 + 2; // Volatilidade entre 2-7%
    };

    const calculateTrend = (price: number) => {
      if (price > 45000) return "BULLISH";
      if (price < 44000) return "BEARISH";
      return "NEUTRAL";
    };

    setVolatility(calculateVolatility(45000));
    setTrend(calculateTrend(45000));
  }, []);

  return { volatility, trend };
}
