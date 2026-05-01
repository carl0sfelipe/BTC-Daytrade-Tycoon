"use client";

import { useState, useEffect } from "react";
import { useTradingStore } from "@/store/tradingStore";

export default function TradeControls() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [leverage, setLeverage] = useState(10);
  const [positionSize, setPositionSize] = useState(1000);
  const [limitPrice, setLimitPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");

  const {
    openPosition,
    closePosition,
    updatePositionSize,
    updateLeverage,
    wallet,
    position,
    currentPrice,
  } = useTradingStore();

  // Sincroniza slider com tamanho da posição aberta
  useEffect(() => {
    if (position) {
      setPositionSize(position.size);
      setLeverage(position.leverage);
      setSide(position.side);
    }
  }, [position]);

  const margin = positionSize / leverage;
  const canOpen = wallet >= margin;

  // Quando posição está aberta, o máximo é size atual + o que dá pra adicionar com saldo
  const sliderMax = position
    ? position.size + Math.floor(wallet * leverage)
    : Math.max(100, Math.floor(wallet * leverage));

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

  const handleUpdate = () => {
    if (!position) return;
    updatePositionSize(positionSize);
  };

  const handleLeverageChange = (newLeverage: number) => {
    setLeverage(newLeverage);
    if (position) {
      updateLeverage(newLeverage);
    }
  };

  const sizeDiff = position ? positionSize - position.size : 0;
  const canIncrease = sizeDiff > 0 && wallet >= sizeDiff / leverage;
  const canDecrease = sizeDiff < 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Controles de Ordem</h3>

      {/* Side tabs — desabilitado quando posição aberta */}
      <div className="flex mb-3 rounded overflow-hidden">
        <button
          onClick={() => !position && setSide("long")}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
            side === "long"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          LONG
        </button>
        <button
          onClick={() => !position && setSide("short")}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
            side === "short"
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          SHORT
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-2 mb-3">
        {(["market", "limit"] as const).map((type) => (
          <button
            key={type}
            onClick={() => !position && setOrderType(type)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              orderType === type
                ? "bg-gray-600 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {type === "market" ? "Mercado" : "Limite"}
          </button>
        ))}
      </div>

      {/* Limit price */}
      {orderType === "limit" && !position && (
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
          onChange={(e) => handleLeverageChange(Number(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* Tamanho da posição */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          {position ? "Ajustar Tamanho" : "Tamanho da Posição"}: ${positionSize.toLocaleString()}
        </label>
        <input
          type="range"
          min="100"
          max={Math.max(100, sliderMax)}
          step="100"
          value={positionSize}
          onChange={(e) => setPositionSize(Number(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
          <span>$100</span>
          <span>${Math.floor(sliderMax).toLocaleString()}</span>
        </div>
        {position && (
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-gray-400">Atual: ${position.size.toLocaleString()}</span>
            {sizeDiff !== 0 && (
              <span className={sizeDiff > 0 ? "text-green-400" : "text-red-400"}>
                {sizeDiff > 0 ? "+" : ""}${sizeDiff.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TP/SL — só quando abrindo nova posição */}
      {!position && (
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
      )}

      {/* Action buttons */}
      {position ? (
        <div className="space-y-2">
          {sizeDiff > 0 && (
            <button
              onClick={handleUpdate}
              disabled={!canIncrease}
              className={`w-full font-bold py-2 px-4 rounded transition-colors text-white ${
                canIncrease
                  ? position.side === "long"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              AUMENTAR POSIÇÃO
            </button>
          )}
          {sizeDiff < 0 && (
            <button
              onClick={handleUpdate}
              className="w-full font-bold py-2 px-4 rounded bg-yellow-600 hover:bg-yellow-700 transition-colors text-white"
            >
              DIMINUIR POSIÇÃO
            </button>
          )}
          <button
            onClick={() => closePosition("manual")}
            className="w-full font-bold py-2 px-4 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-white border border-gray-600"
          >
            FECHAR POSIÇÃO
          </button>
        </div>
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
          <span className="text-gray-400">
            {position ? "Margem Total:" : "Margem:"}
          </span>
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
