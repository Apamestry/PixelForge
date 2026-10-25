#!/usr/bin/env bash
# Build each service with Cloud Build, push to Artifact Registry, deploy to Cloud Run,
# then connect Pub/Sub to the render-worker.
#   bash deploy/deploy.sh                 # deploy everything
#   bash deploy/deploy.sh frontend        # redeploy only the frontend (or any listed services)
source "$(dirname "$0")/common.sh"
cd "$(dirname "$0")/.."   # repo root

TAG="$(date +%Y%m%d%H%M%S)"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"

# Phase 2 extension services are not built yet. When they exist, add them here:
#   bgremoval-service color-service
ALL_SERVICES="font-service render-worker core-api frontend"
if [ "$#" -gt 0 ]; then SERVICES="$*"; else SERVICES="$ALL_SERVICES"; fi

src_dir() { if [ "$1" = "frontend" ]; then echo "frontend"; else echo "services/$1"; fi; }

build_image() {
  gcloud builds submit "$(src_dir "$1")" --tag "${REGISTRY}/$1:${TAG}" --project "$PROJECT_ID" --quiet || return 1
}

deploy_run() { # service, then extra gcloud flags
  local svc="$1"; shift
  gcloud run deploy "$svc" --image "${REGISTRY}/${svc}:${TAG}" --region "$REGION" --project "$PROJECT_ID" --port 8080 "$@" || return 1
}

# Public service. If an organization policy blocks "allUsers", retry with the invoker IAM check disabled.
deploy_public() {
  local out
  if out=$(deploy_run "$@" --allow-unauthenticated 2>&1); then
    echo "$out"; return 0
  fi
  if echo "$out" | grep -qiE "permitted customer|allUsers|constraints/iam|Policy modification failed"; then
    echo "Organization policy blocks public access, retrying with --no-invoker-iam-check" >&2
    deploy_run "$@" --no-invoker-iam-check || return 1
  else
    echo "$out" >&2
    return 1
  fi
}

deploy_service() {
  case "$1" in
    font-service)
      deploy_public font-service --service-account "$(sa_email "$SA_FONT")" \
        --memory 512Mi --cpu 1 --max-instances 3 --set-env-vars "ENV=gcp" ;;
    render-worker)
      deploy_run render-worker --no-allow-unauthenticated --service-account "$(sa_email "$SA_WORKER")" \
        --memory 2Gi --cpu 2 --concurrency 1 --timeout 300 --min-instances 0 --max-instances "${WORKER_MAX:-6}" \
        --add-cloudsql-instances "$CONN" \
        --set-env-vars "ENV=gcp,STORAGE_BACKEND=gcs,GCS_BUCKET=${BUCKET},RENDER_ARTIFICIAL_DELAY_SECONDS=${RENDER_DELAY:-0}" \
        --set-secrets "DATABASE_URL=database-url:latest" ;;
    core-api)
      deploy_public core-api --service-account "$(sa_email "$SA_CORE")" \
        --memory 1Gi --cpu 1 --concurrency 40 --timeout 60 --min-instances "${CORE_MIN:-0}" --max-instances 5 \
        --add-cloudsql-instances "$CONN" \
        --set-env-vars "ENV=gcp,STORAGE_BACKEND=gcs,GCS_BUCKET=${BUCKET},SIGNING_SERVICE_ACCOUNT=$(sa_email "$SA_CORE"),QUEUE_BACKEND=pubsub,PUBSUB_TOPIC=projects/${PROJECT_ID}/topics/${TOPIC},SIGNED_URL_TTL_SECONDS=900,JWT_EXPIRE_MINUTES=60" \
        --set-secrets "DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest" ;;
    frontend)
      deploy_public frontend --service-account "$(sa_email "$SA_FRONT")" \
        --memory 512Mi --cpu 1 --max-instances 3 ;;
    *)
      echo "Unknown service: $1" >&2; return 1 ;;
  esac
}

# Connect Pub/Sub -> render-worker (push, authenticated with an OIDC token, dead-lettering after 5 tries).
wire_pubsub() {
  local worker_url push_email pubsub_agent
  worker_url="$(gcloud run services describe render-worker --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')" || return 1
  push_email="$(sa_email "$SA_PUSH")"
  pubsub_agent="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

  gcloud run services add-iam-policy-binding render-worker --region "$REGION" --project "$PROJECT_ID" \
    --member="serviceAccount:${push_email}" --role=roles/run.invoker >/dev/null || return 1
  gcloud pubsub topics add-iam-policy-binding "$DLQ_TOPIC" \
    --member="serviceAccount:${pubsub_agent}" --role=roles/pubsub.publisher >/dev/null || return 1

  if gcloud pubsub subscriptions describe "$SUBSCRIPTION" >/dev/null 2>&1; then
    gcloud pubsub subscriptions update "$SUBSCRIPTION" \
      --push-endpoint="${worker_url}/pubsub/push" \
      --push-auth-service-account="$push_email" --push-auth-token-audience="$worker_url" || return 1
  else
    gcloud pubsub subscriptions create "$SUBSCRIPTION" --topic="$TOPIC" \
      --push-endpoint="${worker_url}/pubsub/push" \
      --push-auth-service-account="$push_email" --push-auth-token-audience="$worker_url" \
      --ack-deadline=300 --dead-letter-topic="$DLQ_TOPIC" --max-delivery-attempts=5 \
      --min-retry-delay=10s --max-retry-delay=120s || return 1
  fi
  gcloud pubsub subscriptions add-iam-policy-binding "$SUBSCRIPTION" \
    --member="serviceAccount:${pubsub_agent}" --role=roles/pubsub.subscriber >/dev/null || return 1
}

echo "Project: $PROJECT_ID | Region: $REGION | Image tag: $TAG"
echo "Services: $SERVICES"
echo "(each build takes a few minutes; nothing prints until a step finishes)"
echo

for svc in $SERVICES; do
  step "Build image: $svc"  build_image "$svc"
  step "Deploy: $svc"       deploy_service "$svc"
  if [ "$svc" = "render-worker" ]; then
    step "Connect Pub/Sub to render-worker" wire_pubsub
  fi
done

echo
echo "Service URLs:"
for svc in $SERVICES; do
  echo "  $svc: $(gcloud run services describe "$svc" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
done
echo
echo "Quick check:  curl <core-api URL>/healthz"
echo "The frontend uses relative URLs (/api, /fonts), so it only works end to end behind the load balancer."
echo "Next: bash deploy/lb_setup.sh"
