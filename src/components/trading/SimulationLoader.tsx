"use client";

import { Loader2 } from "lucide-react";

interface SimulationLoaderProps {
  message: string;
}

export default function SimulationLoader({ message }: SimulationLoaderProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
      <div className="text-center space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-green-500 mx-auto" />
          <div className="absolute inset-0 blur-xl bg-green-500/20 rounded-full" />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Iniciando TimeWarp</h2>
          <p className="text-gray-400">{message || "Preparando simulação..."}</p>
        </div>

        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-green-500 animate-pulse rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}
