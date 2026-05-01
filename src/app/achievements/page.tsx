import Header from "@/components/layout/Header";
import Achievements from "@/components/dashboard/Achievements";

export default function AchievementsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Conquistas</h1>
        <Achievements />
      </main>
    </div>
  );
}
