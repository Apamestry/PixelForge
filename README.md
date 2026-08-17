# PixelForge

Cloud-native design & basic video editing platform — Cloud Computing semester project.
Built by Tejas (Apa) Mestry & Brandon Noronha, deployed on Google Cloud Platform.

See `docs/PixelForge_BRD.docx` for full requirements.

## Repo Structure

```
pixelforge/
├── frontend/                    # Next.js (React) — canvas editor, video timeline UI
├── services/
│   ├── auth-service/            # FastAPI — registration, login, JWT, OAuth
│   ├── project-service/         # FastAPI — CRUD for design/video projects
│   ├── asset-service/           # FastAPI — uploads, signed URLs, thumbnails
│   ├── template-service/        # FastAPI — template library
│   ├── image-render-service/    # FastAPI worker — async image export (Pillow/OpenCV)
│   ├── video-render-service/    # FastAPI worker — async video export (FFmpeg)
│   └── admin-service/           # FastAPI — usage dashboard/analytics
├── infra/                       # Dockerfiles, Cloud Run configs, Terraform (optional)
└── docs/                        # BRD, architecture diagrams, meeting notes
```

## Tech Stack
- **Frontend:** Next.js + React, Fabric.js/Konva.js
- **Backend:** Python + FastAPI (all services)
- **Image processing:** Pillow / OpenCV
- **Video processing:** FFmpeg (via ffmpeg-python)
- **Database:** Cloud SQL (PostgreSQL)
- **Storage:** Google Cloud Storage
- **Queue:** Pub/Sub
- **Cache:** Memorystore (Redis)
- **Deploy:** Cloud Run + HTTPS Load Balancer + Cloud CDN

## Getting Started (local dev)
Each service under `services/` is an independent FastAPI app. See each service's own `README.md` (to be added) for local run instructions once scaffolded.

## Team
- Tejas (Apa) Mestry — Auth, Render/Export services, infra
- Brandon Noronha — Frontend editor, Project/Asset/Template services
