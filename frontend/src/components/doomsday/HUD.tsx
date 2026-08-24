import { cn } from '@/lib/cn';

interface HUDProps {
  systemStatus?: 'ONLINE' | 'OFFLINE' | 'CRITICAL';
  threatLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  energy?: number;
  sector?: string;
  className?: string;
}

export function HUD({
  systemStatus = 'ONLINE',
  threatLevel = 'CRITICAL',
  energy = 87,
  sector = 'TechaFlon',
  className,
}: HUDProps) {
  const statusColors = {
    ONLINE: 'text-primary',
    OFFLINE: 'text-steel',
    CRITICAL: 'text-danger-bright',
  };

  const threatColors = {
    LOW: 'text-primary',
    MODERATE: 'text-warning',
    HIGH: 'text-warning',
    CRITICAL: 'text-danger-bright',
  };

  return (
    <div className={cn('pointer-events-none fixed inset-0 z-50 p-4 sm:p-6', className)}>
      {/* Top Left - System Status */}
      <div className="absolute left-4 top-4 space-y-1 sm:left-6 sm:top-6">
        <div className="text-hud text-steel-bright">
          SYSTEM STATUS: <span className={statusColors[systemStatus]}>{systemStatus}</span>
        </div>
        <div className="text-hud text-steel-bright">
          THREAT LEVEL: <span className={threatColors[threatLevel]}>{threatLevel}</span>
        </div>
      </div>

      {/* Top Right - Energy & Sector */}
      <div className="absolute right-4 top-4 space-y-1 text-right sm:right-6 sm:top-6">
        <div className="text-hud text-steel-bright">
          ENERGY: <span className="text-primary">{energy}%</span>
        </div>
        <div className="text-hud text-steel-bright">
          SECTOR: <span className="text-foreground">{sector}</span>
        </div>
      </div>

      {/* Corner Brackets - Top Left */}
      <svg
        className="absolute left-4 top-4 h-8 w-8 text-primary/30 sm:left-6 sm:top-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M 0 8 L 0 0 L 8 0" />
      </svg>

      {/* Corner Brackets - Top Right */}
      <svg
        className="absolute right-4 top-4 h-8 w-8 text-primary/30 sm:right-6 sm:top-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M 32 0 L 24 0 L 24 8" />
      </svg>

      {/* Corner Brackets - Bottom Left */}
      <svg
        className="absolute bottom-4 left-4 h-8 w-8 text-primary/30 sm:bottom-6 sm:left-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M 0 24 L 0 32 L 8 32" />
      </svg>

      {/* Corner Brackets - Bottom Right */}
      <svg
        className="absolute bottom-4 right-4 h-8 w-8 text-primary/30 sm:bottom-6 sm:right-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M 32 32 L 24 32 L 24 24" />
      </svg>

      {/* Bottom Center - Build Window */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6">
        <div className="text-hud text-center text-steel-bright">
          BUILD WINDOW: <span className="text-primary">48:00:00</span>
        </div>
      </div>
    </div>
  );
}
