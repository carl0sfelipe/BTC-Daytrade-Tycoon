"use client";

import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Clock, EyeOff, Gauge, TrendingUp, Shield, BarChart3, ChevronRight, Star, Users, Activity } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-crypto-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center shadow-glow-accent">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-none">BTC Daytrade</span>
            <span className="text-[10px] font-semibold text-crypto-accent tracking-widest uppercase leading-none mt-0.5">Tycoon</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-crypto-text-secondary hover:text-crypto-text transition-colors"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => router.push("/auth/signup")}
            className="px-4 py-2 rounded-lg bg-crypto-accent text-white text-sm font-semibold hover:bg-crypto-accent/90 transition-all shadow-glow-accent"
          >
            Create Account
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-crypto-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crypto-accent-dim border border-crypto-accent/20 mb-6">
            <Star className="w-3.5 h-3.5 text-crypto-accent" />
            <span className="text-xs font-medium text-crypto-accent">#1 Futures Simulator</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Master Day Trading
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crypto-accent to-crypto-cyan">Without Real Risk</span>
          </h1>

          <p className="text-lg text-crypto-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            The only platform that drops you into real Bitcoin days between 2017–2020 at 60x speed. Learn to read the market blind, without date bias.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/auth/signup")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-crypto-accent text-white font-bold hover:bg-crypto-accent/90 transition-all shadow-glow-accent text-lg"
            >
              Start Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/trading")}
              className="px-8 py-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border text-crypto-text font-semibold hover:border-crypto-text-muted transition-all text-lg"
            >
              Try Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">12K+</p>
              <p className="text-xs text-crypto-text-muted mt-1">Active Traders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">1.2M+</p>
              <p className="text-xs text-crypto-text-muted mt-1">Simulations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">4.9★</p>
              <p className="text-xs text-crypto-text-muted mt-1">Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How <span className="text-crypto-accent">TimeWarp</span> Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-accent-dim flex items-center justify-center">
                <Clock className="w-6 h-6 text-crypto-accent" />
              </div>
              <h3 className="text-lg font-bold">TimeWarp 60x</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">One real second = one market minute. Simulate months of day trading in just a few hours.</p>
            </div>

            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-cyan/10 flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-crypto-cyan" />
              </div>
              <h3 className="text-lg font-bold">Blind Date</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">The historical date is hidden. You don't know if you're at the 2017 top or the 2020 crash.</p>
            </div>

            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-warning-dim flex items-center justify-center">
                <Gauge className="w-6 h-6 text-crypto-warning" />
              </div>
              <h3 className="text-lg font-bold">Real Leverage</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">From 2x to 100x. Feel firsthand how liquidation happens — without losing real money.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Preview */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Professional Interface</h2>
          <p className="text-crypto-text-secondary mb-10">The same look as the top exchanges, gamified for learning</p>

          <div className="relative rounded-2xl overflow-hidden border border-crypto-border shadow-card">
            <div className="bg-crypto-surface p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-crypto-long" />
                  <span className="text-xs text-crypto-text-secondary">BTC/USDT</span>
                </div>
                <span className="text-lg font-bold font-mono text-crypto-text">$67,432.89</span>
                <span className="text-xs font-bold text-crypto-long">+1.88%</span>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 h-48 rounded-lg bg-crypto-bg border border-crypto-border relative overflow-hidden">
                  <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const isGreen = ((i * 7 + 3) % 10) > 4;
                      const h = 20 + ((i * 13 + 5) % 50);
                      return (
                        <div key={i} className="flex flex-col items-center" style={{ width: 4 }}>
                          <div className="w-px h-2" style={{ backgroundColor: isGreen ? "#00d4a8" : "#ff4757" }} />
                          <div className="w-full rounded-sm" style={{ height: h, backgroundColor: isGreen ? "#00d4a8" : "#ff4757", opacity: 0.6 }} />
                          <div className="w-px h-2" style={{ backgroundColor: isGreen ? "#00d4a8" : "#ff4757" }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-4 space-y-2">
                  <div className="p-2 rounded-lg bg-crypto-bg border border-crypto-border">
                    <span className="text-[10px] text-crypto-text-muted">LONG</span>
                    <p className="text-sm font-bold text-crypto-long">+$1,247.50</p>
                  </div>
                  <div className="p-2 rounded-lg bg-crypto-bg border border-crypto-border">
                    <span className="text-[10px] text-crypto-text-muted">Leverage</span>
                    <p className="text-sm font-bold text-crypto-accent">25x</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={TrendingUp} title="Real-Time PnL" desc="Track your profit/loss instantly on every price tick" />
            <FeatureCard icon={Shield} title="Risk Gauge" desc="Visual bar showing your distance from liquidation" />
            <FeatureCard icon={BarChart3} title="Real Binance Data" desc="Real 1-minute candles between 2017 and 2020" />
            <FeatureCard icon={Activity} title="Dynamic Volatility" desc="Automatic alerts when the market becomes unstable" />
            <FeatureCard icon={Users} title="Global Rankings" desc="Compete with other traders for percentage returns" />
            <FeatureCard icon={Star} title="Conquistas" desc="Unlock badges for performance and consistency" />
            <FeatureCard icon={Clock} title="60x Speed" desc="Simulate a full trading day in 24 real minutes" />
            <FeatureCard icon={Zap} title="Zero Risk" desc="Learn with fake money. Make mistakes freely." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to become a trader?</h2>
          <p className="text-crypto-text-secondary mb-8">Create your free account in seconds. No credit card required.</p>
          <button
            type="button"
            onClick={() => router.push("/auth/signup")}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-crypto-long text-black font-bold hover:bg-crypto-long/90 transition-all shadow-glow-long text-lg mx-auto"
          >
            Create Free Account
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-crypto-border text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-crypto-accent" />
          <span className="text-sm font-bold">BTC Daytrade Tycoon</span>
        </div>
        <p className="text-xs text-crypto-text-muted">Educational simulator. Not a real exchange. Crypto can be volatile.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="card-surface p-4 space-y-3 hover:border-crypto-accent/30 transition-all">
      <Icon className="w-5 h-5 text-crypto-accent" />
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="text-xs text-crypto-text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}
