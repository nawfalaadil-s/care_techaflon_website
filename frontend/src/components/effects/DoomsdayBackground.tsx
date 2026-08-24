import { cn } from '@/lib/cn';

interface DoomsdayBackgroundProps {
  showNoise?: boolean;
  showGrid?: boolean;
  showFog?: boolean;
  showReactorGlow?: boolean;
  showWarningGlow?: boolean;
  showScanlines?: boolean;
  showVignette?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function DoomsdayBackground({
  showNoise = true,
  showGrid = true,
  showFog = true,
  showReactorGlow = true,
  showWarningGlow = false,
  showScanlines = true,
  showVignette = true,
  intensity = 'medium',
  className,
}: DoomsdayBackgroundProps) {
  const opacityMap = {
    low: { noise: 0.01, grid: 0.3, glow: 0.15 },
    medium: { noise: 0.015, grid: 0.5, glow: 0.2 },
    high: { noise: 0.02, grid: 0.7, glow: 0.3 },
  };

  const opacity = opacityMap[intensity];

  return (
    <div className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}>
      {/* Digital Noise Layer */}
      {showNoise && (
        <div
          className="absolute inset-0"
          style={{
            opacity: opacity.noise,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Grid Overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 grid-overlay"
          style={{ opacity: opacity.grid }}
        />
      )}

      {/* Atmospheric Fog */}
      {showFog && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(8, 12, 10, 0.4) 50%, rgba(3, 5, 4, 0.9) 100%)',
          }}
        />
      )}

      {/* Reactor Glow - Central */}
      {showReactorGlow && (
        <div
          className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-reactor-pulse rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(123, 203, 127, 0.3) 0%, transparent 70%)',
            opacity: opacity.glow,
          }}
        />
      )}

      {/* Warning Glow - Corners */}
      {showWarningGlow && (
        <>
          <div
            className="absolute right-0 top-0 h-[400px] w-[400px] animate-warning-blink rounded-full opacity-10 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, rgba(240, 68, 79, 0.4) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 h-[400px] w-[400px] animate-warning-blink rounded-full opacity-10 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, rgba(240, 68, 79, 0.4) 0%, transparent 70%)',
            }}
          />
        </>
      )}

      {/* Scanlines */}
      {showScanlines && (
        <div className="scanline-overlay absolute inset-0 opacity-30" />
      )}

      {/* Vignette */}
      {showVignette && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(3, 5, 4, 0.3) 70%, rgba(3, 5, 4, 0.7) 100%)',
          }}
        />
      )}
    </div>
  );
}
