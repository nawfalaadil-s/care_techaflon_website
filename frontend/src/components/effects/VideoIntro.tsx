import { useEffect, useRef, useState, useCallback } from 'react'

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

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight
}

function getViewportWidth() {
  return window.visualViewport?.width ?? window.innerWidth
}

export function VideoIntro({ onComplete }: VideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('VIDEO')
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const completedRef = useRef(false)

  // Measure real viewport (handles on-screen keyboard, browser chrome changes)
  useEffect(() => {
    function update() {
      setDims({ w: getViewportWidth(), h: getViewportHeight() })
    }
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])

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
    setPhase('FADE_VIDEO')
    advance('TITLE', 600)
    advance('FADE_TITLE', 2600)
    setTimeout(() => {
      if (completedRef.current) return
      completedRef.current = true
      onComplete()
    }, 3400)
  }

  // Responsive title sizing based on actual viewport
  const isMobile = dims.w > 0 && dims.w < 640
  const isTablet = dims.w >= 640 && dims.w < 1024
  const titleSize = isMobile
    ? `${Math.max(32, Math.min(dims.w * 0.12, 56))}px`
    : isTablet
      ? `${Math.max(64, Math.min(dims.w * 0.1, 120))}px`
      : 'clamp(5rem, 10vw, 10rem)'
  const subtitleSize = isMobile
    ? `${Math.max(9, Math.min(dims.w * 0.032, 14))}px`
    : 'clamp(0.75rem, 2vw, 1.125rem)'
  const subtitleSpacing = isMobile ? '0.15em' : '0.25em'

  // 9:16 video frame on mobile, full-bleed on desktop
  const mobileFrameW = dims.h * (9 / 16)

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        width: '100vw',
        height: '100dvh',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {/* Video wrapper — 9:16 frame on mobile, full screen on desktop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? mobileFrameW : '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#000',
        }}
      >
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
          onEnded={handleVideoEnd}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Fade overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-600 ${
          phase === 'FADE_VIDEO' || phase === 'TITLE' || phase === 'FADE_TITLE'
            ? 'opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* TECHAFLON title */}
      <div
        className={`absolute inset-0 flex items-center justify-center px-6 transition-opacity duration-800 ${
          phase === 'TITLE' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="text-center">
          <h1
            className="font-display font-bold tracking-tight text-foreground"
            style={{
              fontSize: titleSize,
              lineHeight: 1.05,
              textShadow:
                '0 0 20px rgba(123,203,127,0.5), 0 0 60px rgba(79,143,90,0.35), 0 0 120px rgba(79,143,90,0.15)',
              animation: 'title-breathe 2s ease-in-out infinite',
            }}
          >
            TECHAFLON
          </h1>
          <p
            className="mt-3 font-display font-bold text-primary/70 sm:mt-4"
            style={{
              fontSize: subtitleSize,
              letterSpacing: subtitleSpacing,
              textShadow: '0 0 12px rgba(123,203,127,0.3)',
            }}
          >
            THE DOOMSDAY PROTOCOL
          </p>
        </div>
      </div>

      {/* Final black fade */}
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
        html, body {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          touch-action: none !important;
          -webkit-overflow-scrolling: auto !important;
        }
      `}</style>
    </div>
  )
}
