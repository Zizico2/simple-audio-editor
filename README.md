# Simple Audio Editor

A lightweight, client-side audio editing tool built with modern web technologies. Upload audio via drag-and-drop or file picker, crop, adjust volume, apply fades, preview playback, and export — all processed in the browser with no server round-trips.

## Features

- **Drag & drop / click-to-upload** audio selection via `react-dropzone` (MP3, WAV, OGG, FLAC, AAC, M4A)
- **Waveform visualization** — canvas-based display with crop region highlighting, fade overlays, and click-to-seek
- **Crop** — adjustable start/end points with real-time waveform feedback
- **Volume control** — 0-200% range
- **Fade in / fade out** — configurable duration and ease curve (Linear, Exponential, Logarithmic, S-Curve)
- **Preview playback** — real-time preview of edited audio via `AudioContext` with animated position indicator
- **Client-side processing** — audio is processed using `OfflineAudioContext` at full quality
- **WAV export** — download the edited result as a WAV file
- **Responsive layout** with dark mode support (`prefers-color-scheme`)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript (strict mode) |
| Audio Processing | Web Audio API (`OfflineAudioContext`, `AudioContext`) |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com/) (edge) |
| Package Manager | [Bun](https://bun.sh/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [class-variance-authority](https://cva.style/) |
| UI Components | [Kumo](https://github.com/cloudflare/kumo) (`Button`, `Select`, `Switch`, `Label`) |
| Linting & Formatting | [Biome](https://biomejs.dev/) |
| Deployment | [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/) |
| CI/CD | GitHub Actions |

## Best Practices

### Code Quality

- **TypeScript strict mode** — `strict: true` in `tsconfig.json` for maximum type safety
- **React Compiler** enabled (`reactCompiler: true`) for automatic memoization and optimized re-renders
- **Biome** for unified linting and formatting with zero-config recommended rules, including React and Next.js domain rules
- **Tailwind CSS v4** for utility-first styling with zero runtime overhead, combined with **class-variance-authority (CVA)** for type-safe, variant-based component styles
- **Clean component architecture** — small, focused components (`AudioUpload`, `WaveformDisplay`, `AudioEditorApp`) with clear separation of concerns; audio processing logic (`audioProcessing`) isolated from UI

### Deployment & CI/CD

- **Edge deployment** on Cloudflare Workers via OpenNext, delivering low-latency responses globally
- **Automated CI/CD pipeline** — every push runs linting, format checks, and build validation; deployments to Cloudflare only trigger on GitHub releases, ensuring production stability while maintaining fast feedback on code quality
- **Infrastructure as code** — `wrangler.toml` and `open-next.config.ts` version the full deployment configuration alongside the application code

## Getting Started

```bash
# Install dependencies
bun install

# Start the dev server
bun dev

# Build & preview the Cloudflare Workers build locally
bun run preview
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & global styles
├── components/
│   ├── AudioEditorApp    # Main editor: controls, playback, export
│   ├── AudioUpload       # Drag & drop file upload
│   └── WaveformDisplay   # Canvas waveform with crop/fade overlays
└── utils/
    └── audioProcessing   # Decode, process (crop/volume/fade), WAV encode
```
