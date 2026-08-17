# Cloud-Native Poster/Banner Editor — Project Blueprint
### (Working name: "PixelForge" — rename as you like)
Team: Tejas (Apa Mestry) + Brandon Noronha | Platform: GCP | Timeline: ~3 months

---

## 1. Why This *Needs* the Cloud (your instructor will ask this)

Don't just say "we hosted it on GCP." Point to the specific things that would be *painful or impossible* on a single server:

| Requirement | Why a single server can't do it well |
|---|---|
| **Export rendering** (turning a design into a final PNG/PDF/JPEG) is CPU-heavy and bursty — 50 users exporting at once shouldn't queue behind each other | Needs a **queue + autoscaling worker pool** |
| **Image storage** for thousands of user uploads/assets, served fast worldwide | Needs **object storage + CDN**, not a local disk |
| **Traffic spikes** (e.g. everyone exports before a deadline) | Needs **horizontal autoscaling + load balancing** |
| **Multiple independent services** (auth, projects, assets, rendering) evolving/scaling separately | Needs **microservices**, not a monolith |
| **Secure access to private assets** (a user's unpublished design shouldn't be a public URL) | Needs **signed URLs / IAM**, not "just serve the folder" |
| **Zero-downtime deploys, service isolation, observability** | Needs **managed cloud infra**, not SSH + restart |

This framing alone is a strong intro slide for your project report.

---

## 2. High-Level Architecture

```
                        ┌─────────────────────┐
                        │   Cloud DNS + HTTPS  │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  GCP HTTPS Load       │◄── Cloud Armor (WAF/DDoS)
                        │  Balancer + Cloud CDN │
                        └──────────┬───────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
         ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
         │ Auth Service │  │ Project Svc  │  │ Asset Svc    │   ← Cloud Run
         │ (JWT/OAuth)  │  │ (CRUD designs│  │ (upload,     │     services,
         └───────┬──────┘  │  templates)  │  │ signed URLs) │     each auto-
                 │         └───────┬──────┘  └───────┬──────┘     scaling
                 │                 │                 │
         ┌───────▼─────────────────▼─────────────────▼───────┐
         │              Cloud SQL (Postgres)                  │
         │        users | projects | designs | templates      │
         └──────────────────────────────────────────────────┘

         ┌──────────────────────────────────────────────────┐
         │        Cloud Storage (GCS) — raw + processed       │
         │        images, fonts, exported files                │
         └──────────────────────────────────────────────────┘

     Export flow (the "real cloud" part):
     Client → Export API → Pub/Sub topic → Cloud Run worker (autoscaled)
                                          → renders via node-canvas/sharp
                                          → writes to GCS
                                          → notifies client (WebSocket/poll)

         ┌──────────────────────────────────────────────────┐
         │  Memorystore (Redis) — sessions, editor state cache │
         └──────────────────────────────────────────────────┘

     Cross-cutting: Secret Manager, IAM per-service accounts,
     Cloud Logging + Monitoring + Trace, Cloud Build CI/CD
```

---

## 3. Microservice Breakdown

| Service | Responsibility | Notes |
|---|---|---|
| **Auth Service** | Signup/login, JWT issue/refresh, OAuth (Google login) | Own DB table or Firebase Auth if you want to save time |
| **Project Service** | CRUD for user's designs (canvas JSON, layers, metadata) | Core "editor save/load" logic |
| **Asset Service** | Upload images/fonts, generate signed upload/download URLs to GCS, thumbnail generation | Talks directly to GCS |
| **Template Service** | Pre-built poster/banner/infographic templates | Can be read-mostly, cache in Redis |
| **Render/Export Service** | The async, compute-heavy one: takes canvas JSON → renders final image/PDF | **This is your standout "cloud-native" component** |
| **Notification Service** *(optional/stretch)* | Email or in-app "your export is ready" | Pub/Sub subscriber, Cloud Functions is fine here |

Each service = its own container, own Cloud Run deployment, own service account with least-privilege IAM. This is what "microservices" actually means for grading — not just "we split files into folders."

---

## 4. Suggested Tech Stack (optimized for 3 months, 2 people)

- **Frontend:** Next.js (React) + **Fabric.js** or **Konva.js** for the canvas editor (drag/resize/layer images, text, shapes)
- **Backend services:** Node.js + Express (or FastAPI in Python if you're more comfortable there) — keep it consistent across services so you're not context-switching languages
- **Rendering worker:** `node-canvas` or `sharp` (Node) to composite the final image server-side; use **Puppeteer** if you want pixel-perfect HTML/CSS-based rendering instead
- **Database:** Cloud SQL (PostgreSQL)
- **Object storage:** Google Cloud Storage (GCS) with signed URLs
- **Cache/session:** Memorystore (Redis)
- **Queue:** Pub/Sub (decouples "request export" from "do the rendering")
- **Compute:** **Cloud Run** for every service (recommended over GKE — see below)
- **CI/CD:** Cloud Build triggered from GitHub, pushing to Artifact Registry
- **Security:** Secret Manager, Cloud Armor, IAM service accounts per microservice

### Cloud Run vs. GKE — pick one honestly
- **Cloud Run** (recommended): fully managed, autoscales to zero, still "microservices," still needs a load balancer in front of it, dramatically less ops overhead. You'll actually finish in 3 months.
- **GKE (Kubernetes)**: more "textbook industry-grade," lets you show Deployments/Services/HPA/Ingress explicitly, but eats weeks of your timeline on cluster config alone.
- **Middle ground if you want k8s on your resume:** build everything on Cloud Run first (weeks 1–8), then containerize-and-move the Render service alone to GKE in the last few weeks as a "stretch/bonus" section. Low risk, high report value.

---

## 5. Security Checklist (don't skip — this is graded and it's cheap to add early)

- HTTPS everywhere (Load Balancer handles TLS termination)
- JWT-based auth, short-lived access tokens + refresh tokens
- Every service has its **own** GCP service account with minimum required IAM roles
- No hardcoded secrets — everything in **Secret Manager**
- GCS buckets private by default; access only via **signed URLs** with expiry
- **Cloud Armor** for basic WAF rules + rate limiting on the API Gateway/LB
- Input validation + file-type/size checks on uploads (don't let people upload a 500MB "image")
- CORS locked to your actual frontend origin

---

## 6. 3-Month Timeline (2 people)

### Month 1 — Foundations
- Week 1: GCP project setup, billing alerts, repo structure, CI/CD skeleton, architecture diagram finalized
- Week 2: Auth Service (Tejas) + Frontend shell/login pages (Brandon)
- Week 3: Project Service (CRUD) + Canvas editor MVP (add image, text, shape, move/resize)
- Week 4: Asset Service (GCS upload + signed URLs) wired into editor; save/load a design

**Milestone:** User can sign up, create a project, drag an image onto a canvas, and save it.

### Month 2 — The Cloud-Native Core
- Week 5: Pub/Sub + Render/Export Service skeleton (Tejas); Template Service + template picker UI (Brandon)
- Week 6: Full export pipeline working end-to-end (canvas → queue → worker → GCS → download link)
- Week 7: Load Balancer + Cloud CDN in front of everything; autoscaling config tuned
- Week 8: Redis caching for sessions/templates; polish editor UX (layers panel, undo/redo)

**Milestone:** User can design a poster and export a final high-res PNG/PDF, generated asynchronously.

### Month 3 — Hardening, Scale-Testing, Polish
- Week 9: Security pass — Cloud Armor, Secret Manager, IAM audit, signed-URL expiry testing
- Week 10: Load testing (e.g. k6 or Locust) — simulate concurrent exports, confirm autoscaling kicks in, capture graphs for your report
- Week 11: Monitoring dashboards (Cloud Monitoring), logging, error tracking; bug fixes
- Week 12: Documentation, architecture diagram polish, demo video/script, presentation deck, buffer for slippage

**Milestone:** Deployed, load-tested, documented, demo-ready.

---

## 7. Suggested Division of Labor

Rather than splitting strictly "frontend vs backend" (you'll bottleneck each other), split by **vertical slice**:

- **Tejas:** Auth Service, Render/Export Service, Pub/Sub pipeline, infra (Load Balancer, IAM, Cloud Armor, monitoring)
- **Brandon:** Canvas editor frontend, Project Service, Asset Service, Template Service

Integrate weekly — every Friday, merge and demo to each other what works end-to-end so integration pain surfaces early, not in week 11.

---

## 8. What to Show in the Final Report/Demo for Maximum Marks

1. Architecture diagram (the one above, cleaned up)
2. A load test graph showing the Render Service autoscaling under concurrent export requests — this single graph does more to prove "this needed the cloud" than anything else
3. A short explanation of IAM/service-account isolation per microservice
4. Cost breakdown from GCP billing (shows you understand cloud economics, not just cloud deployment)
5. Live demo: sign up → design a poster → export → download

---

## Next Steps
- Confirm your stack choices (Node vs Python, Fabric.js vs Konva)
- Set up the GCP project + billing alert *today* (free tier + student credits — watch Cloud SQL and Cloud Run idle costs)
- I can help you scaffold the repo structure, write the first Cloud Run Dockerfile, or design the Postgres schema next — just say which piece you want to start with.
