#!/usr/bin/env bash
# Global external HTTP(S) load balancer in front of the Cloud Run services.
#   /api/*   -> core-api
#   /fonts/* -> font-service
#   anything else -> frontend
# Run after deploy.sh:   bash deploy/lb_setup.sh
#
# Optional environment variables:
#   DOMAIN=example.com        create a Google-managed certificate and serve HTTPS (HTTP redirects to HTTPS)
#   ENABLE_CDN_FONTS=true     turn on Cloud CDN for the font-service backend
#   ENABLE_ARMOR=true         add a Cloud Armor rate-limit policy (300 requests/min per IP) to the API backend
source "$(dirname "$0")/common.sh"

NAME="pixelforge"
DOMAIN="${DOMAIN:-}"
ENABLE_CDN_FONTS="${ENABLE_CDN_FONTS:-false}"
ENABLE_ARMOR="${ENABLE_ARMOR:-false}"

attach_neg() { # service
  if gcloud compute backend-services describe "be-$1" --global --format='value(backends[].group)' 2>/dev/null | grep -q "neg-$1"; then
    return 0
  fi
  gcloud compute backend-services add-backend "be-$1" --global \
    --network-endpoint-group="neg-$1" --network-endpoint-group-region="$REGION" || return 1
}

add_path_matcher() {
  if gcloud compute url-maps describe "${NAME}-lb" --format='value(pathMatchers[].name)' 2>/dev/null | grep -q "main"; then
    return 0
  fi
  gcloud compute url-maps add-path-matcher "${NAME}-lb" --path-matcher-name=main \
    --default-service=be-frontend \
    --path-rules="/api/*=be-core-api,/fonts/*=be-font-service" \
    --new-hosts="*" || return 1
}

setup_armor() {
  gcloud compute security-policies create "${NAME}-armor" --description="PixelForge rate limit" || return 1
  gcloud compute security-policies rules create 1000 --security-policy="${NAME}-armor" \
    --src-ip-ranges="*" --action=throttle \
    --rate-limit-threshold-count=300 --rate-limit-threshold-interval-sec=60 \
    --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP || return 1
  gcloud compute backend-services update be-core-api --global --security-policy="${NAME}-armor" || return 1
}

write_redirect_map() {
  cat > /tmp/pf-redirect.yaml <<EOF
name: ${NAME}-redirect
defaultUrlRedirect:
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  httpsRedirect: true
EOF
  gcloud compute url-maps import "${NAME}-redirect" --source=/tmp/pf-redirect.yaml --global --quiet || return 1
}

echo "Project: $PROJECT_ID | Region: $REGION | Domain: ${DOMAIN:-<none, HTTP only>}"
echo

step "Reserve global static IP" gcloud compute addresses create "${NAME}-ip" --global --ip-version=IPV4
IP="$(gcloud compute addresses describe "${NAME}-ip" --global --format='value(address)')"

for svc in frontend core-api font-service; do
  step "Serverless NEG for $svc" gcloud compute network-endpoint-groups create "neg-$svc" \
    --region="$REGION" --network-endpoint-type=serverless --cloud-run-service="$svc"
  step "Backend service for $svc" gcloud compute backend-services create "be-$svc" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP
  step "Attach NEG to be-$svc" attach_neg "$svc"
done

if [ "$ENABLE_CDN_FONTS" = "true" ]; then
  step "Enable Cloud CDN on be-font-service" gcloud compute backend-services update be-font-service \
    --global --enable-cdn --cache-mode=CACHE_ALL_STATIC
fi
if [ "$ENABLE_ARMOR" = "true" ]; then
  step "Cloud Armor rate limit on be-core-api" setup_armor
fi

step "Create URL map" gcloud compute url-maps create "${NAME}-lb" --default-service=be-frontend
step "Add path rules (/api, /fonts)" add_path_matcher

if [ -z "$DOMAIN" ]; then
  step "HTTP proxy" gcloud compute target-http-proxies create "${NAME}-http-proxy" --url-map="${NAME}-lb"
  step "HTTP forwarding rule (port 80)" gcloud compute forwarding-rules create "${NAME}-http-fr" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --address="${NAME}-ip" \
    --target-http-proxy="${NAME}-http-proxy" --ports=80
else
  step "Managed certificate for $DOMAIN" gcloud compute ssl-certificates create "${NAME}-cert" \
    --domains="$DOMAIN" --global
  step "HTTPS proxy" gcloud compute target-https-proxies create "${NAME}-https-proxy" \
    --url-map="${NAME}-lb" --ssl-certificates="${NAME}-cert"
  step "HTTPS forwarding rule (port 443)" gcloud compute forwarding-rules create "${NAME}-https-fr" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --address="${NAME}-ip" \
    --target-https-proxy="${NAME}-https-proxy" --ports=443
  step "HTTP to HTTPS redirect map" write_redirect_map
  step "Redirect proxy" gcloud compute target-http-proxies create "${NAME}-redirect-proxy" --url-map="${NAME}-redirect"
  step "HTTP forwarding rule (port 80, redirects)" gcloud compute forwarding-rules create "${NAME}-http-fr" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --address="${NAME}-ip" \
    --target-http-proxy="${NAME}-redirect-proxy" --ports=80
fi

echo
echo "Load balancer IP: $IP"
if [ -z "$DOMAIN" ]; then
  echo "Open: http://$IP   (give it 3-5 minutes; 404 or 502 right after creation is normal)"
  echo "This is HTTP only. For HTTPS, point a domain's A record at $IP and re-run with DOMAIN=your.domain"
  echo "(a free option is DOMAIN=\$(echo $IP | tr . -).nip.io, but certificate provisioning for it can take a long time or fail)"
else
  echo "Point an A record for $DOMAIN to $IP, then check the certificate:"
  echo "  gcloud compute ssl-certificates describe ${NAME}-cert --global --format='value(managed.status)'"
  echo "It must show ACTIVE (can take 15-60 minutes) before https://$DOMAIN works."
fi
