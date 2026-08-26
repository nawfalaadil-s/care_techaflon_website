import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'techaflon-intro-seen'
const VIDEO_SRC = '/doom.mp4'

/**
 * Intro phases:
 *   VIDEO         – doom.mp4 plays fullscreen, muted
 *   FADE_VIDEO    – video fades to black
 *   TITLE         – "TECHAFLON" fades in with green glow
 *   FADE_TITLE    – title fades out
 *   DONE          – unmount
 */
type Phase = 'VIDEO' | 'FADE_VIDEO' | 'TITLE' | 'FADE_TITLE' | 'DONE'

interface VideoIntroProps {
  onComplete: () => void
}

export function VideoIntro({ onComplete }: VideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('VIDEO')
  const completedRef = useRef(false)

  // Respect reduced motion — skip intro entirely
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      localStorage.setItem(STORAGE_KEY, '1')
      onComplete()
    }
  }, [onComplete])

  function advance(next: Phase, delay: number) {
    setTimeout(() => setPhase(next), delay)
  }

  function handleVideoEnd() {
    if (phase !== 'VIDEO') return
    // 1. Fade video out
    setPhase('FADE_VIDEO')
    // 2. After fade, show title
    advance('TITLE', 600)
    // 3. Hold title, then fade it
    advance('FADE_TITLE', 2600)
    // 4. Unmount
    setTimeout(() => {
      if (completedRef.current) return
      completedRef.current = true
      localStorage.setItem(STORAGE_KEY, '1')
      onComplete()
    }, 3400)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video layer */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted
        playsInline
        loop={false}
        onEnded={() => handleVideoEnd()}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-600 ${
          phase === 'FADE_VIDEO' || phase === 'TITLE' || phase === 'FADE_TITLE'
            ? 'opacity-0'
            : 'opacity-100'
        }`}
      />

      {/* TECHAFLON title layer */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-800 ${
          phase === 'TITLE'
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="text-center">
          <h1
            className="font-display text-6xl font-bold tracking-tight text-foreground sm:text-8xl lg:text-9xl"
            style={{
              textShadow:
                '0 0 20px rgba(123,203,127,0.5), 0 0 60px rgba(79,143,90,0.35), 0 0 120px rgba(79,143,90,0.15)',
              animation: 'title-breathe 2s ease-in-out infinite',
            }}
          >
            TECHAFLON
          </h1>
          <p
            className="mt-4 font-display text-sm font-bold tracking-[0.25em] text-primary/70 sm:text-lg"
            style={{
              textShadow: '0 0 12px rgba(123,203,127,0.3)',
            }}
          >
            THE DOOMSDAY PROTOCOL
          </p>
        </div>
      </div>

      {/* Global fade overlay for final transition */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-800 ${
          phase === 'FADE_TITLE' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <style>{`
        @keyframes title-breathe {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }
      `}</style>
    </div>
  )
}
