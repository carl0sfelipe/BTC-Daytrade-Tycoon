"use client";

import { useState } from "react";
import { useTradingStore } from "@/store/tradingStore";

export default function TradeControls() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [leverage, setLeverage] = useState(10);
  const [positionSize, setPositionSize] = useState(1000);
  const [limitPrice, setLimitPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");

  const { openPosition, closePosition, wallet, position, currentPrice } = useTradingStore();

  const margin = positionSize / leverage;
  const canOpen = wallet >= margin;

  const handleOpen = () => {
    if (!canOpen) return;
    openPosition(
      side,
      leverage,
      positionSize,
      tpPrice,
      slPrice,
      orderType === "limit" ? limitPrice : null
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Controles de Ordem</h3>

      {/* Side tabs */}
      <div className="flex mb-3 rounded overflow-hidden">
        <button
          onClick={() => setSide("long")}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
            side === "long"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => setSide("short")}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
            side === "short"
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          SHORT
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-2 mb-3">
        {(["market", "limit"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              orderType === type
                ? "bg-gray-600 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {type === "market" ? "Mercado" : "Limite"}
          </button>
        ))}
      </div>

      {/* Limit price */}
      {orderType === "limit" && (
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">
            Preço Limite (USD)
          </label>
          <input
            type="number"
            placeholder={currentPrice.toFixed(2)}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-gray-700 text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Alavancagem */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          Alavancagem: {leverage}x
        </label>
        <input
          type="range"
          min="2"
          max="100"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* Tamanho da posição */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          Tamanho (USD): ${positionSize}
        </label>
        <input
          type="range"
          min="100"
          max={Math.max(100, Math.floor(wallet))}
          step="100"
          value={positionSize}
          onChange={(e) => setPositionSize(Number(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* TP/SL */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          type="number"
          placeholder="Take Profit"
          value={tpPrice}
          onChange={(e) => setTpPrice(e.target.value)}
          className="w-full bg-gray-700 text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <input
          type="number"
          placeholder="Stop Loss"
          value={slPrice}
          onChange={(e) => setSlPrice(e.target.value)}
          className="w-full bg-gray-700 text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* Action buttons */}
      {position ? (
        <button
          onClick={() => closePosition("manual")}
          className="w-full font-bold py-2 px-4 rounded bg-red-600 hover:bg-red-700 transition-colors text-white"
        >
          FECHAR POSIÇÃO
        </button>
      ) : (
        <button
          onClick={handleOpen}
          disabled={!canOpen}
          className={`w-full font-bold py-2 px-4 rounded transition-colors text-white ${
            canOpen
              ? side === "long"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {side === "long" ? "ABRIR LONG" : "ABRIR SHORT"}
        </button>
      )}

      {/* Margem usada */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Margem:</span>
          <span>${margin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-400">Disponível:</span>
          <span>${wallet.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
