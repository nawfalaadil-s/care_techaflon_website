# Frontend User Guide: Public Pages (Home to Registration)

> **Comprehensive documentation for the public-facing user journey**  
> Last updated: August 23, 2026

This guide documents the complete frontend experience for public users, from landing on the home page through completing registration. It covers the design system, color palette, animations, UI components, and page structures.

---

## Table of Contents

1. [Page Structure & Routes](#page-structure--routes)
2. [Color System & Theming](#color-system--theming)
3. [Animation System](#animation-system)
4. [UI Components](#ui-components)
5. [Layout Components](#layout-components)
6. [Typography System](#typography-system)
7. [Responsive Design](#responsive-design)
8. [Accessibility Features](#accessibility-features)

---

## Page Structure & Routes

### Route Configuration

All public pages are wrapped in `PublicLayout` and use React Router v6:

| Route | Component | Loading |
|-------|-----------|---------|
| `/` | `HomePage.tsx` | Eager |
| `/register` | `RegistrationPage.tsx` | Lazy (code-split) |

### Home Page (`/`)

The home page is composed of **7 distinct sections** rendered sequentially:

#### 1. **Hero Section**
- **Purpose:** Opening section with headline and call-to-action
- **Content:** 
  - Eyebrow: "Applications now open"
  - Headline: "Design. Code. Ship."
  - Highlight: "in 48 hours."
  - Subtext with event details
  - Two CTA buttons: "Register Your Team" (primary) + "View Problems" (outline)
  - Floating decorative hero image with animated glow
- **Animations:** 
  - Staggered reveal (heading: 80ms, subtext: 160ms, buttons: 240ms, image: 320ms)
  - Continuous float animation on hero image
  - Pulsing glow effect behind image
  - Animated gradient background

#### 2. **Stats Section**
- **Purpose:** Key event metrics
- **Content:** 4 stat cards
  - 500+ Participants
  - 48h Build time
  - 120+ Projects expected
  - ₹5L+ Prize pool
- **Animations:** 4 cards with 80ms stagger delay

#### 3. **Tracks Section**
- **Purpose:** Problem domains
- **Content:** 4 track cards with icons, titles, descriptions
  - ◉ AI & Machine Learning
  - ◈ Web & Cloud
  - ▣ Mobile & Devices
  - ♻ Sustainability
- **Animations:** 4 cards with 90ms stagger

#### 4. **Timeline Section**
- **Purpose:** Event schedule
- **Content:** 5-step timeline from kickoff to awards
  - Aug 31, 09:00 - Registration & Kickoff
  - Aug 31, 10:00 - Hacking Begins
  - Aug 31, 14:00 - Checkpoint
  - Aug 31, 17:00 - Submissions Close
  - Aug 31, 18:00 - Demos & Awards
- **Animations:** 5 items with 70ms stagger

#### 5. **Prizes Section**
- **Purpose:** Prize tiers and amounts
- **Content:** 4 prize cards
  - 1st Place: ₹2,00,000
  - 2nd Place: ₹1,00,000 (highlighted with ring)
  - 3rd Place: ₹75,000
  - Best Beginner: ₹50,000
- **Animations:** 4 cards with 90ms stagger

#### 6. **How It Works Section**
- **Purpose:** Process flow for participants
- **Content:** 4-step guide with numbered steps
  - 1. Register your team
  - 2. Pick a problem statement
  - 3. Build your solution
  - 4. Ship & demo at the event
- **Animations:** 4 cards with 90ms stagger

#### 7. **CTA Band Section**
- **Purpose:** Closing call-to-action
- **Content:**
  - Headline: "Ready to build something amazing?"
  - Register button with arrow
  - Animated gradient background
- **Animations:** Reveal wrapper + continuous gradient animation

**Data Source:** All content staged in `src/data/home.ts`

### Registration Page (`/register`)

A **4-step multi-step form** with validation and progress tracking.

#### Step 1: Team Information
**Fields:**
- Team name (text, required)
- Team leader name (text, required)
- Leader email (email, required, regex validated)
- Leader phone (tel, required)
- College/institution (text, required)
- Year of study (select, required)
  - Options: 1st Year, 2nd Year, 3rd Year, 4th Year, Postgraduate, Alumnus

#### Step 2: Team Members
**Features:**
- Dynamic member list (1-4 members)
- Each member has: name, email, phone (all required)
- First member pre-labeled as "Team Leader"
- Add/Remove member buttons
- Enforces max 4 members

#### Step 3: Track & Problem Statement
**Fields:**
- Track selection (select, required)
  - Options: AI & Machine Learning, Web & Cloud, Mobile & Devices, Sustainability
- Problem statement picker (select, optional)
  - Fetches published statements from API
  - Filtered by selected track
  - Special options:
    - "Decide at the event"
    - "Write my own" → shows custom textarea

#### Step 4: Review & Submit
**Features:**
- Read-only summary of all entered data
- Key-value display format with dividers
- Submit button with loading state
- Success screen shows registration ID after submission

**Form Features:**
- Step-by-step validation (blocks "Continue" until current step is valid)
- Inline error messages with `role="alert"`
- Back/Continue navigation
- Registration closed gate (checks public settings API)
- Loading spinner during submission
- Email validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Data Flow:**
1. User fills form → local state
2. Step 4 submit → POST `/api/registration`
3. Success → Display registration ID
4. Error → Show error message, stay on form

---

## Color System & Theming

The platform uses **OKLCH color space** for perceptual uniformity and automatic light/dark mode theming.

### Light Theme Colors

| Token | OKLCH Value | Description | Usage Example |
|-------|-------------|-------------|---------------|
| `--background` | `oklch(0.985 0.004 286)` | Very light violet-tinted page background | Body, main areas |
| `--foreground` | `oklch(0.21 0.035 285)` | Near-black with violet tint | Primary text |
| `--card` | `oklch(1 0 0)` | Pure white | Card backgrounds |
| `--card-foreground` | `oklch(0.21 0.035 285)` | Text on cards | Card content |
| **`--primary`** | **`oklch(0.55 0.25 289)`** | **Brand violet/purple** | **Buttons, links, accents** |
| `--primary-foreground` | `oklch(0.99 0.005 286)` | Near-white | Text on primary buttons |
| `--secondary` | `oklch(0.955 0.022 286)` | Light secondary surface | Secondary buttons |
| `--secondary-foreground` | `oklch(0.3 0.06 285)` | Darker text | Text on secondary |
| `--muted` | `oklch(0.955 0.02 286)` | Subtle background | Disabled states, hints |
| `--muted-foreground` | `oklch(0.51 0.03 285)` | Subdued text | Help text, descriptions |
| `--accent` | `oklch(0.945 0.04 290)` | Hover/focus states | Interactive element hover |
| `--accent-foreground` | `oklch(0.3 0.09 285)` | Text on accent | Accent text |
| `--success` | `oklch(0.62 0.16 152)` | Success green | Success messages, badges |
| `--success-foreground` | `oklch(0.99 0.005 286)` | Text on success | Success button text |
| `--warning` | `oklch(0.76 0.13 75)` | Warning yellow | Warning messages, badges |
| `--warning-foreground` | `oklch(0.28 0.05 75)` | Text on warning | Warning text |
| `--destructive` | `oklch(0.57 0.2 27)` | Error red | Error messages, delete buttons |
| `--destructive-foreground` | `oklch(0.99 0.005 286)` | Text on destructive | Error button text |
| `--info` | `oklch(0.58 0.15 250)` | Info blue | Info messages, badges |
| `--info-foreground` | `oklch(0.99 0.005 286)` | Text on info | Info button text |
| `--border` | `oklch(0.905 0.02 286)` | Subtle borders | Card borders, dividers |
| `--input` | `oklch(0.9 0.025 286)` | Input field borders | Form inputs |
| `--ring` | `oklch(0.55 0.25 289)` | Focus ring (matches primary) | Focus indicators |

### Dark Theme Colors

| Token | OKLCH Value | Description |
|-------|-------------|-------------|
| `--background` | `oklch(0.15 0.02 285)` | Dark base background |
| `--foreground` | `oklch(0.955 0.008 286)` | Light text |
| `--card` | `oklch(0.19 0.022 285)` | Elevated card surface |
| `--card-foreground` | `oklch(0.955 0.008 286)` | Light text on cards |
| **`--primary`** | **`oklch(0.68 0.2 289)`** | **Lighter violet for dark mode** |
| `--primary-foreground` | `oklch(0.16 0.03 285)` | Dark text on primary |
| `--secondary` | `oklch(0.26 0.025 285)` | Dark secondary surface |
| `--secondary-foreground` | `oklch(0.92 0.02 286)` | Light text on secondary |
| `--muted` | `oklch(0.26 0.022 285)` | Dark muted background |
| `--muted-foreground` | `oklch(0.72 0.02 286)` | Muted text |
| `--accent` | `oklch(0.3 0.05 287)` | Dark accent background |
| `--accent-foreground` | `oklch(0.94 0.02 286)` | Light accent text |
| `--border` | `oklch(0.3 0.025 285)` | Dark borders |
| `--input` | `oklch(0.32 0.03 285)` | Dark input borders |
| `--ring` | `oklch(0.68 0.2 289)` | Focus ring (matches primary) |

### Shadows

**Light Theme:**
- **Card Shadow:** `0 1px 2px oklch(0.21 0.035 285 / 0.05), 0 4px 16px -2px oklch(0.21 0.035 285 / 0.08)`
- **Popover Shadow:** `0 2px 8px oklch(0.21 0.035 285 / 0.1), 0 12px 32px -8px oklch(0.21 0.035 285 / 0.2)`

**Dark Theme:**
- **Card Shadow:** `0 1px 2px oklch(0 0 0 / 0.3), 0 6px 20px -4px oklch(0 0 0 / 0.4)`
- **Popover Shadow:** `0 2px 8px oklch(0 0 0 / 0.45), 0 16px 40px -8px oklch(0 0 0 / 0.6)`

### Theme Switching

**Implementation:** `src/hooks/useTheme.ts`

**Features:**
- Persists user choice to `localStorage` (key: `hackathon-theme`)
- Falls back to OS preference (`prefers-color-scheme`)
- Applied in `index.html` before paint to prevent flash
- Toggleable via `ThemeToggle` component in header

**Usage:**
```typescript
const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'system'
```

---

## Animation System

The platform uses **dependency-free CSS animations** with full respect for user motion preferences.

### Animation Hook: `usePrefersReducedMotion`

**File:** `src/hooks/usePrefersReducedMotion.ts`

**Purpose:** Live-tracks user's OS-level `prefers-reduced-motion` setting

**Returns:** `boolean` (true if user prefers reduced motion)

**Usage:**
```typescript
const prefersReducedMotion = usePrefersReducedMotion();
if (!prefersReducedMotion) {
  // Apply animations
}
```

**Behavior:**
- Queries `window.matchMedia('(prefers-reduced-motion: reduce)')`
- Updates live if setting changes during session
- Event listener cleanup on unmount

### Reveal Component

**File:** `src/components/common/Reveal.tsx`

**Purpose:** Scroll-triggered fade-in animations using IntersectionObserver

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'up' \| 'down' \| 'left' \| 'right' \| 'none'` | `'up'` | Slide direction |
| `delay` | `number` | `0` | Stagger delay in milliseconds |
| `as` | `'div' \| 'li' \| 'section' \| 'article'` | `'div'` | HTML element tag |
| `className` | `string` | - | Additional classes |
| `style` | `CSSProperties` | - | Inline styles |
| `children` | `ReactNode` | - | Content to reveal |

**Transform Values:**

```typescript
// When element is hidden (before entering viewport):
up:    'translate-y-6'   // Slides up from below (24px down)
down:  '-translate-y-6'  // Slides down from above (24px up)
left:  'translate-x-6'   // Slides in from right (24px right)
right: '-translate-x-6'  // Slides in from left (24px left)
none:  'opacity-0'       // Fade only, no movement
```

**Behavior:**
1. Element starts with `opacity: 0` and transform applied
2. IntersectionObserver watches for viewport entry (15% threshold, -40px bottom margin)
3. When visible, removes hiding classes → triggers 500ms ease-out transition
4. Fires once, then disconnects observer (performance optimization)
5. **Respects reduced motion:** No animation if `prefers-reduced-motion: reduce`
6. **Progressive enhancement:** Content visible by default, hidden only when JS confirms animation support

**Example Usage:**
```tsx
<Reveal direction="up" delay={80}>
  <h1>Animated Heading</h1>
</Reveal>

<div className="grid">
  {items.map((item, i) => (
    <Reveal key={item.id} direction="up" delay={i * 90}>
      <Card>{item.content}</Card>
    </Reveal>
  ))}
</div>
```

### CSS Keyframe Animations

**File:** `src/index.css`

#### 1. **Float Animation** (`@keyframes float`)

**Usage:** Gentle floating effect on hero image

**Duration:** 6 seconds

**Timing:** `ease-in-out infinite`

**Transform:**
```css
0%, 100% { transform: translateY(0); }
50% { transform: translateY(-12px); }
```

**Utility Class:** `.animate-float`

**Applied To:** Hero section decorative image

---

#### 2. **Glow Pulse** (`@keyframes glow-pulse`)

**Usage:** Pulsing glow behind hero image

**Duration:** 5 seconds

**Timing:** `ease-in-out infinite`

**Effect:**
```css
0%, 100% { 
  opacity: 0.6; 
  transform: scale(1); 
}
50% { 
  opacity: 1; 
  transform: scale(1.06); 
}
```

**Utility Class:** `.animate-glow-pulse`

**Applied To:** Decorative glow element in hero

---

#### 3. **Gradient Shift** (`@keyframes gradient-shift`)

**Usage:** Animated gradient sweep

**Duration:** 8 seconds

**Timing:** `ease infinite`

**Effect:**
```css
0%, 100% { background-position: 0% 50%; }
50% { background-position: 100% 50%; }
```

**Utility Class:** `.animate-gradient` (sets `background-size: 200% 200%`)

**Applied To:** 
- Hero section background
- CTA Band background

**Example Gradient:**
```css
background: linear-gradient(
  135deg,
  oklch(0.55 0.25 289),  /* primary */
  oklch(0.58 0.15 250),  /* info */
  oklch(0.62 0.16 152)   /* success */
);
```

---

#### 4. **Link Underline** (`link-underline` utility)

**Usage:** Animated underline reveal on hover

**Effect:**
- 2px underline that scales from width 0 → full width
- Origin: right to left
- Transition: 0.2s ease

**CSS:**
```css
.link-underline {
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.2s ease;
  }
  &:hover::after {
    transform: scaleX(1);
    transform-origin: left;
  }
}
```

---

### Reduced Motion Handling

**All animations are disabled under `prefers-reduced-motion: reduce`:**

```css
@media (prefers-reduced-motion: reduce) {
  .animate-float,
  .animate-glow-pulse,
  .animate-gradient {
    animation: none !important;
  }
  
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Reveal component** checks `usePrefersReducedMotion()` and skips animation logic entirely.

---

### Animation Usage Summary

| Page | Component | Animation Type | Duration | Delay Pattern |
|------|-----------|----------------|----------|---------------|
| Home | Hero heading | Reveal (up) | 500ms | 80ms |
| Home | Hero subtext | Reveal (up) | 500ms | 160ms |
| Home | Hero buttons | Reveal (up) | 500ms | 240ms |
| Home | Hero image | Reveal (up) + Float | 500ms + 6s loop | 320ms |
| Home | Hero glow | Glow pulse | 5s loop | - |
| Home | Hero background | Gradient shift | 8s loop | - |
| Home | Stats cards (4) | Reveal (up) | 500ms | 80ms × index |
| Home | Track cards (4) | Reveal (up) | 500ms | 90ms × index |
| Home | Timeline items (5) | Reveal (up) | 500ms | 70ms × index |
| Home | Prize cards (4) | Reveal (up) | 500ms | 90ms × index |
| Home | How It Works (4) | Reveal (up) | 500ms | 90ms × index |
| Home | CTA Band | Reveal (up) + Gradient | 500ms + 8s loop | - |
| Register | - | No scroll animations | - | - |
| Register | Submit spinner | Rotate | 1s loop | - |

---

## UI Components

All components are in `src/components/ui/` and built with TypeScript + Tailwind CSS.

### Button

**File:** `button.tsx`, `button-variants.ts`

**Variants:**

| Variant | Description | Use Case |
|---------|-------------|----------|
| `primary` | Solid primary background, white text, shadow | Main CTAs, submit buttons |
| `secondary` | Muted background, darker text | Alternative actions |
| `outline` | Transparent with border, hover fills | Secondary CTAs, cancel actions |
| `ghost` | Transparent, hover fills with accent | Subtle actions, icon buttons |
| `destructive` | Red background | Delete, remove, dangerous actions |
| `success` | Green background | Confirmation, success actions |

**Sizes:**

| Size | Mobile Height | Desktop Height | Padding | Use Case |
|------|---------------|----------------|---------|----------|
| `sm` | 36px (h-9) | 36px | px-3 | Compact buttons, tight spaces |
| `md` | 44px (h-11) | 40px (h-10) | px-5/px-4 | Default, most buttons |
| `lg` | 48px (h-12) | 44px (h-11) | px-6 | Hero CTAs, emphasis |
| `icon` | 44px (h-11 w-11) | 40px (h-10 w-10) | - | Icon-only buttons |

**Features:**
- Focus ring via `focus-ring` utility
- Disabled state: `pointer-events-none`, 50% opacity
- Gap-2 for icon + text combinations
- Smooth transitions on all interactive states

**Usage:**
```tsx
<Button variant="primary" size="lg">
  Register Now
</Button>

<Button variant="outline" size="md" disabled>
  Coming Soon
</Button>

<LinkButton to="/problems" variant="ghost">
  View Problems
</LinkButton>
```

---

### Badge

**File:** `badge.tsx`

**Variants:**

| Variant | Background | Use Case |
|---------|------------|----------|
| `default` | Solid primary | Default labels |
| `secondary` | Muted background | Subtle tags |
| `outline` | Border only | Minimal labels |
| `success` | Green tint (15% opacity) | Success states, approved |
| `warning` | Yellow tint | Warning states, pending |
| `destructive` | Red tint | Error states, rejected |
| `info` | Blue tint | Info states, draft |

**Style:**
- `rounded-full` (pill shape)
- `px-2.5 py-0.5` padding
- `text-xs` size
- `font-medium` weight

**Usage:**
```tsx
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Pending Review</Badge>
<Badge variant="destructive">Rejected</Badge>
```

---

### Card

**File:** `card.tsx`

**Components:**

| Component | Purpose | Default Styles |
|-----------|---------|----------------|
| `Card` | Container | `rounded-xl`, `border`, `shadow-card` |
| `CardHeader` | Top section | `p-5 pb-2`, `flex-col gap-1` |
| `CardTitle` | Heading | `text-lg`, `font-display`, `semibold` |
| `CardDescription` | Subheading | `text-sm`, `muted-foreground` |
| `CardContent` | Main content | `p-5 pt-3` |
| `CardFooter` | Bottom section | `p-5 pt-2`, `flex items-center` |

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>AI & Machine Learning</CardTitle>
    <CardDescription>Build intelligent systems</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Develop AI models that solve real-world problems...</p>
  </CardContent>
  <CardFooter>
    <Button>Learn More</Button>
  </CardFooter>
</Card>
```

---

### Input

**File:** `input.tsx`

**Props:** Standard `InputHTMLAttributes` + `invalid?: boolean`

**Styles:**
- Height: 44px mobile (h-11), 40px desktop (h-10)
- `rounded-md`, `border`, `px-3`, `text-sm`
- Focus: 2px ring (primary or destructive if invalid)
- Invalid state: destructive border color
- Placeholder: muted-foreground color

**Usage:**
```tsx
<Input
  type="email"
  placeholder="your@email.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  invalid={!!errors.email}
/>
```

---

### Select

**File:** `select.tsx`

**Props:** Standard `SelectHTMLAttributes` + `invalid?: boolean`

**Styles:**
- Same sizing as Input (44px/40px)
- Custom chevron-down icon (SVG data URI)
- Icon positioned right 0.6rem
- `pr-9` to accommodate icon
- `appearance-none` to remove native arrow

**Usage:**
```tsx
<Select
  value={track}
  onChange={(e) => setTrack(e.target.value)}
  invalid={!!errors.track}
>
  <option value="">Select a track</option>
  <option value="ai-ml">AI & Machine Learning</option>
  <option value="web">Web & Cloud</option>
</Select>
```

---

### Textarea

**File:** `textarea.tsx`

**Props:** Standard `TextareaHTMLAttributes` + `invalid?: boolean`

**Styles:**
- `min-h-20` (80px minimum height)
- `rounded-md`, `border`, `px-3 py-2`, `text-sm`
- Same validation styles as Input
- Resizable vertically

**Usage:**
```tsx
<Textarea
  placeholder="Describe your custom problem statement..."
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>
```

---

### Field

**File:** `field.tsx`

**Purpose:** Composable form field wrapper that combines label, input, hint, and error

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Label text |
| `htmlFor` | `string` | Input ID for label association |
| `required` | `boolean` | Shows red asterisk |
| `hint` | `string` | Help text below input (muted) |
| `error` | `string` | Error message (destructive, role="alert") |
| `children` | `ReactNode` | Input/Select/Textarea element |

**Layout:** 
- `flex-col gap-1`
- Label above input
- Hint/error below input

**Usage:**
```tsx
<Field
  label="Email Address"
  htmlFor="email"
  required
  hint="Use your college email"
  error={errors.email}
>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    invalid={!!errors.email}
  />
</Field>
```

---

### Spinner

**File:** `spinner.tsx`

**Sizes:**

| Size | Dimensions | Use Case |
|------|------------|----------|
| `sm` | 16px (h-4 w-4) | Inline with text |
| `md` | 24px (h-6 w-6) | Default, buttons |
| `lg` | 32px (h-8 w-8) | Page loading |

**Style:**
- Circular border with transparent top
- `animate-spin` (1s linear infinite)
- `role="status"`, `aria-label="Loading"`

**Usage:**
```tsx
<Button disabled>
  <Spinner size="sm" />
  Submitting...
</Button>
```

---

### Container

**File:** `container.tsx`

**Purpose:** Responsive content wrapper with max-width and horizontal padding

**Styles:**
- Max-width: `6xl` (1280px)
- Padding: `px-4` (mobile) → `px-6` (sm) → `px-8` (lg)
- `mx-auto` (centered)

**Usage:**
```tsx
<Container>
  <h1>Page Content</h1>
  <p>Automatically constrained and centered...</p>
</Container>
```

---

### Label

**File:** `label.tsx`

**Props:** Standard `LabelHTMLAttributes` + `required?: boolean`

**Styles:**
- `text-sm`, `font-medium`, `mb-1.5`
- Required asterisk in destructive color

**Usage:**
```tsx
<Label htmlFor="team-name" required>
  Team Name
</Label>
```

---

### ScreenReaderOnly

**File:** `screen-reader-only.tsx`

**Purpose:** Visually hidden content that remains accessible to screen readers

**CSS:** `.sr-only` utility (absolute positioning, 1px size, clipped)

**Usage:**
```tsx
<ScreenReaderOnly>
  <h2>Statistics</h2>
</ScreenReaderOnly>
```

---

## Layout Components

### PublicLayout

**File:** `PublicLayout.tsx`

**Structure:**
```tsx
<div className="flex min-h-dvh flex-col">
  <PublicHeader />              {/* Sticky at top */}
  <AnnouncementBanner />        {/* Conditional */}
  <main className="flex-1">
    <Outlet />                  {/* Routed content */}
  </main>
  <PublicFooter />              {/* Anchored to bottom */}
</div>
```

**Features:**
- Flex column layout ensures footer stays at bottom on short pages
- Sticky header remains visible during scroll
- Main grows to fill available space (`flex-1`)
- `min-h-dvh` uses dynamic viewport height (mobile-friendly)

---

### PublicHeader

**File:** `PublicHeader.tsx`

**Structure:**
- Position: `sticky top-0`, `z-40`
- Background: `backdrop-blur`, semi-transparent
- Border: `border-b`
- Height: `h-16` (64px)
- Layout: Horizontal flex with space-between

**Sections:**

| Position | Content | Visibility |
|----------|---------|------------|
| Left | Event name + logo symbol (◆) | Always |
| Center | Nav links (Home, Problems, FAQ, Rules) | Hidden on mobile |
| Right | Admin link, User greeting/Login, Register button, Theme toggle | Always |

**Nav Items Active State:**
- Primary color when route matches
- Underline animation on hover

**Responsive:**
- Center nav hidden on small screens
- Mobile: Logo left, actions right
- Desktop: Logo, nav, actions in 3 columns

**Usage:**
```tsx
// Automatically included in PublicLayout
// No manual inclusion needed in pages
```

---

### AnnouncementBanner

**File:** `AnnouncementBanner.tsx`

**Purpose:** Display admin-configured announcements

**Conditional Rendering:**
- Only shows if `settings.announcement` exists and is non-empty
- Fetched from `/api/settings/public`

**Style:**
- Info blue tint (`bg-info/10`, `border-info/30`)
- Centered text
- `role="status"` for screen readers

**Example:**
```tsx
// If settings.announcement = "Registration closes in 3 days!"
<div role="status" className="border-b border-info/30 bg-info/10">
  <div className="container py-2 text-center text-sm">
    Registration closes in 3 days!
  </div>
</div>
```

---

### ThemeToggle

**File:** `ThemeToggle.tsx`

**Purpose:** Switch between light/dark modes

**Features:**
- Circular button: 44px mobile (h-11 w-11), 40px desktop (h-10 w-10)
- Sun icon (☀️) in light mode
- Moon icon (🌙) in dark mode
- `aria-pressed` state for accessibility
- `aria-label`: "Toggle theme"
- Persists to localStorage via `useTheme` hook

**Usage:**
```tsx
// Automatically included in PublicHeader
// Can be used standalone:
<ThemeToggle />
```

---

### PublicFooter

**File:** `PublicFooter.tsx`

**Structure:**

**Top Section:**
- Event description (left)
- Two nav columns (right)
  - **Learn:** Home, Problems, FAQ, Rules
  - **Account:** Login/Register or User Dashboard

**Bottom Section:**
- Copyright: `© 2026 HackFest 2026`
- Tagline from public settings

**Style:**
- `mt-auto` (pushed to bottom via flex layout)
- `border-t`, `muted` background
- Single column on mobile → multi-column on desktop

**Responsive:**
- Mobile: Stacked sections, center-aligned
- Desktop: Grid layout, left-aligned

---

### Section

**File:** `Section.tsx`

**Purpose:** Wrapper for home page sections with consistent spacing and scroll offset

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Anchor link ID (optional) |
| `align` | `'left' \| 'center'` | Content alignment (default: left) |
| `className` | `string` | Additional classes |
| `children` | `ReactNode` | Section content |

**Styles:**
- `scroll-mt-24` (96px offset for sticky header anchor links)
- `py-14` (mobile, 56px) → `py-20` (desktop, 80px)

**SectionHeading Component:**

**Sub-components:**
- Eyebrow: Uppercase, tracking-wider, primary color
- Title: `h2`, `text-2xl` → `text-3xl`
- Description: `muted-foreground`

**Max-width:** `2xl` (672px)

**Usage:**
```tsx
<Section id="tracks" align="center">
  <SectionHeading
    eyebrow="Problem Domains"
    title="Choose Your Track"
    description="Select the domain that excites you most"
  />
  <div className="grid gap-6">
    {/* Track cards */}
  </div>
</Section>
```

---

## Typography System

### Font Families

Defined in `src/index.css`:

| Variable | Font Stack | Usage |
|----------|------------|-------|
| `--font-sans` | Inter, system-ui, -apple-system, Segoe UI, Roboto... | Body text |
| `--font-display` | Space Grotesk, Inter, system-ui... | Headings, titles |
| `--font-mono` | SF Mono, Cascadia Code, JetBrains Mono, Menlo, Consolas... | Code |

### Heading Styles

Applied globally to `h1, h2, h3, h4, h5, h6`:

```css
font-family: var(--font-display);  /* Space Grotesk */
font-weight: 700;                  /* Bold */
letter-spacing: -0.02em;           /* Tight tracking */
line-height: 1.1;                  /* Compact */
text-wrap: balance;                /* Better line breaks */
```

### Body Text

- Font family: Inter (`--font-sans`)
- Line height: 1.6
- Paragraphs: `text-wrap: pretty` for balanced lines

### Size Scale

Tailwind typography classes:

| Class | Rem | Pixels | Use Case |
|-------|-----|--------|----------|
| `text-xs` | 0.75rem | 12px | Small labels, badges |
| `text-sm` | 0.875rem | 14px | Body text, form inputs |
| `text-base` | 1rem | 16px | Default body text |
| `text-lg` | 1.125rem | 18px | Emphasized text, card titles |
| `text-xl` | 1.25rem | 20px | Section subheadings |
| `text-2xl` | 1.5rem | 24px | Section titles (mobile) |
| `text-3xl` | 1.875rem | 30px | Section titles (desktop) |
| `text-4xl` | 2.25rem | 36px | Page titles |
| `text-5xl` | 3rem | 48px | Hero headlines (mobile) |
| `text-6xl` | 3.75rem | 60px | Hero headlines (desktop) |

### Weight Classes

| Class | Weight | Use Case |
|-------|--------|----------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text, labels |
| `font-semibold` | 600 | Card titles, subheadings |
| `font-bold` | 700 | Headings, buttons |

### Example Hierarchy

```tsx
<h1 className="text-5xl sm:text-6xl font-bold">
  Hero Headline
</h1>

<h2 className="text-2xl sm:text-3xl font-semibold">
  Section Title
</h2>

<h3 className="text-lg font-semibold">
  Card Title
</h3>

<p className="text-sm text-muted-foreground">
  Supporting description text
</p>
```

---

## Responsive Design

### Breakpoint System

Tailwind v4 default breakpoints (mobile-first):

| Breakpoint | Min Width | Target Device |
|------------|-----------|---------------|
| `(default)` | 0-639px | Mobile phones |
| `sm:` | 640px+ | Large phones, small tablets |
| `md:` | 768px+ | Tablets, small laptops |
| `lg:` | 1024px+ | Laptops, desktops |
| `xl:` | 1280px+ | Large desktops |
| `2xl:` | 1536px+ | Extra large screens |

### Common Patterns

#### Touch Target Sizes
```tsx
// Mobile: 44px (WCAG minimum)
// Desktop: 40px (more precision with mouse)
<Button className="h-11 sm:h-10">
  Click Me
</Button>
```

#### Container Padding
```tsx
<Container className="px-4 sm:px-6 lg:px-8">
  {/* Content */}
</Container>
```

#### Grid Layouts
```tsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>
```

#### Typography Scaling
```tsx
<h1 className="text-3xl sm:text-4xl lg:text-6xl">
  Responsive Heading
</h1>
```

#### Navigation Visibility
```tsx
<nav className="hidden md:flex gap-6">
  {/* Desktop only navigation */}
</nav>
```

### Mobile-First Philosophy

The platform is built **mobile-first** (320px base):

1. **Base styles target mobile**
2. **Breakpoint classes enhance for larger screens**
3. **Touch targets: minimum 44px on mobile**
4. **Content-first: no hamburger menus on main pages**
5. **Performance: lazy loading, code splitting for desktop-heavy features**

---

## Accessibility Features

### Semantic HTML

- `<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<article>`
- `<dl>`, `<dt>`, `<dd>` for definition lists (review summaries)
- `<button>` for interactive actions (not `<div>`)
- `<a>` for navigation (not `<button>`)

### ARIA Labels

**Navigation:**
```tsx
<nav aria-label="Primary navigation">
  <ul>...</ul>
</nav>
```

**Sections:**
```tsx
<section aria-labelledby="tracks-title">
  <h2 id="tracks-title">Problem Tracks</h2>
</section>
```

**Buttons:**
```tsx
<button aria-label="Toggle theme" aria-pressed={theme === 'dark'}>
  {/* Icon only button */}
</button>
```

### Form Validation

**Error Announcement:**
```tsx
<div role="alert" className="text-destructive">
  {error}
</div>
```

**Invalid State:**
```tsx
<Input
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <div id="email-error" role="alert">{error}</div>}
```

**Required Fields:**
```tsx
<Label htmlFor="email" required>
  Email Address
</Label>
<Input id="email" required aria-required="true" />
```

### Focus Management

**Custom Focus Ring:**
```css
.focus-ring:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

**Skip to Content:**
```tsx
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Screen Reader Support

**Visually Hidden Text:**
```tsx
<ScreenReaderOnly>
  <h2>Statistics</h2>
</ScreenReaderOnly>
```

**Decorative Images:**
```tsx
<img src="hero.png" alt="" aria-hidden="true" />
```

**Loading States:**
```tsx
<Spinner aria-label="Loading registration form" />
```

### Keyboard Navigation

- All interactive elements accessible via `Tab`
- Enter/Space activate buttons
- Arrow keys navigate select dropdowns
- Escape closes modals (if implemented)
- No keyboard traps

### Reduced Motion

**CSS Media Query:**
```css
@media (prefers-reduced-motion: reduce) {
  .animate-float,
  .animate-glow-pulse,
  .animate-gradient {
    animation: none !important;
  }
  
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**JavaScript Hook:**
```tsx
const prefersReducedMotion = usePrefersReducedMotion();
// Reveal component automatically skips animations
```

### Color Contrast

- **OKLCH color space** provides perceptual uniformity
- Primary text: 4.5:1 minimum contrast (WCAG AA)
- Large text: 3:1 minimum contrast
- Interactive elements: distinguishable in both light/dark modes

### Touch Targets

- **Minimum 44px × 44px** on mobile (WCAG 2.2 Level AAA)
- Desktop allows 40px with mouse precision
- Adequate spacing between interactive elements

### Progressive Enhancement

- Content visible without JavaScript
- Animations layer on top (not required for functionality)
- Forms work with native validation
- Links work without router (graceful degradation)

---

## Additional Utilities

### Focus Ring Utility

**CSS:**
```css
.focus-ring:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

**Usage:**
Applied to all interactive components (buttons, inputs, links)

---

### Safe Area Insets

For notched devices (iPhone X+):

```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

.pt-safe {
  padding-top: env(safe-area-inset-top);
}
```

**Usage:**
```tsx
<footer className="pb-safe">
  {/* Content respects iPhone notch */}
</footer>
```

---

### Border Radius Scale

| Class | Rem | Pixels | Use Case |
|-------|-----|--------|----------|
| `rounded-xs` | 0.25rem | 4px | Small elements |
| `rounded-sm` | 0.375rem | 6px | Badges |
| `rounded-md` | 0.5rem | 8px | Inputs, buttons |
| `rounded-lg` | 0.75rem | 12px | Large buttons |
| `rounded-xl` | 1rem | 16px | Cards |
| `rounded-2xl` | 1.25rem | 20px | Hero sections |
| `rounded-full` | 9999px | Pill | Pills, circular icons |

---

### `cn()` Utility

**File:** `src/lib/cn.ts`

**Purpose:** Lightweight classname combiner for conditional classes

**Features:**
- Joins truthy class strings
- Deduplicates tokens (avoids double-applying classes)
- Flattens arrays
- Handles conditional classes

**Usage:**
```tsx
const className = cn(
  'base-class',
  isActive && 'active-class',
  error && 'error-class',
  props.className
);

// Result: "base-class active-class" (if isActive true, error false)
```

**Implementation:**
```typescript
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter((v, i, arr) => arr.indexOf(v) === i) // Dedupe
    .join(' ');
}
```

---

## Data Sources

### `src/data/home.ts`

**Purpose:** Centralized content for home page sections

**Structure:**

```typescript
export const event = {
  name: 'HackFest 2026',
  tagline: '48 hours to build something that matters',
  dateLabel: 'Aug 31, 2026',
  format: '48-hour in-person',
  location: 'Main Campus · Innovation Hall'
};

export const hero = {
  eyebrow: 'Applications now open',
  headline: 'Design. Code. Ship.',
  highlight: 'in 48 hours.',
  subtext: 'Join 500+ students building real products...'
};

export const stats = [
  { label: 'Participants', value: '500+' },
  // ... 3 more
];

export const tracks = [
  { id: 'ai-ml', icon: '◉', title: 'AI & ML', description: '...' },
  // ... 3 more
];

export const timeline = [
  { date: 'Aug 31', time: '09:00', label: 'Registration', description: '...' },
  // ... 4 more
];

export const prizes = [
  { place: '1st', amount: '₹2,00,000', description: '...', highlight: false },
  // ... 3 more
];

export const steps = [
  { step: 1, label: 'Register', description: '...' },
  // ... 3 more
];

export const cta = {
  title: 'Ready to build something amazing?',
  description: 'Registration closes soon...'
};
```

**Usage:**
```tsx
import { tracks } from '@/data/home';

<div className="grid gap-6">
  {tracks.map(track => (
    <Card key={track.id}>
      <span className="text-4xl">{track.icon}</span>
      <h3>{track.title}</h3>
      <p>{track.description}</p>
    </Card>
  ))}
</div>
```

---

### `src/data/tracks.ts`

**Purpose:** Track labels and constants for forms

```typescript
export const TRACK_LABELS = {
  'ai-ml': 'AI & Machine Learning',
  'web': 'Web & Cloud',
  'mobile': 'Mobile & Devices',
  'sustainability': 'Sustainability'
};

export const TRACK_OPTIONS = [
  { value: 'ai-ml', label: 'AI & Machine Learning' },
  { value: 'web', label: 'Web & Cloud' },
  { value: 'mobile', label: 'Mobile & Devices' },
  { value: 'sustainability', label: 'Sustainability' }
];

export const YEAR_OPTIONS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: 'pg', label: 'Postgraduate' },
  { value: 'alumnus', label: 'Alumnus' }
];

export const MAX_MEMBERS = 4;
```

---

## Summary

This frontend guide covers the complete public user journey from home page to registration:

✅ **7 home page sections** with staggered scroll animations  
✅ **4-step registration form** with validation and API integration  
✅ **OKLCH color system** with automatic light/dark theming  
✅ **Dependency-free animations** respecting user motion preferences  
✅ **Mobile-first design** (320px → 1920px responsive)  
✅ **Accessible by default** (WCAG AA compliant)  
✅ **Performant** (code splitting, GPU-friendly animations)  
✅ **TypeScript + Tailwind CSS v4** modern stack

The design system prioritizes user experience, accessibility, and performance across all device sizes and user preferences.

---

**Last Updated:** August 23, 2026  
**Version:** 1.0.0  
**Author:** Hackathon Platform Team
