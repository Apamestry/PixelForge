#!/usr/bin/env bash
# One-time infrastructure setup for PixelForge. Safe to re-run.
# Creates: APIs, Artifact Registry, private bucket, Cloud SQL, secrets, Pub/Sub topics, service accounts + IAM.
# Cloud SQL creation takes several minutes. Run:  bash deploy/setup_gcp.sh
source "$(dirname "$0")/common.sh"

echo "Project: $PROJECT_ID | Region: $REGION | Bucket: $BUCKET"
echo

CORE_EMAIL="$(sa_email "$SA_CORE")"
WORKER_EMAIL="$(sa_email "$SA_WORKER")"

# ---------- helpers (every multi-command function stops at the first error) ----------
bind_project() { # member role
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="$1" --role="$2" --condition=None --quiet >/dev/null || return 1
}
bind_bucket() { # service-account-email role
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$1" --role="$2" >/dev/null || return 1
}
bind_secret() { # secret service-account-email
  gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:$2" --role=roles/secretmanager.secretAccessor >/dev/null || return 1
}
bind_topic_publisher() { # service-account-email
  gcloud pubsub topics add-iam-policy-binding "$TOPIC" --member="serviceAccount:$1" --role=roles/pubsub.publisher >/dev/null || return 1
}
bind_self_token_creator() { # service-account-email (needed so core-api can sign GCS URLs)
  gcloud iam service-accounts add-iam-policy-binding "$1" --member="serviceAccount:$1" --role=roles/iam.serviceAccountTokenCreator >/dev/null || return 1
}
apply_cors() {
  cat > /tmp/pf-cors.json <<EOF
[{"origin": ["${CORS_ORIGIN:-*}"], "method": ["GET", "HEAD"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]
EOF
  gcloud storage buckets update "gs://$BUCKET" --cors-file=/tmp/pf-cors.json || return 1
}
ensure_secret() { # name value  (creates the secret only if it does not exist yet)
  if gcloud secrets describe "$1" >/dev/null 2>&1; then return 0; fi
  printf '%s' "$2" | gcloud secrets create "$1" --data-file=- --replication-policy=automatic || return 1
}
ensure_sql_user() {
  if gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
    gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" || return 1
  else
    gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" || return 1
  fi
}

# ---------- project and APIs ----------
step "Set active project" gcloud config set project "$PROJECT_ID"
step "Enable APIs" gcloud services enable \
  run.googleapis.com sqladmin.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com compute.googleapis.com \
  iamcredentials.googleapis.com iam.googleapis.com --project "$PROJECT_ID"
step "Let the build service account build and push images" \
  bind_project "serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" roles/cloudbuild.builds.builder

# ---------- registry and storage ----------
step "Create Artifact Registry repo" gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker --location="$REGION" --description="PixelForge images"
step "Create private bucket" gcloud storage buckets create "gs://$BUCKET" \
  --location="$REGION" --uniform-bucket-level-access --public-access-prevention
step "Set bucket CORS (GET/HEAD)" apply_cors

# ---------- secrets ----------
step "Secret: jwt-secret" ensure_secret jwt-secret "$(openssl rand -hex 32)"
step "Secret: db-password" ensure_secret db-password "$(openssl rand -hex 16)"
DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password)"

# ---------- Cloud SQL (slow) ----------
echo "Creating Cloud SQL instance. This takes 5-10 minutes, please wait..."
step "Create Cloud SQL instance" gcloud sql instances create "$SQL_INSTANCE" \
  --database-version=POSTGRES_15 --edition=ENTERPRISE --tier=db-f1-micro \
  --region="$REGION" --storage-size=10GB
step "Create database" gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
step "Create database user" ensure_sql_user
step "Secret: database-url" ensure_secret database-url \
  "postgresql+psycopg2://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONN}"

# ---------- Pub/Sub topics (the push subscription is created by deploy.sh) ----------
step "Create topic $TOPIC" gcloud pubsub topics create "$TOPIC"
step "Create dead-letter topic $DLQ_TOPIC" gcloud pubsub topics create "$DLQ_TOPIC"

# ---------- service accounts (one per service, least privilege) ----------
for sa in "$SA_CORE" "$SA_WORKER" "$SA_PUSH" "$SA_FONT" "$SA_FRONT"; do
  step "Create service account $sa" gcloud iam service-accounts create "$sa" --display-name="PixelForge $sa"
done
echo "Waiting 20s for service accounts to propagate..."
sleep 20

step "core-api: Cloud SQL client"        bind_project "serviceAccount:$CORE_EMAIL" roles/cloudsql.client
step "core-api: bucket access"           bind_bucket "$CORE_EMAIL" roles/storage.objectAdmin
step "core-api: publish to $TOPIC"       bind_topic_publisher "$CORE_EMAIL"
step "core-api: read jwt-secret"         bind_secret jwt-secret "$CORE_EMAIL"
step "core-api: read database-url"       bind_secret database-url "$CORE_EMAIL"
step "core-api: sign GCS URLs (self token creator)" bind_self_token_creator "$CORE_EMAIL"

step "render-worker: Cloud SQL client"   bind_project "serviceAccount:$WORKER_EMAIL" roles/cloudsql.client
step "render-worker: bucket access"      bind_bucket "$WORKER_EMAIL" roles/storage.objectAdmin
step "render-worker: read database-url"  bind_secret database-url "$WORKER_EMAIL"

echo
echo "Setup finished. Next: bash deploy/deploy.sh"
echo "Cloud SQL connection name: $CONN"
