# Techaflon Frontend User Guide — Doomsday 3D Redesign

> Comprehensive frontend design specification for the public-facing Techaflon hackathon experience.
>
> Redesign direction: cinematic Doomsday / post-apocalyptic technology aesthetic with immersive 3D visuals, layered motion, metallic surfaces, reactor-style lighting, and high-impact interactions.

---

## 1. Design Vision

### Event Identity

- **Event name:** Techaflon
- **Experience:** 3D, cinematic, futuristic, intense
- **Theme:** Doomsday / technological apocalypse
- **Primary mood:** dark, powerful, mysterious, high-energy
- **Design goal:** make the landing page feel like users are entering a futuristic command center during a technological crisis.

The existing public journey and application functionality should remain intact. The redesign primarily changes the visual system, layout treatment, 3D presentation, animation system, and interaction design.

Existing routes remain:

- `/` → Home
- `/register` → Registration

The existing seven home sections and four-step registration flow remain the functional foundation.

---

# 2. Core Visual Language

## 2.1 Theme Keywords

Use these concepts consistently:

- Doomsday
- Apocalypse
- Reactor
- Steel
- Armor
- Ruins
- Command Center
- Warning Systems
- Energy Core
- Cybernetic Interface
- Red Alert
- Emerald Reactor
- Smoke
- Sparks
- Holograms
- Surveillance
- Countdown
- System Failure
- Last Stand
- Build Before Collapse

Avoid making the UI look like a generic neon gaming website. The visual language should feel premium, cinematic, industrial, and technological.

---

# 3. Color System

Replace the existing violet-first theme with a Doomsday palette.

## Dark Theme — Primary Theme

| Token | HEX | Purpose |
|---|---|---|
| `--background` | `#030504` | Main page background |
| `--background-elevated` | `#080C0A` | Elevated sections |
| `--surface` | `#0D1310` | Cards |
| `--surface-elevated` | `#121A15` | Hover/elevated cards |
| `--surface-metal` | `#171C19` | Metallic surfaces |
| `--foreground` | `#E8ECE9` | Primary text |
| `--muted-foreground` | `#8D9690` | Secondary text |
| `--primary` | `#4F8F5A` | Main Doom green |
| `--primary-bright` | `#7BCB7F` | Energy highlights |
| `--primary-dark` | `#244B2D` | Deep green |
| `--steel` | `#8F9993` | Metallic accents |
| `--steel-bright` | `#C8D0CB` | Metallic highlights |
| `--danger` | `#B51F2B` | Red alert |
| `--danger-bright` | `#F0444F` | Warning glow |
| `--warning` | `#D99A32` | System warning |
| `--info` | `#4D8392` | System information |
| `--border` | `#25312A` | Borders |
| `--border-bright` | `#3B5143` | Highlighted borders |

## Signature Gradient

```css
linear-gradient(
  135deg,
  #030504 0%,
  #0B1710 35%,
  #183521 65%,
  #050706 100%
);
```

## Red Alert Gradient

```css
linear-gradient(
  135deg,
  #080304 0%,
  #3A080D 45%,
  #B51F2B 100%
);
```

Use red selectively. Red should communicate danger, countdowns, warnings, or critical actions rather than become the entire site color.

---

# 4. 3D Design Direction

The frontend should use a real 3D presentation layer.

## Recommended Technology

- React
- TypeScript
- Tailwind CSS v4
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- CSS 3D transforms for lightweight effects
- Framer Motion or Motion for UI transitions

Use GPU-friendly techniques and lazy-load heavy 3D scenes.

## 3D Hero Concept

The hero should contain a large floating **Doomsday Reactor Core**.

Visual composition:

```text
                 PARTICLES / DEBRIS
                       ↓

       ┌────────────────────────────────┐
       │                                │
       │      TECHAFLON                 │
       │      SYSTEM ONLINE             │
       │                                │
       │   BUILD. SURVIVE. SHIP.       │
       │                                │
       │       [ REGISTER ]             │
       │       [ EXPLORE ]              │
       │                                │
       │                 ◉              │
       │            REACTOR CORE        │
       │                 ◉              │
       └────────────────────────────────┘
```

The reactor should:

- Slowly rotate
- Have multiple concentric rings
- Emit green energy
- Pulse during interaction
- Cast dynamic light
- Contain metallic mechanical components
- Have small floating particles
- React subtly to mouse movement
- Increase energy intensity when the CTA is hovered
- Enter a warning state during countdown interactions

---

# 5. Hero Section

## Content

Eyebrow:

> SYSTEM ALERT // TECHAFLON 2026

Main headline:

> BUILD BEFORE  
> THE WORLD GOES DARK.

Alternative supporting line:

> 48 hours. One battlefield. Infinite possibilities.

Primary CTA:

> ENTER TECHAFLON

Secondary CTA:

> EXPLORE THE BATTLEFIELD

## Hero Background

Use multiple visual layers:

1. Near-black base
2. Large radial green reactor glow
3. Red warning glow near edges
4. Animated grid
5. Atmospheric fog
6. Floating particles
7. Digital noise
8. Tiny warning symbols
9. 3D reactor
10. Depth-of-field particles

## Hero Motion

On page load:

- Background fades in
- Grid activates
- Reactor appears from darkness
- Reactor rings begin rotating
- Heading reveals line-by-line
- CTA buttons rise into place
- Particles begin drifting

Suggested timing:

- Background: 0ms
- Eyebrow: 150ms
- Heading: 300ms
- Description: 500ms
- CTA: 700ms
- Reactor: 400ms
- Particles: 900ms

---

# 6. Cinematic System HUD

Add a subtle futuristic HUD layer around the hero.

Elements may include:

- `SYSTEM STATUS: ONLINE`
- `THREAT LEVEL: CRITICAL`
- `ENERGY: 87%`
- `SECTOR: TECHAFLON`
- `BUILD WINDOW: 48:00:00`
- Coordinates
- Scanning brackets
- Circular progress indicators
- Tiny technical labels

These elements must remain decorative and should never obstruct important content.

---

# 7. Countdown System

Create a major cinematic countdown.

Example:

```text
T−48:00:00
UNTIL THE BATTLEFIELD OPENS
```

The countdown should:

- Use monospace typography
- Have red warning accents
- Pulse every second
- Produce a subtle scanline effect
- Shift from green → amber → red as time decreases
- Trigger stronger visual effects at milestones

Suggested states:

### Safe

Green:

`SYSTEM STABLE`

### Warning

Amber:

`WARNING — TIME DEPLETING`

### Critical

Red:

`CRITICAL — FINAL BUILD WINDOW`

---

# 8. Stats Section

Replace conventional cards with **3D floating data modules**.

Stats:

- 500+ Participants
- 48h Build Time
- 120+ Projects
- ₹5L+ Prize Pool

Each card should look like a futuristic system panel.

Interaction:

- Card lifts in 3D
- Border illuminates
- Data value scales slightly
- Reactor-like glow appears behind it
- Small particles activate

Use staggered reveal:

`0ms → 120ms → 240ms → 360ms`

---

# 9. Tracks Section

Title:

> CHOOSE YOUR BATTLEFIELD

Tracks:

1. AI & Machine Learning
2. Web & Cloud
3. Mobile & Devices
4. Sustainability

Each track becomes a unique 3D module.

### AI & ML

Visual:

- Neural network
- Floating nodes
- Green data streams

### Web & Cloud

Visual:

- Server racks
- Cloud hologram
- Data packets

### Mobile & Devices

Visual:

- Rotating device geometry
- Circuit traces
- Sensor indicators

### Sustainability

Visual:

- Mechanical leaf
- Energy rings
- Green core

Hover behavior:

- Module rotates 3–8 degrees
- Camera subtly moves toward it
- Internal light increases
- Description slides upward
- Icon/object reacts in 3D

---

# 10. Timeline — Mission Protocol

Rename the timeline concept:

> MISSION PROTOCOL

Steps:

### PHASE 01 — DEPLOY

Aug 31 — 09:00

Registration & Kickoff

### PHASE 02 — BUILD

Aug 31 — 10:00

Hacking Begins

### PHASE 03 — CHECKPOINT

Aug 31 — 14:00

Progress Evaluation

### PHASE 04 — LOCKDOWN

Aug 31 — 17:00

Submissions Close

### PHASE 05 — FINAL SHOWDOWN

Aug 31 — 18:00

Demos & Awards

Design:

- Vertical glowing energy line
- Nodes as reactor cores
- Current phase highlighted
- Red warning marker on submission deadline
- Scroll-driven progress animation

---

# 11. Prize Section

Title:

> SURVIVAL REWARDS

Prize cards should resemble **metallic armor plates**.

### 1st Place

₹2,00,000

### 2nd Place

₹1,00,000

### 3rd Place

₹75,000

### Best Beginner

₹50,000

Use:

- Brushed-metal textures
- Green edge lighting
- Red micro-details
- 3D depth
- Hover tilt
- Metallic reflections

The first-place card should have the strongest visual prominence.

---

# 12. How It Works

Title:

> THE LAST STAND

Four steps:

1. ENTER THE BATTLEFIELD
2. SELECT YOUR MISSION
3. BUILD THE SOLUTION
4. DEPLOY & DEFEND

Present the steps as a connected 3D route/map.

A glowing energy line should connect each step.

On scroll, the line progressively illuminates.

---

# 13. CTA Section

Create a dramatic full-width cinematic CTA.

Headline:

> READY TO BUILD  
> BEFORE COLLAPSE?

Supporting text:

> The clock is running. Your mission starts here.

Button:

> ENTER TECHAFLON

Background:

- Dark ruins-inspired atmosphere
- Green reactor glow
- Red warning lights
- Moving fog
- Floating particles
- Large faint TECHAFLON typography
- Animated grid

---

# 14. Registration Page

The registration flow remains functionally identical:

### Step 1

Team Information

### Step 2

Team Members

### Step 3

Track & Problem Statement

### Step 4

Review & Submit

However, the visual presentation becomes a **Mission Control Console**.

## Registration Header

```text
TECHAF LON // MISSION REGISTRATION
SYSTEM STATUS: ACCEPTING TEAMS
```

## Progress Indicator

Instead of ordinary step circles:

```text
[01] ━━━━━ [02] ━━━━━ [03] ━━━━━ [04]
 TEAM       CREW      MISSION    DEPLOY
```

The active step has green energy animation.

Completed steps become steel/green.

---

# 15. Form UI

Inputs should resemble futuristic control panels.

Characteristics:

- Dark translucent backgrounds
- Thin metallic borders
- Green focus glow
- Red invalid state
- Subtle inner shadow
- 8px–10px radius
- Monospace micro-labels

Example:

```text
TEAM IDENTIFIER
┌──────────────────────────────────────┐
│ Enter team name...                   │
└──────────────────────────────────────┘
```

Focus:

```css
box-shadow:
  0 0 0 1px #4F8F5A,
  0 0 20px rgba(79, 143, 90, 0.25);
```

---

# 16. Submit Experience

On submission:

1. Button changes to `DEPLOYING...`
2. Spinner becomes reactor animation
3. Screen briefly enters red-alert mode
4. Progress bar fills
5. Green system confirmation appears
6. Registration ID appears in a futuristic terminal panel

Success:

```text
MISSION ACCEPTED

TEAM ID
TX-2026-XXXX

STATUS
DEPLOYMENT CONFIRMED
```

---

# 17. Animation System

The new frontend should significantly expand animation while maintaining performance.

## Core Animations

### Reactor Rotation

Duration: 20–40s

Infinite slow rotation.

### Reactor Pulse

Duration: 3–5s

Energy intensity increases/decreases.

### Particle Drift

Continuous.

Particles move at different speeds and depths.

### Grid Scan

Duration: 6–10s.

A faint horizontal scan sweeps across the background.

### Warning Blink

Duration: 1.5–2.5s.

Used only for danger/status elements.

### Glitch

Duration: 200–500ms.

Used sparingly for headings, alerts, and transitions.

### Hologram Float

Duration: 4–8s.

Floating HUD elements gently move in 3D space.

### Card Tilt

Mouse-driven.

Maximum rotation:

```text
X: ±5°
Y: ±5°
```

### Magnetic CTA

Buttons subtly move toward the cursor.

Maximum movement:

```text
8px
```

---

# 18. Scroll Animation System

Use scroll position to control visual storytelling.

## Hero

Camera depth changes with scroll.

## Stats

Cards rise from the background.

## Tracks

3D modules rotate into place.

## Timeline

Energy line progressively activates.

## Prizes

Cards emerge from darkness.

## CTA

Background reactor expands behind the content.

Animations should use:

- IntersectionObserver
- CSS transforms
- GPU-friendly opacity/transform
- Motion/Framer Motion where appropriate
- `requestAnimationFrame` only when necessary

Avoid animating layout properties such as:

- width
- height
- top
- left

Prefer:

- transform
- opacity
- filter where appropriate

---

# 19. Background Effects

Create a reusable `DoomsdayBackground` component.

Layers:

```text
DoomsdayBackground
├── Noise
├── Grid
├── Fog
├── ParticleField
├── WarningGlow
├── ReactorGlow
├── ScanLines
└── Vignette
```

Each layer should be independently toggleable.

---

# 20. 3D Component Architecture

Recommended structure:

```text
src/
├── components/
│   ├── 3d/
│   │   ├── ReactorCore.tsx
│   │   ├── EnergyRing.tsx
│   │   ├── ParticleField.tsx
│   │   ├── FloatingDebris.tsx
│   │   ├── Hologram.tsx
│   │   ├── TrackModel.tsx
│   │   └── MissionMap.tsx
│   │
│   ├── effects/
│   │   ├── DoomsdayBackground.tsx
│   │   ├── ScanLines.tsx
│   │   ├── GlitchText.tsx
│   │   ├── GlowBorder.tsx
│   │   └── MagneticButton.tsx
│   │
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── Countdown.tsx
│   │   ├── StatsSection.tsx
│   │   ├── TracksSection.tsx
│   │   ├── MissionTimeline.tsx
│   │   ├── PrizesSection.tsx
│   │   ├── LastStandSection.tsx
│   │   └── FinalCTA.tsx
│   │
│   └── registration/
│       ├── MissionProgress.tsx
│       ├── TeamInformation.tsx
│       ├── TeamMembers.tsx
│       ├── MissionSelection.tsx
│       └── MissionReview.tsx
│
├── hooks/
│   ├── useTheme.ts
│   ├── usePrefersReducedMotion.ts
│   ├── useMouseParallax.ts
│   ├── useScrollProgress.ts
│   └── useMagneticHover.ts
│
└── data/
    ├── home.ts
    └── tracks.ts
```

---

# 21. Typography

Keep:

- **Space Grotesk** for major headings
- **Inter** for normal content
- **JetBrains Mono / Cascadia Code** for system/HUD text

Additional styling:

### Hero

Use very large typography:

- Mobile: 48px
- Desktop: 72px–96px

### HUD

- 10px–13px
- Uppercase
- Letter spacing: 0.12em–0.2em

### Countdown

Use monospace.

---

# 22. Navigation

Header should become a **floating command bar**.

Structure:

```text
[◆ TECHAFLON]    HOME  BATTLEFIELDS  FAQ  RULES    [STATUS] [REGISTER]
```

Features:

- Sticky
- Transparent
- Backdrop blur
- Thin metallic border
- Green active state
- Red status indicator
- Subtle bottom glow

On mobile:

- Compact logo
- Register button
- Menu control
- Theme/system status

---

# 23. Footer

Footer becomes:

> TECHAFLON // END OF TRANSMISSION

Include:

- Event description
- Learn links
- Account links
- Social links if available
- Copyright
- Tagline
- System status indicator

Visual:

- Almost black background
- Large faint TECHAFLON watermark
- Green line
- Red warning micro-text

---

# 24. Responsive Design

Maintain mobile-first behavior.

Breakpoints:

- 0–639px: mobile
- 640px+: large phones/small tablets
- 768px+: tablets
- 1024px+: desktop
- 1280px+: large desktop
- 1536px+: extra-large desktop

3D scenes must adapt.

### Mobile

- Reduce particle count
- Reduce 3D geometry complexity
- Disable expensive post-processing
- Keep important animations
- Maintain 44px touch targets
- Avoid horizontal overflow

### Desktop

- Full reactor scene
- More particles
- Deeper parallax
- 3D card tilt
- Advanced background effects

---

# 25. Performance Requirements

The Doomsday aesthetic must not destroy performance.

Requirements:

- Lazy-load Three.js scenes
- Use dynamic imports
- Reduce geometry complexity
- Use instanced particles
- Avoid excessive DOM nodes
- Prefer transform/opacity animation
- Pause off-screen animations where possible
- Respect reduced-motion preferences
- Provide a lightweight fallback for unsupported devices
- Avoid large unoptimized textures
- Compress 3D assets

Target:

- Smooth 60 FPS on modern desktop
- Smooth experience on mid-range mobile
- No blocking 3D initialization on first paint

---

# 26. Accessibility

Keep the existing accessibility philosophy.

Required:

- Semantic HTML
- Keyboard navigation
- Visible focus indicators
- ARIA labels
- Proper form errors
- Screen-reader support
- Reduced-motion support
- Sufficient text contrast
- 44px minimum mobile touch targets

Decorative 3D objects must use:

```html
aria-hidden="true"
```

Do not communicate critical information only through animation or color.

---

# 27. Reduced Motion

When:

```css
prefers-reduced-motion: reduce
```

Disable:

- Reactor rotation
- Particle movement
- Glitch effects
- Background movement
- Card tilt
- Magnetic buttons
- Continuous scan animations

Keep:

- Simple opacity transitions
- Functional progress indicators
- Clear static visuals

---

# 28. Component Design Principles

Every visual component should follow:

1. Dark base
2. Metallic border
3. Green energy accent
4. Red danger accent only when meaningful
5. Depth through shadow/glow
6. Subtle 3D transformation
7. Clear hierarchy
8. Functional accessibility

Avoid:

- Excessive rounded cards
- Excessive gradients
- Rainbow colors
- Constant glitching
- Excessive red
- Unnecessary animations
- Heavy video backgrounds
- Large blocking 3D assets

---

# 29. Suggested Microcopy

### Loading

`INITIALIZING SYSTEM...`

### Registration

`MISSION REGISTRATION`

### Success

`MISSION ACCEPTED`

### Error

`SYSTEM ERROR — RETRY REQUIRED`

### Countdown

`BUILD WINDOW ACTIVE`

### Registration Closed

`BATTLEFIELD LOCKED`

### Track Selection

`SELECT YOUR BATTLEFIELD`

### Problem Selection

`SELECT YOUR MISSION`

### Submission

`DEPLOY SOLUTION`

---

# 30. Final Experience

The redesigned Techaflon website should feel like:

> A futuristic command center preparing teams for the final technological battle.

The user should experience a visual progression:

```text
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

The visual identity should be **dark, metallic, green-energy driven, red-alert cinematic, highly interactive, and strongly 3D**.

The existing functionality, routes, API integration, validation rules, registration fields, and public content structure should remain intact unless explicitly changed.

---

## Implementation Priority

### Phase 1 — Identity

- Replace violet palette
- Implement Doomsday design tokens
- Update typography
- Update header/footer
- Create global background

### Phase 2 — Hero

- Reactor Core
- Particle field
- HUD
- Countdown
- Cinematic entrance

### Phase 3 — Sections

- 3D stats
- 3D tracks
- Mission timeline
- Metallic prizes
- Last Stand section
- Cinematic CTA

### Phase 4 — Registration

- Mission Control UI
- Animated progress
- Futuristic form controls
- Deployment submission experience

### Phase 5 — Polish

- Mouse parallax
- Card tilt
- Magnetic buttons
- Scanlines
- Glitch accents
- Particle optimization
- Mobile optimization
- Reduced-motion handling

---

## Final Design Statement

**TECH AFLON should not look like a normal college hackathon website.**

It should feel like the visitor has entered a **Doomsday-era technology command center**, where the clock is running, systems are failing, and participants are the teams responsible for building the technology that survives.

**Core visual formula:**

> `BLACK + STEEL + DOOM GREEN + RED ALERT + 3D + ENERGY + CINEMATIC MOTION`

**Brand:**

> **TECH AFLON**

**Tagline:**

> **BUILD BEFORE THE WORLD GOES DARK.**

---

**Document Version:** 2.0.0  
**Redesign:** Doomsday 3D Edition  
**Updated:** August 23, 2026
