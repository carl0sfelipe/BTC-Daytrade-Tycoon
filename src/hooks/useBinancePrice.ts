"use client";

import { useEffect, useState } from "react";

export function useBinancePrice(symbol: string = "BTCUSDT") {
  const [price, setPrice] = useState<number>(0);
  const [change24h, setChange24h] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrice(parseFloat(data.c));
      setChange24h(parseFloat(data.P));
      setIsLoading(false);
    };

    ws.onerror = () => {
      setIsLoading(true);
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return { price, change24h, isLoading };
}
