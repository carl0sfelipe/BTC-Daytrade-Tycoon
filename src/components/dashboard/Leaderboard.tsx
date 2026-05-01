"use client";

export default function Leaderboard() {
  const fakeRankings = [
    { rank: 1, name: "WhaleBot_α", pnl: 25430 },
    { rank: 2, name: "CryptoKing99", pnl: 18750 },
    { rank: 3, name: "MoonBoy_Pro", pnl: 12340 },
    { rank: 4, name: "Satoshi_Fan", pnl: 8920 },
    { rank: 5, name: "HODLer_Elite", pnl: 6750 },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        🏆 Ranking Diário Top Traders
      </h3>

      <div className="space-y-2">
        {fakeRankings.map((entry) => (
          <div 
            key={entry.rank}
            className={`flex items-center justify-between p-2 rounded ${entry.rank <= 3 ? "bg-yellow-900/10" : ""}`}
          >
            <div className="flex items-center space-x-2">
              {entry.rank === 1 && <span>🥇</span>}
              {entry.rank === 2 && <span>🥈</span>}
              {entry.rank === 3 && <span>🥉</span>}
              {entry.rank > 3 && <span className="text-gray-500">#{entry.rank}</span>}
              
              <span className="text-sm font-medium">{entry.name}</span>
            </div>
            
            <span className={`font-bold ${entry.pnl >= 0 ? "text-green-400" : ""}`}>
              +${entry.pnl.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Copy Bot */}
      <button 
        onClick={() => alert("Copy Bot ativado!")}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm font-medium transition-colors"
      >
        🤖 Copiar Robô IA (+15% hoje)
      </button>
    </div>
  );
}
