import Header from "@/components/layout/Header";
import Leaderboard from "@/components/dashboard/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Ranking de Traders</h1>
        <Leaderboard />
      </main>
    </div>
  );
}
