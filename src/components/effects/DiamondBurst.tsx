"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useCelebratedCallHit } from "@/hooks/useCelebratedCallHit";
import {
  buildDiamondBurstParticles,
  type DiamondBurstParticle,
} from "@/lib/effects/diamond-burst-particles";

// Overlay must outlive the ~1.2s banner spring so exit fades feel finished,
// not cut off — the hook clears its own timer on unmount.
const BURST_LIFETIME_MS = 1400;
const BURST_PARTICLE_COUNT = 14;

const REWARD_BANNER_SPRING: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 18,
  opacity: { duration: 0.25 },
};
const REWARD_BANNER_INSTANT: Transition = { duration: 0.15 };

function prefersReducedMotion(): boolean {
  // jsdom has no matchMedia, and SSR has no window — treat both as "motion ok".
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-screen celebration overlay for rewarded called shots: a 💎/✨ burst
 * near the header plus a big "+N 💎" banner. Renders an empty layer between
 * hits and swallows no clicks (pointer-events-none).
 *
 * Example: mounted once in Header — <DiamondBurst />
 */
export default function DiamondBurst() {
  const celebratedHit = useCelebratedCallHit(BURST_LIFETIME_MS);
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {celebratedHit !== null && (
          <CallHitCelebration
            key={celebratedHit.resolvedAt}
            reward={celebratedHit.reward}
            streak={celebratedHit.streak}
            seed={celebratedHit.resolvedAt}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface CallHitCelebrationProps {
  reward: number;
  streak: number;
  seed: number;
}

function CallHitCelebration({ reward, streak, seed }: CallHitCelebrationProps) {
  const reducedMotion = prefersReducedMotion();
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {!reducedMotion && <DiamondParticleField seed={seed} />}
      <RewardBanner reward={reward} streak={streak} reducedMotion={reducedMotion} />
    </motion.div>
  );
}

function DiamondParticleField({ seed }: { seed: number }) {
  // Seeded by resolvedAt: each hit gets a unique burst, replays identically.
  const particles = buildDiamondBurstParticles(BURST_PARTICLE_COUNT, seed);
  return (
    <div className="absolute left-1/2 top-16" data-testid="diamond-burst-particles">
      {particles.map((particle) => (
        <BurstParticle key={particle.id} particle={particle} />
      ))}
    </div>
  );
}

function BurstParticle({ particle }: { particle: DiamondBurstParticle }) {
  const angleRad = (particle.angleDeg * Math.PI) / 180;
  return (
    <motion.span
      className="absolute text-2xl select-none"
      initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
      animate={{
        x: Math.cos(angleRad) * particle.distancePx,
        y: Math.sin(angleRad) * particle.distancePx,
        scale: particle.scale,
        opacity: 0,
      }}
      transition={{ duration: 0.9, delay: particle.delayMs / 1000, ease: "easeOut" }}
    >
      {particle.emoji}
    </motion.span>
  );
}

interface RewardBannerProps {
  reward: number;
  streak: number;
  reducedMotion: boolean;
}

function RewardBanner({ reward, streak, reducedMotion }: RewardBannerProps) {
  return (
    <motion.div
      className="absolute inset-x-0 top-[28%] flex flex-col items-center gap-1"
      initial={reducedMotion ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
      animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: -36 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? REWARD_BANNER_INSTANT : REWARD_BANNER_SPRING}
    >
      <span className="text-5xl md:text-6xl font-black font-mono text-crypto-accent drop-shadow-[0_0_24px_rgba(124,92,255,0.65)]">
        +{reward} 💎
      </span>
      {streak > 1 && (
        <span className="text-xl font-bold text-crypto-warning drop-shadow-[0_0_12px_rgba(255,176,32,0.6)]">
          ×{streak}
        </span>
      )}
    </motion.div>
  );
}
