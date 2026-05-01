"use client";

import { useEffect, useRef, useState } from "react";
import { useTradingStore } from "@/store/tradingStore";

export default function ChartCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  
  const { priceHistory, currentPrice } = useTradingStore();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Configurar grid
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 0.5;
    
    for (let y = 0; y <= dimensions.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    // Calcular escalas
    const minPrice = Math.min(...priceHistory.slice(-50));
    const maxPrice = Math.max(...priceHistory.slice(-50));
    const priceRange = maxPrice - minPrice;

    if (priceHistory.length === 0) return;

    // Desenhar linha de preço
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();

    priceHistory.forEach((pt, index) => {
      const x = (index / 50) * dimensions.width;
      const y = dimensions.height - ((pt - minPrice) / priceRange) * dimensions.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Ponto atual do preço
    const lastX = dimensions.width - 10;
    const lastY = dimensions.height - ((currentPrice - minPrice) / priceRange) * dimensions.height;
    
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Preço label
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText(`$${currentPrice.toFixed(2)}`, lastX + 8, lastY - 8);

  }, [priceHistory, currentPrice, dimensions]);

  return (
    <div 
      ref={containerRef} 
      className="bg-gray-800 rounded-lg p-4 relative"
      style={{ minHeight: "350px", height: "400px" }}
    >
      <h2 className="text-sm font-semibold text-gray-400 mb-2">Gráfico em Tempo Real</h2>
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="w-full h-auto"
      />
    </div>
  );
}
