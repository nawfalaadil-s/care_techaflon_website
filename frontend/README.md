# Hackathon Platform — Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4 client for the college
hackathon platform. Built **mobile-first** (320px → 1920px).

## Scripts

```powershell
npm install
npm run dev       # http://localhost:5173 (proxies /api → :8000)
npm run build     # tsc -b && vite build (type-check + production build)
npm run preview   # serve the production build
npm run lint      # Oxlint
```

## Structure

```
src/
├── api/          # Axios client + feature API modules
├── components/
│   ├── ui/       # Design-system primitives (Button, Card, Field, …)
│   └── layout/   # PublicHeader, PublicFooter, PublicLayout
├── config/       # Environment configuration
├── hooks/        # useTheme (light/dark/system)
├── lib/          # cn() class combiner
└── pages/
    ├── public/   # HomePage + placeholders
    └── design/   # Design System living styleguide
```

## Design System

The tokens live in `src/index.css` (Tailwind v4 `@theme`): OKLCH purple
palette, Space Grotesk + Inter fonts, radius scale and card/popover
shadows, with an automatic light/dark `.dark` variant.

Explore the living styleguide at `/design-system`.
