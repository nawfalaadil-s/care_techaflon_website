# TECHAFLON — Doomsday Theme Implementation Guide

> **Complete transformation from standard hackathon platform to cinematic post-apocalyptic technology experience**  
> **Theme:** BLACK + STEEL + DOOM GREEN + RED ALERT + 3D + ENERGY + CINEMATIC MOTION  
> **Tagline:** BUILD BEFORE THE WORLD GOES DARK

---

## Implementation Status

### ✅ Completed

1. **Dependencies Added**
   - Three.js (^0.169.0)
   - @react-three/fiber (^8.17.10)
   - @react-three/drei (^9.114.3)
   - framer-motion (^11.11.17)

2. **Design System Updated**
   - Complete Doomsday color palette implemented
   - Dark theme as primary (near-black backgrounds)
   - Doom Green reactor colors (#4F8F5A, #7BCB7F)
   - Red Alert danger system (#B51F2B, #F0444F)
   - Steel metallic accents (#8F9993, #C8D0CB)
   - Dramatic shadow system with reactor glow

3. **Animation System Created**
   - 11 new keyframe animations
   - Reactor rotation (30s)
   - Reactor pulse (4s)
   - Particle drift
   - Grid scan (8s)
   - Warning blink (2s)
   - Glitch effect (300ms)
   - Hologram float (6s)
   - Scanline movement
   - Energy ring expansion
   - Countdown pulse
   - All respect `prefers-reduced-motion`

4. **Utility Classes Added**
   - `border-metal` - Metallic border with inset highlight
   - `glow-reactor` - Green energy glow
   - `glow-danger` - Red alert glow
   - `text-hud` - Monospace HUD text styling
   - `scanline-overlay` - Animated scanline effect
   - `grid-overlay` - Grid pattern background
   - `card-tilt` - 3D tilt on hover

---

## Next Steps — Installation & Component Creation

### Step 1: Install Dependencies

```powershell
# Run in frontend directory with administrator PowerShell
cd E:\Care hackthon\hackthon_new\Aathil\hackathon\website\hackathon-platform\frontend

# Enable script execution temporarily
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Install dependencies
npm install

# Or if that fails, use yarn
yarn install
```

### Step 2: Create Component Structure

Create the following directory structure:

```
frontend/src/components/
├── 3d/
│   ├── ReactorCore.tsx          # Main reactor 3D model
│   ├── EnergyRing.tsx           # Rotating energy rings
│   ├── ParticleField.tsx        # 3D particle system
│   ├── FloatingDebris.tsx       # Debris elements
│   ├── Hologram.tsx             # Holographic HUD elements
│   ├── TrackModel.tsx           # 3D models for each track
│   └── MissionMap.tsx           # 3D mission timeline
│
├── effects/
│   ├── DoomsdayBackground.tsx   # Layered background system
│   ├── ScanLines.tsx            # Scanline overlay
│   ├── GlitchText.tsx           # Glitch text effect
│   ├── GlowBorder.tsx           # Animated glow border
│   ├── MagneticButton.tsx       # Button that follows cursor
│   ├── Grid.tsx                 # Animated grid
│   ├── Fog.tsx                  # Atmospheric fog
│   └── Noise.tsx                # Digital noise
│
├── doomsday/
│   ├── Countdown.tsx            # Cinematic countdown timer
│   ├── HUD.tsx                  # System status HUD
│   ├── SystemAlert.tsx          # Alert banner
│   ├── MissionProgress.tsx      # Progress indicator
│   └── StatusIndicator.tsx      # Status badges
│
└── hooks/
    ├── useMouseParallax.ts      # Mouse parallax effect
    ├── useScrollProgress.ts     # Scroll-based progress
    ├── useMagneticHover.ts      # Magnetic hover effect
    └── use3DCardTilt.ts         # 3D card tilt
```

---

## Phase-by-Phase Implementation

### Phase 1: Core 3D Infrastructure ⚡ HIGH PRIORITY

#### Components to Create

**1. ReactorCore.tsx** - Main 3D reactor centerpiece
- Multiple rotating concentric rings
- Pulsing green energy core
- Dynamic lighting
- Mouse interaction
- Performance optimized

**2. ParticleField.tsx** - Floating particles
- Instanced particles for performance
- Different sizes and speeds
- Depth-based opacity
- Continuous drift animation

**3. DoomsdayBackground.tsx** - Layered background
- Noise layer
- Grid layer
- Fog layer
- Particle field
- Reactor glow
- Warning glow
- Scanlines
- Vignette

### Phase 2: Hero Section Transformation ⚡ HIGH PRIORITY

**Content Changes:**
```typescript
// src/data/home.ts updates
export const hero = {
  eyebrow: 'SYSTEM ALERT // TECHAFLON 2026',
  headline: 'BUILD BEFORE',
  highlight: 'THE WORLD GOES DARK.',
  subtext: '48 hours. One battlefield. Infinite possibilities.',
  primaryCTA: 'ENTER TECHAFLON',
  secondaryCTA: 'EXPLORE THE BATTLEFIELD'
};
```

**Visual Elements:**
- 3D Reactor Core (floating, rotating)
- Multiple background layers
- Staggered text reveal (150ms → 300ms → 500ms → 700ms)
- Cinematic entrance animation
- HUD overlay with system status

### Phase 3: Sections Redesign ⚙️ MEDIUM PRIORITY

#### Stats Section → "3D Data Modules"
- Floating panel design
- 3D lift on hover
- Reactor glow behind each card
- Stagger: 0ms → 120ms → 240ms → 360ms

#### Tracks Section → "Choose Your Battlefield"
**Track Visuals:**
- **AI & ML:** Neural network with floating nodes
- **Web & Cloud:** Server racks with data streams
- **Mobile & Devices:** Rotating device geometry
- **Sustainability:** Mechanical leaf with energy rings

**Interactions:**
- 3-8 degree rotation on hover
- Camera move toward card
- Internal light intensity increase
- Description slide up

#### Timeline → "Mission Protocol"
**Phase Names:**
- PHASE 01 — DEPLOY (Registration)
- PHASE 02 — BUILD (Hacking Begins)
- PHASE 03 — CHECKPOINT (Progress Check)
- PHASE 04 — LOCKDOWN (Submissions Close) ⚠️ Red warning
- PHASE 05 — FINAL SHOWDOWN (Demos & Awards)

**Design:**
- Vertical glowing energy line
- Reactor core nodes
- Current phase highlighted in green
- Deadline phase in red
- Scroll-driven progress

#### Prizes → "Survival Rewards"
**Design:**
- Metallic armor plate appearance
- Brushed metal textures
- Green edge lighting
- Red micro-details
- 3D depth with hover tilt
- Metallic reflections

#### How It Works → "The Last Stand"
**Steps:**
1. ENTER THE BATTLEFIELD
2. SELECT YOUR MISSION
3. BUILD THE SOLUTION
4. DEPLOY & DEFEND

**Design:**
- Connected 3D route/map
- Progressive line illumination on scroll
- Energy line connecting each step

#### CTA Section → "Ready to Build Before Collapse?"
**Visual:**
- Dark ruins atmosphere
- Green reactor glow
- Red warning lights
- Moving fog
- Floating particles
- Large faint TECHAFLON typography
- Animated grid

### Phase 4: Registration Page → Mission Control ⚙️ MEDIUM PRIORITY

**Header:**
```
TECHAFLON // MISSION REGISTRATION
SYSTEM STATUS: ACCEPTING TEAMS
```

**Progress Indicator:**
```
[01] ━━━━━ [02] ━━━━━ [03] ━━━━━ [04]
TEAM       CREW      MISSION    DEPLOY
```

**Form Styling:**
- Dark translucent backgrounds
- Thin metallic borders
- Green focus glow
- Red invalid state
- Monospace micro-labels
- 8-10px radius (sharper)

**Submit Experience:**
1. Button → "DEPLOYING..."
2. Spinner → Reactor animation
3. Red-alert mode flash
4. Progress bar fills
5. Green confirmation
6. Terminal-style registration ID display

**Success Message:**
```
MISSION ACCEPTED

TEAM ID
TX-2026-XXXX

STATUS
DEPLOYMENT CONFIRMED
```

### Phase 5: Navigation & Layout ⚙️ MEDIUM PRIORITY

**Header → Command Bar**
```
[◆ TECHAFLON]    HOME  BATTLEFIELDS  FAQ  RULES    [STATUS] [REGISTER]
```

**Features:**
- Floating/sticky
- Transparent with backdrop blur
- Thin metallic border
- Green active state
- Red status indicator
- Bottom glow

**Footer → End of Transmission**
```
TECHAFLON // END OF TRANSMISSION
```

**Features:**
- Almost black background
- Large faint TECHAFLON watermark
- Green divider line
- Red warning micro-text
- System status indicator

### Phase 6: Advanced Effects 🎨 LOW PRIORITY (Polish)

**Effects to Add:**
- Mouse parallax (depth-based movement)
- 3D card tilt (mouse-driven)
- Magnetic buttons (move toward cursor, max 8px)
- Glitch effects (sparingly on headers/alerts)
- Scanline overlays
- Grid scan animation
- Hologram float (HUD elements)

---

## Component Templates

### Template 1: ReactorCore.tsx

```typescript
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Torus, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export function ReactorCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useFrame((state) => {
    if (prefersReducedMotion) return;
    
    const t = state.clock.getElapsedTime();
    
    // Core pulse
    if (coreRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.08;
      coreRef.current.scale.setScalar(scale);
    }
    
    // Rings rotation (different speeds)
    if (ring1Ref.current) ring1Ref.current.rotation.z += 0.003;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.002;
    if (ring3Ref.current) ring3Ref.current.rotation.z += 0.001;
  });

  return (
    <group>
      {/* Core Sphere */}
      <Sphere ref={coreRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#7BCB7F"
          emissive="#4F8F5A"
          emissiveIntensity={2}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Ring 1 */}
      <Torus ref={ring1Ref} args={[2, 0.1, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#8F9993"
          emissive="#4F8F5A"
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0.3}
        />
      </Torus>

      {/* Ring 2 */}
      <Torus ref={ring2Ref} args={[2.8, 0.08, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#C8D0CB"
          emissive="#4F8F5A"
          emissiveIntensity={0.3}
          metalness={1}
          roughness={0.2}
        />
      </Torus>

      {/* Ring 3 */}
      <Torus ref={ring3Ref} args={[3.5, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#8F9993"
          emissive="#244B2D"
          emissiveIntensity={0.2}
          metalness={1}
          roughness={0.4}
        />
      </Torus>

      {/* Point Light for glow */}
      <pointLight position={[0, 0, 0]} color="#7BCB7F" intensity={3} distance={10} />
    </group>
  );
}
```

### Template 2: Countdown.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface CountdownProps {
  targetDate: Date;
  className?: string;
}

type CountdownState = 'safe' | 'warning' | 'critical';

export function Countdown({ targetDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [state, setState] = useState<CountdownState>('safe');

  function calculateTimeLeft() {
    const difference = targetDate.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      const totalHours = newTimeLeft.days * 24 + newTimeLeft.hours;
      
      if (totalHours <= 6) {
        setState('critical');
      } else if (totalHours <= 24) {
        setState('warning');
      } else {
        setState('safe');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const stateStyles = {
    safe: 'text-primary border-primary/30 bg-primary/5',
    warning: 'text-warning border-warning/30 bg-warning/5 animate-warning-blink',
    critical: 'text-danger-bright border-danger/50 bg-danger/10 animate-countdown-pulse',
  };

  const stateLabels = {
    safe: 'SYSTEM STABLE',
    warning: 'WARNING — TIME DEPLETING',
    critical: 'CRITICAL — FINAL BUILD WINDOW',
  };

  const totalHours = timeLeft.days * 24 + timeLeft.hours;

  return (
    <div className={cn('relative overflow-hidden rounded-lg border-2 p-6', stateStyles[state], className)}>
      <div className="scanline-overlay absolute inset-0" />
      
      <div className="relative z-10 space-y-4">
        {/* Status */}
        <div className="text-hud opacity-80">
          {stateLabels[state]}
        </div>

        {/* Countdown Display */}
        <div className="font-mono text-5xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl">
          T−{String(totalHours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>

        {/* Label */}
        <div className="text-sm uppercase tracking-wider opacity-70">
          UNTIL THE BATTLEFIELD OPENS
        </div>
      </div>
    </div>
  );
}
```

### Template 3: DoomsdayBackground.tsx

```typescript
'use client';

import { cn } from '@/lib/cn';

interface DoomsdayBackgroundProps {
  showNoise?: boolean;
  showGrid?: boolean;
  showFog?: boolean;
  showParticles?: boolean;
  showReactorGlow?: boolean;
  showWarningGlow?: boolean;
  showScanlines?: boolean;
  showVignette?: boolean;
  className?: string;
}

export function DoomsdayBackground({
  showNoise = true,
  showGrid = true,
  showFog = true,
  showParticles = true,
  showReactorGlow = true,
  showWarningGlow = false,
  showScanlines = true,
  showVignette = true,
  className,
}: DoomsdayBackgroundProps) {
  return (
    <div className={cn('pointer-events-none fixed inset-0 overflow-hidden', className)}>
      {/* Noise Layer */}
      {showNoise && (
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Grid Layer */}
      {showGrid && <div className="absolute inset-0 grid-overlay opacity-50" />}

      {/* Fog Layer */}
      {showFog && (
        <div
          className="absolute inset-0 bg-gradient-radial from-transparent via-background-elevated/20 to-background"
          style={{
            backgroundImage: 'radial-gradient(ellipse at center, transparent 0%, rgba(8, 12, 10, 0.4) 50%, rgba(3, 5, 4, 0.9) 100%)',
          }}
        />
      )}

      {/* Reactor Glow */}
      {showReactorGlow && (
        <div
          className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-reactor-pulse rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(123, 203, 127, 0.3) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Warning Glow (edges) */}
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
      {showScanlines && <div className="scanline-overlay absolute inset-0 opacity-30" />}

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
```

---

## Microcopy Updates

Update all user-facing text to match the Doomsday theme:

| Original | Doomsday |
|----------|----------|
| Loading... | INITIALIZING SYSTEM... |
| Registration | MISSION REGISTRATION |
| Success! | MISSION ACCEPTED |
| Error | SYSTEM ERROR — RETRY REQUIRED |
| Registration Open | BUILD WINDOW ACTIVE |
| Registration Closed | BATTLEFIELD LOCKED |
| Choose Track | SELECT YOUR BATTLEFIELD |
| Choose Problem | SELECT YOUR MISSION |
| Submit | DEPLOY SOLUTION |

---

## Performance Checklist

- [ ] Lazy-load Three.js scenes
- [ ] Use dynamic imports for 3D components
- [ ] Reduce geometry complexity on mobile
- [ ] Use instanced particles (not individual meshes)
- [ ] Pause off-screen animations
- [ ] Respect `prefers-reduced-motion`
- [ ] Provide lightweight fallback for unsupported devices
- [ ] Compress 3D assets
- [ ] Test on mid-range mobile (target 60 FPS on desktop, smooth on mobile)

---

## Testing Checklist

- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive (320px → 1920px)
- [ ] Touch targets 44px minimum on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] All animations respect reduced motion
- [ ] 3D fallback for unsupported devices
- [ ] No horizontal scroll on mobile
- [ ] Performance acceptable on mobile

---

## Final Experience

The completed Techaflon website should feel like:

> **A futuristic command center preparing teams for the final technological battle**

**Visual progression:**
```
ARRIVAL
   ↓
SYSTEM ALERT
   ↓
DISCOVER TECHAFLON
   ↓
CHOOSE BATTLEFIELD
   ↓
MISSION PROTOCOL
   ↓
SURVIVAL REWARDS
   ↓
LAST STAND
   ↓
MISSION REGISTRATION
   ↓
DEPLOYMENT CONFIRMED
```

**Core formula:**
> `BLACK + STEEL + DOOM GREEN + RED ALERT + 3D + ENERGY + CINEMATIC MOTION`

**Brand:**
> **TECHAFLON**

**Tagline:**
> **BUILD BEFORE THE WORLD GOES DARK.**

---

**Document Version:** 1.0.0  
**Implementation Stage:** Phase 1 Complete (Dependencies + Design System)  
**Date:** August 23, 2026  
**Next Action:** Install dependencies via `npm install` and begin creating 3D components
