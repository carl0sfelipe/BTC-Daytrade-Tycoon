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
  const [formError, setFormError] = useState<string | null>(null);

  // NOTE: This is a demo-only authentication flow. No real auth backend is used.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (authMode === "signup" && !username.trim()) {
      setFormError("Username is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Please enter a valid email");
      return;
    }

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
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-crypto-text-secondary hover:text-crypto-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
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
              {authMode === "login" ? "Welcome back" : "Create your free account"}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-crypto-surface-elevated border border-crypto-border mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                router.push("/auth/login");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === "login" ? "bg-crypto-accent text-white shadow-glow-accent" : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                router.push("/auth/signup");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === "signup" ? "bg-crypto-accent text-white shadow-glow-accent" : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crypto-text-muted" />
                  <input
                    type="text"
                    placeholder="Your nickname"
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
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Password</label>
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
                <label className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider">Confirm Password</label>
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

            {formError && (
              <p className="text-xs text-crypto-short text-center">{formError}</p>
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
                  {authMode === "login" ? "Login" : "Create Account"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-crypto-border" />
            <span className="text-xs text-crypto-text-muted">or</span>
            <div className="h-px flex-1 bg-crypto-border" />
          </div>

          {/* Demo */}
          <button
            type="button"
            onClick={() => router.push("/trading")}
            className="w-full py-3 rounded-xl bg-crypto-surface-elevated border border-crypto-border text-sm font-semibold text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            Continue as Guest (Demo)
          </button>

          {/* Footer hint */}
          <p className="text-center text-xs text-crypto-text-muted mt-6">
            {authMode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" onClick={() => router.push("/auth/signup")} className="text-crypto-accent hover:underline">
                  Create now
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => router.push("/auth/login")} className="text-crypto-accent hover:underline">
                  Login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
