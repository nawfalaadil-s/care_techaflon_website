import { useEffect, useRef, useState, useCallback } from 'react'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('VIDEO')
  const completedRef = useRef(false)

  const goFullscreen = useCallback(async (el: HTMLElement) => {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen()
      } else if ((el as any).webkitEnterFullscreen) {
        await (el as any).webkitEnterFullscreen()
      }
    } catch {
      // fullscreen not supported — continue without it
    }
  }, [])

  // Respect reduced motion — skip intro entirely
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      localStorage.setItem(STORAGE_KEY, '1')
      onComplete()
    }
  }, [onComplete])

  // On mount: request fullscreen + play video
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        goFullscreen(containerRef.current)
      }
      videoRef.current?.play().catch(() => {})
    }, 100)
    return () => clearTimeout(timer)
  }, [goFullscreen])

  function advance(next: Phase, delay: number) {
    setTimeout(() => setPhase(next), delay)
  }

  function handleVideoEnd() {
    if (phase !== 'VIDEO') return
    // Exit fullscreen before showing title
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as any).webkitFullscreenElement) {
        ;(document as any).webkitExitFullscreen?.()
      }
    } catch {}
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
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      style={{
        // Prevent iOS bounce, rubber-banding, and pinch zoom
        touchAction: 'none',
        overscrollBehavior: 'none',
        // Hide browser chrome on mobile
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {/* Video layer */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted
        playsInline
        loop={false}
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        onEnded={() => handleVideoEnd()}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          // Cover the entire screen including safe areas
          minHeight: '100vh',
          minWidth: '100vw',
          // iOS-specific: fill entire screen
          objectFit: 'cover',
          // Prevent iOS from stretching
          aspectRatio: 'auto',
        }}
      />

      {/* Black bars cover for letterboxing if needed */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-600 ${
          phase === 'FADE_VIDEO' || phase === 'TITLE' || phase === 'FADE_TITLE'
            ? 'opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* TECHAFLON title layer */}
      <div
        className={`absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-800 ${
          phase === 'TITLE'
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="text-center">
          <h1
            className="font-display font-bold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(3rem, 12vw, 10rem)',
              textShadow:
                '0 0 20px rgba(123,203,127,0.5), 0 0 60px rgba(79,143,90,0.35), 0 0 120px rgba(79,143,90,0.15)',
              animation: 'title-breathe 2s ease-in-out infinite',
            }}
          >
            TECHAFLON
          </h1>
          <p
            className="mt-4 font-display font-bold tracking-[0.25em] text-primary/70"
            style={{
              fontSize: 'clamp(0.7rem, 3vw, 1.125rem)',
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
        /* Lock body scroll during intro */
        html, body {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          touch-action: none !important;
          -webkit-overflow-scrolling: auto !important;
        }
        /* Hide address bar on mobile by extending to viewport */
        @supports (height: 100dvh) {
          .fixed.inset-0.z-50.bg-black {
            height: 100dvh;
          }
        }
      `}</style>
    </div>
  )
}
