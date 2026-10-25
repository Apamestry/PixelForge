#!/usr/bin/env bash
# Shared settings and helpers. Sourced by the other deploy scripts (do not run this directly).
# Written for the default macOS bash (3.2): no bash-4-only features.
set -euo pipefail

# ---- Variables (override by exporting them before running a script) ----
PROJECT_ID="${PROJECT_ID:-mca-2512-510711}"
REGION="${REGION:-asia-south1}"
AR_REPO="${AR_REPO:-pixelforge}"
BUCKET="${BUCKET:-${PROJECT_ID}-pixelforge-assets}"
SQL_INSTANCE="${SQL_INSTANCE:-pixelforge-db}"
DB_NAME="${DB_NAME:-pixelforge}"
DB_USER="${DB_USER:-pixelforge}"
TOPIC="${TOPIC:-export-requests}"
DLQ_TOPIC="${DLQ_TOPIC:-export-requests-dlq}"
SUBSCRIPTION="${SUBSCRIPTION:-export-requests-push}"

SA_CORE="sa-core-api"
SA_WORKER="sa-render-worker"
SA_PUSH="sa-pubsub-invoker"
SA_FONT="sa-font-service"
SA_FRONT="sa-frontend"

sa_email() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CONN="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

# ---- step: run a command, print one OK / FAILED line, stop on failure ----
# Usage: step "description" command args...
# "already exists" errors count as OK, so the scripts are safe to re-run.
step() {
  local desc="$1"; shift
  local out
  if out=$("$@" 2>&1); then
    echo "OK      $desc"
  elif echo "$out" | grep -qiE "already exists|ALREADY_EXISTS|alreadyExists"; then
    echo "OK      $desc (already exists)"
  else
    echo "FAILED  $desc"
    echo "$out" | sed 's/^/        /'
    exit 1
  fi
}
