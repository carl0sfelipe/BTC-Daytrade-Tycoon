"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowLeft, Eye, EyeOff, Mail, Lock, User, ChevronRight } from "lucide-react";
import { setFakeUser } from "@/lib/fake-auth";

type AuthMode = "login" | "signup";

interface AuthPageProps {
  mode: AuthMode;
}

export default function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(mode);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setFakeUser({ username: username || "Trader", email: email || "demo@example.com" });
      router.push("/trading");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-crypto-text-secondary hover:text-crypto-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center shadow-glow-accent mx-auto mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">BTC Daytrade Tycoon</h1>
            <p className="text-sm text-crypto-text-secondary mt-1">
              {authMode === "login" ? "Bem-vindo de volta" : "Crie sua conta gratuita"}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-crypto-surface-elevated border border-crypto-border mb-6">
            <button
              onClick={() => {
                setAuthMode("login");
                router.push("/auth/login");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === "login" ? "bg-crypto-accent text-white shadow-glow-accent" : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                router.push("/auth/signup");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === "signup" ? "bg-crypto-accent text-white shadow-glow-accent" : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Nome de Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crypto-text-muted" />
                  <input
                    type="text"
                    placeholder="Seu apelido"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crypto-text-muted" />
                <input
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crypto-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crypto-text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-crypto-accent text-white font-bold hover:bg-crypto-accent/90 transition-all shadow-glow-accent flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === "login" ? "Entrar" : "Criar Conta"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-crypto-border" />
            <span className="text-xs text-crypto-text-muted">ou</span>
            <div className="h-px flex-1 bg-crypto-border" />
          </div>

          {/* Demo */}
          <button
            onClick={() => router.push("/trading")}
            className="w-full py-3 rounded-xl bg-crypto-surface-elevated border border-crypto-border text-sm font-semibold text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            Continuar como Visitante (Demo)
          </button>

          {/* Footer hint */}
          <p className="text-center text-xs text-crypto-text-muted mt-6">
            {authMode === "login" ? (
              <>
                Não tem conta?{" "}
                <button onClick={() => router.push("/auth/signup")} className="text-crypto-accent hover:underline">
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => router.push("/auth/login")} className="text-crypto-accent hover:underline">
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
