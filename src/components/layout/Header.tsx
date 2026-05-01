import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-500">
            🚀 CryptoTycoon Pro
          </Link>
          
          <nav className="hidden md:flex space-x-6">
            <Link 
              href="/trading" 
              className="hover:text-green-400 transition-colors"
            >
              Terminal
            </Link>
            <Link 
              href="/leaderboard" 
              className="hover:text-green-400 transition-colors"
            >
              Ranking
            </Link>
            <Link 
              href="/achievements" 
              className="hover:text-green-400 transition-colors"
            >
              Conquistas
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400 hidden sm:block">
              Modo: Demo
            </span>
            <button 
              onClick={() => console.log("Exportar P&L")}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
