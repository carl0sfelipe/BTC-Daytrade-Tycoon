"use client";

import { useState, useEffect } from "react";
import { Position } from "@/types/trading";

export function useTradingEngine() {
  const [balance, setBalance] = useState<number>(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Carregar estado do LocalStorage
    const savedState = localStorage.getItem("tradingEngine");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setBalance(parsed.balance || 10000);
        setPositions(parsed.positions || []);
      } catch {
        // Fallback to default values
      }
    }
  }, []);

  const openPosition = (side: "LONG" | "SHORT", price: number, amount: number, leverage: number) => {
    const newPosition: Position = {
      id: Date.now().toString(),
      symbol: "BTCUSDT",
      side,
      entryPrice: price,
      currentPrice: price,
      amount,
      leverage,
      openedAt: Date.now(),
    };

    setPositions((prev) => [...prev, newPosition]);
    setIsOpen(true);
  };

  const closePosition = (positionId: string, exitPrice: number) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;

    const pnl =
      position.side === "LONG"
        ? ((exitPrice - position.entryPrice) * position.amount) / (position.leverage / 100)
        : ((position.entryPrice - exitPrice) * position.amount) / (position.leverage / 100);

    setBalance((prev) => prev + pnl);

    setPositions((prev) =>
      prev.map((p) => (p.id === positionId ? { ...p, isClosed: true, currentPrice: exitPrice } : p))
    );
  };

  const updateCurrentPrices = (prices: Record<string, number>) => {
    setPositions((prev) =>
      prev.map((p) => ({
        ...p,
        currentPrice: prices[p.symbol] || p.currentPrice,
      }))
    );
  };

  return {
    balance,
    positions,
    isOpen,
    openPosition,
    closePosition,
    updateCurrentPrices,
  };
}
