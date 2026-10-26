# PixelForge Frontend

PixelForge frontend is a Next.js 14 application built with `react-konva` for interactive multi-layer image editing and canvas design.

## Features

- **Canva-like Editor Layout**: Left sidebar icon rail (Templates, Elements, Text, Uploads, Layers) with expanding 300px panels and contextual toolbar.
- **Pure State Architecture**: Single-reducer architecture (`lib/editorState.js`) managing elements, layers, canvas configuration, selection, and undo/redo history (capped at 100).
- **Interactive Canvas Tools**:
  - Drag-and-drop & click-to-add for shapes, text, and user assets.
  - Double-click in-place inline text editing.
  - Snapping alignment guides (edges and center lines with 6px threshold).
  - Zoom controls (fit, manual zoom in/out, Ctrl/Cmd + wheel zoom).
  - Live autosave (3-second debounced) and beforeunload prompt for unsaved changes.
- **Export & Job Polling**:
  - Export modal supporting PNG, JPEG, and PDF output with 1× and 2× scaling.
  - Live export job tracking (`queued`, `processing`, `done`, `failed` with retry).
  - Past export history with fresh signed URL downloads.
- **Design System**: Accessible clean Tailwind tokens, Inter font, 4/8px spacing, flat bordered controls, and WCAG-compliant slate palette.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Gates & Verification

All code changes adhere to strict quality gates:

### 1. Run Unit Tests

Pure business logic modules (`editorState`, `validators`, `dropPosition`, `snapping`, `zoomMath`) are covered with Vitest unit tests:

```bash
npm test
```

### 2. Linting

Run ESLint to check syntax, accessibility, and hook dependencies:

```bash
npm run lint
```

### 3. Production Build

Test Next.js standalone output compilation:

```bash
npm run build
```

---

## Docker Production Build

The frontend is packaged using a multi-stage Alpine Docker build with Next.js standalone output:

```bash
# Build the Docker image
docker build -t pixelforge-frontend:latest ./frontend

# Run the container locally (mapped to port 8080 or 3000)
docker run -p 8080:8080 \
  -e CORE_API_URL=http://localhost:8000 \
  -e FONT_SERVICE_URL=http://localhost:8002 \
  pixelforge-frontend:latest
```
