import type { CSSProperties } from 'react'

import { cn } from '@/lib/cn'

/**
 * DOOM CORE — original TechAFlon hero visual.
 *
 * An original Doom-inspired technological core (no movie artwork): a
 * pulsing emerald energy sphere wrapped in rotating metallic rings, a
 * sweeping energy arc, floating fragments, drifting particles, fog,
 * volumetric glow and a holographic scanline. Pure CSS/SVG — no WebGL.
 * All motion utilities are disabled under `prefers-reduced-motion`.
 */

const PARTICLES = [
  { left: '10%', top: '78%', dx: '46px', dy: '-190px', delay: '0s', size: 3 },
  { left: '22%', top: '88%', dx: '-30px', dy: '-220px', delay: '1.4s', size: 2 },
  { left: '38%', top: '94%', dx: '60px', dy: '-240px', delay: '2.8s', size: 3 },
  { left: '55%', top: '86%', dx: '-50px', dy: '-200px', delay: '0.7s', size: 2 },
  { left: '70%', top: '92%', dx: '36px', dy: '-230px', delay: '2s', size: 3 },
  { left: '84%', top: '80%', dx: '-42px', dy: '-180px', delay: '3.4s', size: 2 },
  { left: '90%', top: '64%', dx: '-28px', dy: '-160px', delay: '1s', size: 2 },
  { left: '6%', top: '58%', dx: '34px', dy: '-150px', delay: '4.1s', size: 2 },
] as const

const FRAGMENTS = [
  { left: '13%', top: '16%', w: 14, h: 8, rotate: '24deg', delay: '0.5s' },
  { left: '82%', top: '12%', w: 10, h: 14, rotate: '-18deg', delay: '1.8s' },
  { left: '8%', top: '52%', w: 8, h: 12, rotate: '40deg', delay: '2.6s' },
  { left: '88%', top: '56%', w: 12, h: 6, rotate: '-32deg', delay: '1.1s' },
] as const

export function DoomCore({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative mx-auto aspect-square w-full max-w-[420px]', className)}
    >
      {/* Volumetric reactor glow */}
      <div
        className="animate-reactor-pulse absolute inset-[-18%] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(123,203,127,0.22) 0%, rgba(79,143,90,0.09) 45%, transparent 72%)',
        }}
      />

      {/* Slow-drifting atmospheric fog */}
      <div
        className="animate-fog-drift absolute inset-[-28%] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 62% 38%, rgba(79,143,90,0.14) 0%, transparent 60%)',
        }}
      />
      {/* Metallic + holographic rings */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        {/* Outer tick ring */}
        <g className="animate-reactor-rotate" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="192" stroke="rgba(143,153,147,0.35)" strokeWidth="1" strokeDasharray="1.5 9" />
          <circle cx="200" cy="200" r="182" stroke="rgba(79,143,90,0.35)" strokeWidth="1" strokeDasharray="26 118" />
        </g>

        {/* Segmented armor ring (reverse rotation) */}
        <g
          className="animate-reactor-rotate-reverse"
          style={{ transformOrigin: '200px 200px' }}
        >
          <circle
            cx="200" cy="200" r="152"
            stroke="rgba(200,208,203,0.4)" strokeWidth="2.5"
            strokeDasharray="64 22 110 30" strokeLinecap="round" opacity="0.7"
          />
          <circle cx="200" cy="200" r="140" stroke="rgba(123,203,127,0.25)" strokeWidth="1" strokeDasharray="4 14" />
        </g>

        {/* Inner fast ring with orbiting nodes */}
        <g
          className="animate-reactor-rotate-fast"
          style={{ transformOrigin: '200px 200px' }}
        >
          <circle cx="200" cy="200" r="106" stroke="rgba(143,153,147,0.45)" strokeWidth="1.5" />
          <circle cx="306" cy="200" r="4" fill="#7BCB7F" />
          <circle cx="200" cy="94" r="2.5" fill="rgba(123,203,127,0.6)" />
        </g>

        {/* Static crosshair accents */}
        <path
          d="M200 20 v18 M200 362 v18 M20 200 h18 M362 200 h18"
          stroke="rgba(123,203,127,0.35)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Sweeping energy arc */}
      <div
        className="animate-reactor-rotate absolute inset-[17%] rounded-full"
        style={
          {
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(123,203,127,0.65) 55deg, rgba(123,203,127,0.08) 95deg, transparent 130deg)',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))',
          } as CSSProperties
        }
      />

      {/* Holographic scanline (clipped to the core disc) */}
      <div className="absolute inset-[24%] overflow-hidden rounded-full">
        <div className="animate-scanline absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
      </div>

      {/* Drifting energy particles */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="animate-particle-drift absolute rounded-full bg-primary-bright"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                boxShadow: '0 0 8px rgba(123,203,127,0.9)',
                '--drift-x': p.dx,
                '--drift-y': p.dy,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Floating metallic fragments */}
      {FRAGMENTS.map((f, i) => (
        <span
          key={i}
          className="animate-hologram-float absolute border border-steel/50 bg-surface-metal/70 shadow-card"
          style={{
            left: f.left,
            top: f.top,
            width: f.w,
            height: f.h,
            rotate: f.rotate,
            animationDelay: f.delay,
          }}
        />
      ))}

      {/* Containment shell */}
      <div className="absolute inset-[31%] rounded-full border border-steel/40 bg-black/25 backdrop-blur-[2px]" />

      {/* The core itself */}
      <div
        className="animate-core-breathe absolute left-1/2 top-1/2 h-[27%] w-[27%] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 38% 32%, #ECFCEC 0%, #7BCB7F 30%, #2E6B39 64%, #07130A 100%)',
          boxShadow:
            '0 0 34px rgba(123,203,127,0.55), 0 0 90px rgba(79,143,90,0.35), inset 0 0 22px rgba(3,5,4,0.55)',
        }}
      />
    </div>
  )
}
