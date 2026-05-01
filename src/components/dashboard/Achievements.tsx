"use client";

import { useEffect, useState } from "react";

export default function Achievements() {
  const [achievements, setAchievements] = useState([
    { 
      id: "first_trade", 
      name: "Primeira Trade", 
      desc: "Abra sua primeira posição", 
      unlocked: true,
      icon: "🎯"
    },
    { 
      id: "big_winner", 
      name: "Grande Vencedor", 
      desc: "Lucro de $1000 em uma trade", 
      unlocked: false,
      icon: "💰"
    },
    { 
      id: "survivor", 
      name: "Sobrevivente", 
      desc: "Não foi liquidado nas primeiras 10 trades", 
      unlocked: false,
      icon: "🛡️"
    },
    { 
      id: "whale_hunter", 
      name: "Caçador de Whales", 
      desc: "Lucro total de $5000", 
      unlocked: false,
      icon: "🐋"
    }
  ]);

  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    // Carregar conquistas do localStorage
    const saved = localStorage.getItem("crypto_tycoon_achievements");
    if (saved) {
      const parsed = JSON.parse(saved);
      setAchievements(prev => prev.map(a => ({
        ...a,
        unlocked: parsed.includes(a.id)
      })));
      setUnlockedCount(parsed.length);
    }
  }, []);

  const unlockAchievement = (id: string) => {
    if (!achievements.find(a => a.id === id)?.unlocked) {
      const newUnlocked = [...achievements, ...achievements].findIndex(
        a => a.id === id && !a.unlocked
      );
      
      setAchievements(prev => prev.map(a => 
        a.id === id ? { ...a, unlocked: true } : a
      ));

      // Salvar no localStorage
      const currentUnlocked = achievements.filter(a => a.unlocked).map(a => a.id);
      if (!currentUnlocked.includes(id)) {
        localStorage.setItem(
          "crypto_tycoon_achievements", 
          JSON.stringify([...currentUnlocked, id])
        );
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        🏅 Conquistas 
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
          {unlockedCount}/4
        </span>
      </h3>

      <div className="space-y-2">
        {achievements.map((achievement) => (
          <div 
            key={achievement.id}
            className={`p-3 rounded flex items-center gap-3 ${
              achievement.unlocked ? "bg-green-900/10" : "bg-gray-700/50 opacity-60"
            }`}
          >
            <span className="text-2xl">{achievement.icon}</span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{achievement.name}</h4>
                {achievement.unlocked && (
                  <span className="text-green-500 text-xs">✓</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{achievement.desc}</p>
            </div>

            {!achievement.unlocked && (
              <button 
                onClick={() => unlockAchievement(achievement.id)}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-xs rounded"
              >
                Testar
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-center text-gray-500">
          Conquistas são salvas automaticamente no navegador
        </p>
      </div>
    </div>
  );
}
