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
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-crypto-text-secondary hover:text-crypto-text transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => router.push("/auth/signup")}
            className="px-4 py-2 rounded-lg bg-crypto-accent text-white text-sm font-semibold hover:bg-crypto-accent/90 transition-all shadow-glow-accent"
          >
            Criar Conta
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-crypto-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crypto-accent-dim border border-crypto-accent/20 mb-6">
            <Star className="w-3.5 h-3.5 text-crypto-accent" />
            <span className="text-xs font-medium text-crypto-accent">Simulador de Futuros #1</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Treine Daytrade
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crypto-accent to-crypto-cyan">Sem Risco Real</span>
          </h1>

          <p className="text-lg text-crypto-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            A única plataforma que te joga em dias reais do Bitcoin entre 2017–2020 em velocidade 60x. Aprenda a ler o mercado às cegas, sem viés de data.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => router.push("/auth/signup")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-crypto-accent text-white font-bold hover:bg-crypto-accent/90 transition-all shadow-glow-accent text-lg"
            >
              Começar Grátis
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/trading")}
              className="px-8 py-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border text-crypto-text font-semibold hover:border-crypto-text-muted transition-all text-lg"
            >
              Testar Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">12K+</p>
              <p className="text-xs text-crypto-text-muted mt-1">Traders Ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">1.2M+</p>
              <p className="text-xs text-crypto-text-muted mt-1">Simulações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-crypto-text">4.9★</p>
              <p className="text-xs text-crypto-text-muted mt-1">Avaliação</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Como Funciona o <span className="text-crypto-accent">TimeWarp</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-accent-dim flex items-center justify-center">
                <Clock className="w-6 h-6 text-crypto-accent" />
              </div>
              <h3 className="text-lg font-bold">TimeWarp 60x</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">Um segundo real = um minuto de mercado. Simule meses de daytrade em poucas horas.</p>
            </div>

            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-cyan/10 flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-crypto-cyan" />
              </div>
              <h3 className="text-lg font-bold">Blind Date</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">A data histórica fica escondida. Você não sabe se está no topo de 2017 ou no crash de 2020.</p>
            </div>

            <div className="card-surface p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-crypto-warning-dim flex items-center justify-center">
                <Gauge className="w-6 h-6 text-crypto-warning" />
              </div>
              <h3 className="text-lg font-bold">Alavancagem Real</h3>
              <p className="text-sm text-crypto-text-secondary leading-relaxed">De 2x a 100x. Sinta na pele como a liquidação acontece — sem perder dinheiro de verdade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Preview */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Interface Profissional</h2>
          <p className="text-crypto-text-secondary mb-10">O mesmo visual dos melhores exchanges, gamificado para aprendizado</p>

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
                      const isGreen = Math.random() > 0.4;
                      const h = 20 + Math.random() * 50;
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
                    <span className="text-[10px] text-crypto-text-muted">Alavancagem</span>
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
          <h2 className="text-3xl font-bold text-center mb-12">Recursos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={TrendingUp} title="PnL em Tempo Real" desc="Acompanhe seu profit/loss instantaneamente a cada tick de preço" />
            <FeatureCard icon={Shield} title="Risk Gauge" desc="Barra visual que mostra sua distância da liquidação" />
            <FeatureCard icon={BarChart3} title="Dados Reais Binance" desc="Candles de 1 minuto reais entre 2017 e 2020" />
            <FeatureCard icon={Activity} title="Volatilidade Dinâmica" desc="Alertas automáticos quando o mercado fica instável" />
            <FeatureCard icon={Users} title="Ranking Global" desc="Compita com outros traders por retorno percentual" />
            <FeatureCard icon={Star} title="Conquistas" desc="Desbloqueie badges por performance e consistência" />
            <FeatureCard icon={Clock} title="60x Speed" desc="Simule um dia inteiro de trading em 24 minutos reais" />
            <FeatureCard icon={Zap} title="Zero Risco" desc="Aprenda com dinheiro fictício. Erre à vontade." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 border-t border-crypto-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para virar um trader?</h2>
          <p className="text-crypto-text-secondary mb-8">Crie sua conta gratuita em segundos. Não pedimos cartão de crédito.</p>
          <button
            onClick={() => router.push("/auth/signup")}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-crypto-long text-black font-bold hover:bg-crypto-long/90 transition-all shadow-glow-long text-lg mx-auto"
          >
            Criar Conta Grátis
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
        <p className="text-xs text-crypto-text-muted">Simulador educacional. Não é exchange real. Crypto pode ser volátil.</p>
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
