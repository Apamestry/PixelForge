# PixelForge — Build Specification (source of truth)

Final BRD: v1.1 (image-only). If this spec and the BRD disagree on a **Must** item, the BRD wins.
The extra services (background removal, color, font) are **extensions beyond the BRD**: they must never be
required for any Must feature to work.

---

## 0. Rules for the agent

- Build exactly what is described here. No extra features, no extra services, no video.
- Choose the simplest approach that works and is deployable on Google Cloud Run. Fewer dependencies is better.
- Stack: Python 3.11, FastAPI, SQLAlchemy 2.x, Pydantic v2, Pillow. Frontend: Next.js (App Router), **JavaScript** (not TypeScript), react-konva, Tailwind CSS. Pin every dependency to an exact, known-compatible version.
- After each phase: run the tests and the smoke test, fix every failure, then report briefly. Never move on while anything is red.
- Never commit secrets. All configuration comes from environment variables (see section 7).
- Use plain `def` (not `async def`) for CPU-bound or Pillow-using endpoints so FastAPI runs them in its threadpool.

---

## 1. Services (final)

| Service | Folder | Role | Exposure |
|---|---|---|---|
| frontend | `frontend/` | Next.js editor UI | public |
| core-api | `services/core-api/` | Auth, projects, assets, templates, export jobs, tool gateway (one modular FastAPI app, as the BRD requires) | public, enforces JWT itself |
| render-worker | `services/render-worker/` | Receives Pub/Sub push, renders the design, writes the file | private (Pub/Sub only) |
| font-service | `services/font-service/` | Font catalog + font files | public, read-only |
| bgremoval-service | `services/bgremoval-service/` | ML background removal | private (core-api only) |
| color-service | `services/color-service/` | Palette extraction, harmonies, contrast check, color presets | private (core-api only) |

Dependency rules:
- frontend talks only to `/api/*` (core-api) and `/fonts/*` (font-service), using **relative URLs**.
- core-api calls bgremoval-service and color-service over HTTP.
- render-worker never calls another service. Tool services never call each other and never touch the database.
- If a tool service is down, core-api returns `503 {"detail":"tool unavailable"}` for that tool only. Everything else keeps working.

---

## 2. Repo layout

```
pixelforge/
  docs/SPEC.md
  frontend/
  services/
    core-api/  render-worker/  font-service/  bgremoval-service/  color-service/
  shared/fonts/                # source of truth for font files (OFL licensed)
  scripts/sync_fonts.sh        # copies shared/fonts into font-service/fonts and render-worker/fonts
  scripts/smoke_test.sh
  loadtest/loadtest.py
  deploy/                      # setup_gcp.sh, deploy.sh, lb_setup.sh, teardown.sh, README.md
  docker-compose.yml
  .env.example
```

Every service is self-contained: its own `Dockerfile`, `.dockerignore`, `requirements.txt`, `tests/`, and the Docker build context is that service's folder.
Fonts are **committed copies** inside `font-service/fonts` and `render-worker/fonts` (produced by `sync_fonts.sh`), so no Docker build needs files from outside its own folder.

---

## 3. Canvas JSON (the contract between the editor and the render-worker)

```json
{
  "version": 1,
  "width": 1080, "height": 1350, "background": "#FFFFFF",
  "elements": [
    { "id": "uuid", "type": "image", "assetId": "uuid",
      "x": 0, "y": 0, "width": 500, "height": 400, "rotation": 0, "opacity": 1,
      "filters": { "brightness": 0, "contrast": 0, "saturation": 0, "grayscale": false } },
    { "id": "uuid", "type": "text", "text": "Hello",
      "x": 100, "y": 100, "width": 600, "rotation": 0, "opacity": 1,
      "fontFamily": "Poppins", "fontSize": 64, "fontWeight": 700,
      "fill": "#111111", "align": "left", "lineHeight": 1.2 },
    { "id": "uuid", "type": "shape", "shape": "rect",
      "x": 50, "y": 50, "width": 300, "height": 200, "rotation": 0, "opacity": 1,
      "fill": "#FFCC00", "stroke": "#000000", "strokeWidth": 0, "cornerRadius": 0 }
  ]
}
```

Rules (both the editor and the worker must follow these exactly):
- `elements` order is z-order. Index 0 is the bottom layer.
- `shape` is `rect` or `ellipse`. `fontWeight` is `400` or `700`. `align` is `left`, `center`, or `right`.
- `rotation` is in degrees, **clockwise, about the element's own top-left point (x, y)** (this is Konva's default). Test: a 100x50 rect at (200,200) rotated 90 occupies x in [150,200], y in [200,300].
- Text wraps at `width`; its height is automatic. Line height is `fontSize * lineHeight`.
- Image elements stretch to `width` x `height`. Filters: `brightness`, `contrast`, `saturation` are each in [-1, 1] (0 means unchanged). Pillow mapping: factor = 1 + value, using `ImageEnhance`. `grayscale` converts to luminance.
- Limits: canvas at most 4000x4000, at most 200 elements. core-api rejects anything larger with 422.
- Export output size is `width*scale` by `height*scale` and every coordinate and font size is multiplied by `scale`.

---

## 4. Database (PostgreSQL in production)

Use `sqlalchemy.JSON` and `String(36)` UUID strings so unit tests can run on SQLite. Only **core-api** creates tables (`Base.metadata.create_all` on startup) and seeds templates when the table is empty. The worker never creates tables; it holds a minimal copy of the `export_jobs` and `assets` table definitions.

- `users`: id, email (unique), password_hash, created_at
- `assets`: id, user_id, filename, content_type, storage_key, size_bytes, width, height, created_at
- `projects`: id, user_id, name, canvas (JSON), created_at, updated_at
- `export_jobs`: id, user_id, project_id, format, scale, canvas_snapshot (JSON), status (`queued|processing|done|failed`), error, output_key, created_at, started_at, finished_at
- `templates`: id, name, width, height, canvas (JSON)

Seed 5 templates using only text and shapes (no images): Instagram Post 1080x1080, Event Poster 1080x1350, YouTube Thumbnail 1280x720, LinkedIn Banner 1584x396, Infographic 800x2000. Use only the bundled fonts.

---

## 5. core-api (every route is under `/api`)

Auth (bcrypt password hashing, PyJWT HS256, token lifetime `JWT_EXPIRE_MINUTES`, password minimum 8 characters):
- `POST /api/auth/register` `{email, password}` returns 201
- `POST /api/auth/login` returns `{access_token, token_type: "bearer", expires_in}`
- `GET /api/me`

Everything except register, login and `/healthz` requires `Authorization: Bearer <token>`. A user can only see their own rows; anything else returns 404.

Templates: `GET /api/templates`, `GET /api/templates/{id}`

Projects:
- `GET /api/projects`
- `POST /api/projects` `{name, templateId?, width?, height?}` (a template copies its canvas)
- `GET /api/projects/{id}` returns the project plus `assetUrls: {assetId: signedUrl}` for every image element
- `PUT /api/projects/{id}` `{name?, canvas?}` (validates the canvas against section 3)
- `DELETE /api/projects/{id}`

Assets:
- `POST /api/assets` (multipart field `file`; png, jpeg or webp only; at most 10 MB; verify with Pillow, not just the extension) returns the asset with a `url`
- `GET /api/assets` (each with a short-lived signed `url`)
- `DELETE /api/assets/{id}`

Exports:
- `POST /api/exports` `{projectId, format: "png"|"jpeg"|"pdf", scale: 1|2}` returns 202 `{id, status: "queued"}`. It snapshots the project's canvas into the job row, then publishes `{"jobId": "..."}`.
- `GET /api/exports/{id}` returns `{id, status, format, error?, downloadUrl?}` (`downloadUrl` is a signed URL, present only when `status` is `done`)
- `GET /api/exports` (history, newest first)

Tools (extensions):
- `GET /api/tools` returns `{"bgRemove": true|false, "color": true|false}` based on a quick health check of each tool service
- `POST /api/tools/bg-remove` `{assetId}` returns a **new** asset (transparent PNG)
- `POST /api/tools/color/palette` `{assetId, count?}` returns `{colors: ["#aabbcc", ...]}`
- `GET /api/tools/color/presets`, `POST /api/tools/color/preset` `{assetId, preset}` returns a **new** asset
- `GET /api/tools/color/harmonies?hex=#3366ff`, `GET /api/tools/color/contrast?fg=#000000&bg=#ffffff`

Admin (BRD Could): `GET /api/admin/stats` returns `{users, exports}` (any authenticated user is fine).

`GET /healthz` returns 200 `{"status":"ok"}` and does not touch the database.

---

## 6. render-worker, font-service, bgremoval-service, color-service

**render-worker** — `POST /pubsub/push` receives the Pub/Sub push envelope:
`{"message": {"data": "<base64 of {\"jobId\":\"...\"}>", "messageId": "..."}, "subscription": "..."}`
1. Load the job. If it is already `done` or `failed`, return 200 immediately (Pub/Sub delivers at least once, so the worker must be idempotent).
2. Set `processing`, render, upload to `users/{userId}/exports/{jobId}.{ext}`, set `done` with `output_key`.
3. Permanent failure (bad canvas, unreadable asset format): set `failed` with a readable `error`, return 200 (so it is not retried).
4. Transient failure (database or storage unavailable): return 500 so Pub/Sub retries.

Rendering: Pillow only. Create an RGBA canvas of the background color. Draw each element onto its own transparent layer, apply opacity, rotate about (x, y) as defined in section 3, then alpha-composite onto the canvas. A missing asset renders a gray placeholder and the job continues. JPEG is flattened onto the background at quality 90. PDF is a single page saved with Pillow. Fonts load from `fonts/{Family-without-spaces}-{weight}.ttf` (for example `PlayfairDisplay-700.ttf`); if missing, fall back to `Roboto-{weight}.ttf`.
Test-only knob: env `RENDER_ARTIFICIAL_DELAY_SECONDS` (default 0), used to make autoscaling visible during the load test.

**font-service** (all routes under `/fonts`):
- `GET /fonts/list` returns `[{family, category, weights: [400,700], files: {"400": "/fonts/files/Poppins-400.ttf", "700": "..."}}]`
- `GET /fonts/files/{filename}` (header `Cache-Control: public, max-age=31536000, immutable`; reject any path traversal)
- `GET /fonts/pairings` returns a short curated list of `{heading, body}` pairs

Bundle these OFL families, weights 400 and 700 only: Roboto, Poppins, Montserrat, Playfair Display, Oswald, Lato. Get static TTFs from github.com/google/fonts. If only a variable font exists for a family, create static instances with `fontTools.varLib.instancer`. Save them in `shared/fonts` as `{FamilyWithoutSpaces}-{weight}.ttf` and sync with `scripts/sync_fonts.sh`.

**bgremoval-service**: `POST /remove` (multipart `file`) returns `image/png` with alpha; `GET /healthz`. Use `rembg` with the small model `u2netp`, **downloaded during the Docker build and baked into the image** (set `U2NET_HOME`), one global session created at startup. Downscale so the longest side is at most 2048 before inference.

**color-service**:
- `POST /palette?count=5` (multipart `file`) returns `{"colors": [...]}` using Pillow `quantize` (median cut; no scikit-learn)
- `GET /presets` returns `["vintage","cool","warm","bw","vivid","fade"]`
- `POST /preset?name=vintage` (multipart `file`) returns the graded image
- `GET /harmonies?hex=` returns complementary, analogous (2), triadic (2), split-complementary (2) using `colorsys`
- `GET /contrast?fg=&bg=` returns `{ratio, aa, aaLarge, aaa}` per WCAG 2.1 relative luminance (ratio rounded to 2 decimals; aa >= 4.5, aaLarge >= 3, aaa >= 7)

---

## 7. Configuration (environment variables)

| Variable | Used by | Local | GCP |
|---|---|---|---|
| `ENV` | all | `local` | `gcp` |
| `DATABASE_URL` | core-api, render-worker | Postgres in docker-compose | Cloud SQL, unix socket `host=/cloudsql/PROJECT:REGION:INSTANCE` |
| `JWT_SECRET`, `JWT_EXPIRE_MINUTES` | core-api | dev value | Secret Manager |
| `STORAGE_BACKEND` | core-api, render-worker | `local` | `gcs` |
| `LOCAL_STORAGE_DIR` | both | shared volume `/data` | n/a |
| `GCS_BUCKET`, `SIGNED_URL_TTL_SECONDS` (900), `SIGNING_SERVICE_ACCOUNT` | both | n/a | set |
| `QUEUE_BACKEND` | core-api | `local` (posts the push envelope to `WORKER_URL/pubsub/push` in a background task) | `pubsub` |
| `PUBSUB_TOPIC`, `WORKER_URL` | core-api | `WORKER_URL` only | topic path |
| `TOOL_AUTH` | core-api | `none` | `iam` (attach a Google ID token whose audience is the target service URL) |
| `BGREMOVAL_URL`, `COLOR_URL` | core-api | localhost | Cloud Run URLs |
| `CORS_ORIGINS` | core-api | `http://localhost:3000` | empty (same origin through the load balancer) |

Local storage "signed URL": `/api/files/{token}` where `token` is a short-lived signed token (PyJWT) naming the storage key.

---

## 8. Cloud-readiness (required for every service)

- Dockerfile: `python:3.11-slim` (frontend: `node:20-alpine`, Next.js `output: "standalone"`, `HOSTNAME=0.0.0.0`), non-root user, listens on `$PORT` (default 8080), no writes except `/tmp`, `.dockerignore`.
- Stateless. No in-memory sessions or caches that matter. Any instance can serve any request.
- Logging: one JSON object per line on stdout with `severity`, `message`, `service`, `request_id`. No `print`.
- `GET /healthz` on every backend service.
- Database pool: `pool_size=3`, `max_overflow=2`, `pool_pre_ping=True` (Cloud Run scales out, so many small pools add up).
- GCS signed URLs on Cloud Run use V4 signing through IAM `signBlob`: refresh the default credentials, then call `blob.generate_signed_url(version="v4", expiration=..., service_account_email=SIGNING_SERVICE_ACCOUNT, access_token=creds.token)`. No key files anywhere.
- Pub/Sub push is already authenticated by Cloud Run IAM (invoker role), so the worker needs no extra token check.
- Resource hints for deploy scripts: render-worker concurrency 1, 2 CPU, 2Gi, timeout 300s, max instances 10. bgremoval concurrency 1, 2 CPU, 2Gi, timeout 120s. color 1 CPU, 1Gi. core-api 1 CPU, 512Mi, concurrency 40. font-service and frontend 512Mi.

---

## 9. Known pitfalls (verify each one)

1. Rotation pivot is the top-left corner (section 3). Write a unit test for it.
2. Konva Transformer: on `transformend`, bake `scaleX/scaleY` into `width/height` (for text, into `width` only) and reset the scale to 1.
3. Load fonts (`document.fonts.load(...)`) before drawing or measuring text in Konva.
4. Images drawn on the canvas need `crossOrigin = "anonymous"`, and the GCS bucket needs a CORS rule allowing GET/HEAD.
5. Do not create `/api/*` routes inside Next.js (they would collide with the load balancer's `/api/*` routing).
6. Signed URLs expire. `GET /api/projects/{id}` returns fresh `assetUrls` every time; the editor must use them.
7. Pub/Sub is at-least-once: the worker must be idempotent.
8. The worker must not create tables.
9. Store all timestamps in UTC.
10. Pillow work in `async def` blocks the event loop. Use `def`.

---

## 10. Frontend

Pages: `/login`, `/register`, `/projects` (list, delete, new project from a template or blank), `/editor/[id]`.
Auth token in `localStorage`; a fetch wrapper adds the Bearer header and redirects to `/login` on 401.
Local dev: `next.config.js` `rewrites()` proxies `/api/:path*` to core-api and `/fonts/:path*` to font-service. In production the load balancer does this routing.

Editor: left panel (add text, rectangle, ellipse; upload image; my assets; tools), center (Konva stage scaled to fit, Transformer for move/resize/rotate, Delete key removes), right panel (properties: fill, stroke, opacity, font family from `/fonts/list`, size, bold, align, image filters), layer order up/down, Save (plus autosave after 3 seconds idle), Export menu (PNG/JPEG/PDF, 1x/2x) that shows the job status by polling every 2 seconds and gives a download link when done.
Tools panel (hidden when `/api/tools` says unavailable): remove background on the selected image, extract palette (click a swatch to apply it as fill), harmonies for a chosen color, contrast checker, color presets.
Not included: undo/redo, OAuth, refresh tokens, sharing links, quotas, subscriptions.

---

## 11. Definition of done

- `docker compose up` starts Postgres plus every backend service; `scripts/smoke_test.sh` passes end to end: register, login, upload, create project from a template, add the image, export PNG, poll until done, download and check the pixel dimensions; then the tool calls (bg-remove, palette, preset, harmonies, contrast) and `/fonts/list`.
- `pytest` passes in every service.
- The frontend builds (`npm run build`) and every flow in section 10 works.
- Every Docker image builds and starts with only `PORT` and the variables from section 7.
