# TechaFlon 2026 — Promotion Video Creative Brief

> **Purpose:** This file is the single source of truth for generating the TechaFlon 2026 promotional video.
> Every value below (colors, text, timings) is taken directly from the live codebase. Use them as-is.

---

## Event at a Glance

```
Name:       TechaFlon
Tagline:    THE DOOMSDAY PROTOCOL
Organizer:  CSSA — CARE College of Engineering, Trichy
Date:       31 August 2026 (Monday), 10:00 AM IST
Format:     Internal single-day hackathon, on-campus
Departments: CSE × AI & DS
Team Size:  3 — 4 members
Eligibility: 2nd / 3rd / Final Year only, CSE and AI & DS students
Registration: 27 August — 29 August 2026
Fee:        Free
```

---

## Narrative

The world is collapsing. A doomsday event is unfolding. TechaFlon is a hackathon where
student-hackers are the last line of defense — they have one day to build something real
before the system goes dark. Every visual, every word, every frame should carry that weight.

---

## Theme & Visual Identity

### What This Is

- **Cinematic post-apocalyptic technology**
- Not a gaming tournament
- Not neon cyberpunk
- Not a generic tech event
- **Premium. Dark. Industrial. Urgent.**

### Mood

```
dark  powerful  mysterious  high-energy  cinematic
industrial  futuristic  intense  urgent  mechanical
```

### Visual Vocabulary

```
Doomsday    Apocalypse    Reactor Core    Steel    Armor
Command Center    Warning Systems    Energy Core    Cybernetic Interface
Red Alert    Emerald Reactor    Smoke    Sparks    Holograms
Countdown    System Failure    Last Stand    Build Before Collapse
```

---

## Color Palette

### Backgrounds (darkest to lightest)

| Role | HEX | Where to Use |
|---|---|---|
| Background | `#030504` | Full-screen backgrounds, base layer |
| Background Elevated | `#080C0A` | Secondary sections, raised panels |
| Surface | `#0D1310` | Cards, containers, panels |
| Surface Elevated | `#121A15` | Hover states, floating cards |
| Surface Metal | `#171C19` | Industrial / metallic surfaces |

### Primary — Doom Green

| Role | HEX | Where to Use |
|---|---|---|
| Primary | `#4F8F5A` | Buttons, active states, main accent |
| Primary Bright | `#7BCB7F` | Glows, particles, energy highlights |
| Primary Dark | `#244B2D` | Deep shadows, dark accents |

### Secondary — Doom Purple

| Role | HEX | Where to Use |
|---|---|---|
| Purple | `#8B3A9F` | Mystic accent, used sparingly |
| Purple Bright | `#B84DD4` | Energy bursts |
| Purple Dark | `#5A1F6B` | Deep background accents |

### Metallic — Steel

| Role | HEX | Where to Use |
|---|---|---|
| Steel | `#8F9993` | Borders, secondary elements |
| Steel Bright | `#C8D0CB` | Metallic highlights, secondary text |

### Danger / Alert

| Role | HEX | Where to Use |
|---|---|---|
| Danger | `#B51F2B` | Red alert, critical warnings |
| Danger Bright | `#F0444F` | Active warning glow |
| Warning | `#D99A32` | Amber caution states |

### Text

| Role | HEX | Where to Use |
|---|---|---|
| Foreground | `#E8ECE9` | Primary text (cool off-white) |
| Muted Foreground | `#8D9690` | Secondary / de-emphasized text |

### Borders

| Role | HEX |
|---|---|
| Border | `#25312A` |
| Border Bright | `#3B5143` |

### Gradients

**Doomsday Gradient** — default background:
```css
linear-gradient(135deg, #030504 0%, #0B1710 35%, #183521 65%, #050706 100%)
```

**Red Alert Gradient** — danger moments, countdown critical:
```css
linear-gradient(135deg, #080304 0%, #3A080D 45%, #B51F2B 100%)
```

### Glow Effects

**Reactor glow** (green energy halo):
```css
box-shadow: 0 0 40px rgba(123,203,127,0.4), 0 0 80px rgba(79,143,90,0.2);
```

**Danger glow** (red warning halo):
```css
box-shadow: 0 0 40px rgba(240,68,79,0.3), 0 0 80px rgba(181,31,43,0.15);
```

**Text glow** (for headlines):
```css
text-shadow: 0 0 18px rgba(123,203,127,0.35), 0 0 60px rgba(79,143,90,0.2);
```

---

## Typography

| Use | Font | Weights |
|---|---|---|
| Headlines, event name, section titles | **Space Grotesk** | 500, 600, 700 |
| Body text, descriptions, UI | **Inter** | 400, 500, 600, 700 |
| Countdown, HUD labels, system text | **Monospace** (SF Mono, Cascadia Code, JetBrains Mono) | 500 |

**Rules:**
- Headlines: tight spacing (`letter-spacing: -0.02em`), bold, commanding
- Body: clean, readable (`line-height: 1.6`)
- HUD text: always uppercase, wide tracking, small size

---

## On-Screen Text — Use Verbatim

### Hero

```
SYSTEM ALERT // TECHAFLON 2026
```

```
BUILD BEFORE
THE WORLD GOES DARK.
```

```
48 hours. One battlefield. Infinite possibilities.
```

### Event Name

```
TECHAFLON
THE DOOMSDAY PROTOCOL
```

### Call to Action

```
READY TO ENTER THE DOOMSDAY PROTOCOL?
```

```
Gather your team. Choose your battlefield. The countdown has already begun.
```

```
ENTER TECHAFLON
```

### About

```
Two departments. One battlefield.
TechAFlon is an internal hackathon by CSSA,
CARE College of Engineering, Trichy.
```

### Departments

```
TWO DEPARTMENTS. ONE BATTLEFIELD.
```

```
CSE — Computer Science & Engineering
AI & DS — Artificial Intelligence & Data Science
```

### Tracks

```
CHOOSE YOUR BATTLEFIELD
```

```
AI / ML          — Intelligent systems, predictive models, tools that learn from data.
Web Development  — Fast, accessible applications built for the real web.
```

### How It Works

```
THE LAST STAND
```

```
01  REGISTER       — Sign up your team (3-4 students, CSE / AI-DS)
02  PROBLEM        — Receive your problem statement on event day
03  BUILD          — Develop your solution during the event
04  SUBMIT         — Submit your project through the team portal
```

### Countdown

```
T-48:00:00
UNTIL THE BATTLEFIELD OPENS
```

```
SYSTEM STABLE          — (green, safe state)
WARNING: TIME DEPLETING  — (amber, warning state)
CRITICAL: FINAL WINDOW   — (red, critical state)
```

### HUD Decorative Overlays

```
SYSTEM STATUS: ONLINE
THREAT LEVEL: CRITICAL
ENERGY: 87%
SECTOR: TECHAFLON
BUILD WINDOW: 48:00:00
```

---

## Animation Reference

| Name | Duration | Description |
|---|---|---|
| Reactor Rotate | 30s loop | Slow mechanical rotation |
| Reactor Pulse | 4s loop | Energy breathing / scale |
| Particle Drift | 8s | Floating sparks and debris |
| Grid Scan | 8s loop | Horizontal sweep line |
| Warning Blink | 2s loop | Danger flash |
| Glitch | 0.3s | System disruption burst |
| Hologram Float | 6s loop | 3D depth movement |
| Scanline | 3s loop | CRT-style scan |
| Doom Rise | 1s | Dramatic entrance from below |
| Power Surge | 3s loop | Energy burst shadow |
| Doom Lightning | 1.5s | Electric arc flash |
| Portal Spin | 4s loop | Dimensional ring rotation |
| Doom Arrival | 2s | Menacing descent from above |
| Fog Drift | 20s loop | Atmospheric haze movement |
| Core Breathe | 5s loop | Reactor energy fluctuation |

---

## Hero Layer Stack (front to back)

```
10  Foreground particles (depth-of-field blur)
 9  3D Reactor Core — rotating, pulsing, emitting light
 8  HUD text overlays — small, decorative, monospace
 7  Digital noise / film grain
 6  Floating particles, sparks, debris
 5  Atmospheric fog / haze
 4  Animated grid lines
 3  Red warning glow at edges
 2  Radial green reactor glow (center)
 1  Near-black base  #030504
```

---

## Video Structure (45-60 seconds)

### 0:00 — 0:08 | THE ALERT

```
VISUAL:   Black screen. Single green dot pulses. Types on "SYSTEM ALERT // TECHAFLON 2026".
          Red flash. Glitch effect. Reactor core ignites — green energy burst.
AUDIO:    Low hum, building. Warning beep. Power-up surge.
TEXT:     SYSTEM ALERT // TECHAFLON 2026
```

### 0:08 — 0:15 | THE NAME

```
VISUAL:   Reactor spins up. Particles drift. "TECHAFLON" enters with doom-rise animation.
          "THE DOOMSDAY PROTOCOL" fades in below. Green glow on all text.
AUDIO:    Bass drop. Mechanical engagement. Energy stabilize.
TEXT:     TECHAFLON
          THE DOOMSDAY PROTOCOL
```

### 0:15 — 0:25 | THE STAKES

```
VISUAL:   Two track modules appear as floating 3D panels:
            AI/ML — neural network nodes, green data streams
            Web   — server racks, cloud hologram
          HUD overlay ticking: "BUILD WINDOW: 48:00:00"
          Quick stats flash on screen.
AUDIO:    Rhythmic pulse. Data processing sounds.
TEXT:     CHOOSE YOUR BATTLEFIELD
          31 AUGUST 2026  |  CSE x AI & DS  |  3-4 PER TEAM
```

### 0:25 — 0:40 | THE MISSION

```
VISUAL:   "THE LAST STAND" — four steps reveal along a glowing green energy line.
          Each step lights up as the line progresses.
          Countdown timer accelerates: green -> amber -> red.
AUDIO:    Building tension. Clock ticking. Energy surge at red.
TEXT:     THE LAST STAND
          01 REGISTER  ->  02 PROBLEM  ->  03 BUILD  ->  04 SUBMIT
```

### 0:40 — 0:50 | THE CTA

```
VISUAL:   Full-screen dramatic moment. All energy converges.
          Dark atmospheric background with green reactor glow and fog.
          Big text. Bold CTA button. Date and venue.
AUDIO:    Peak intensity. Sustained energy.
TEXT:     READY TO ENTER THE DOOMSDAY PROTOCOL?
          Gather your team. Choose your battlefield.
          ENTER TECHAFLON
          31.08.2026
          CARE College of Engineering, Trichy
```

### 0:50 — 0:60 | CLOSE

```
VISUAL:   "TECHAFLON" wordmark centered. CSSA x CARE College below.
          Reactor core glows one final time. Fade to black with green afterglow.
AUDIO:    Energy release. Fade to silence.
TEXT:     TECHAFLON
          CSSA x CARE College of Engineering, Trichy
```

---

## Do NOT

| Rule | Reason |
|---|---|
| No neon / cyberpunk rainbow | Palette is dark + green + purple + red only |
| No gaming tournament aesthetic | This is premium and cinematic, not esports |
| No decorative / comic fonts | Space Grotesk + Inter only |
| No stock "tech" footage | Build atmosphere with the effects above |
| No single shot longer than 3 seconds | Pace must feel urgent |
| No voiceover (unless requested) | Text and visuals tell the story |
| No white backgrounds anywhere | The entire world is dark |
| No clutter | Every element must earn its space |
