#!/usr/bin/env bash
set -euo pipefail

CORE_URL="${CORE_API_URL:-http://localhost:8000}"
FONT_URL="${FONT_SERVICE_URL:-http://localhost:8002}"

echo "=== Running PixelForge Smoke Test ==="
echo "Core API URL: $CORE_URL"
echo "Font Service URL: $FONT_URL"

# 1. Health checks
echo "1. Checking service health..."
for i in {1..30}; do
  if curl -s -f "$CORE_URL/healthz" > /dev/null && curl -s -f "$FONT_URL/healthz" > /dev/null; then
    echo "Services are healthy!"
    break
  fi
  echo "Waiting for services to become healthy... ($i/30)"
  sleep 1
done

# 2. Register
RAND_SUFFIX=$(date +%s)_$RANDOM
EMAIL="smoke_${RAND_SUFFIX}@example.com"
PASSWORD="smokePassword123"

echo "2. Registering user: $EMAIL"
REG_RESP=$(curl -s -f -X POST "$CORE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")
echo "Registration response: $REG_RESP"

# 3. Login
echo "3. Logging in..."
LOGIN_RESP=$(curl -s -f -X POST "$CORE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "FAILED: Could not extract access token!"
  exit 1
fi
echo "Login successful. Token acquired."

# 4. Upload image asset
echo "4. Creating and uploading test PNG asset..."
TMP_IMG="/tmp/smoke_asset_${RAND_SUFFIX}.png"
# Create a valid PNG from base64 (no dependencies required)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" | base64 --decode > "$TMP_IMG"

UPLOAD_RESP=$(curl -s -f -X POST "$CORE_URL/api/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TMP_IMG;type=image/png")
rm -f "$TMP_IMG"

ASSET_ID=$(echo "$UPLOAD_RESP" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
ASSET_URL=$(echo "$UPLOAD_RESP" | grep -o '"url":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$ASSET_ID" ]; then
  echo "FAILED: Could not upload asset: $UPLOAD_RESP"
  exit 1
fi
echo "Asset uploaded. ID: $ASSET_ID, URL: $ASSET_URL"

# 5. List templates and choose one
echo "5. Fetching templates..."
TEMPLATES_RESP=$(curl -s -f -X GET "$CORE_URL/api/templates" \
  -H "Authorization: Bearer $TOKEN")
TEMPLATE_ID=$(echo "$TEMPLATES_RESP" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$TEMPLATE_ID" ]; then
  echo "FAILED: No templates found!"
  exit 1
fi
echo "Found template ID: $TEMPLATE_ID"

# 6. Create project from template
echo "6. Creating project from template..."
PROJECT_RESP=$(curl -s -f -X POST "$CORE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Project\", \"templateId\":\"$TEMPLATE_ID\"}")
PROJECT_ID=$(echo "$PROJECT_RESP" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$PROJECT_ID" ]; then
  echo "FAILED: Project creation failed!"
  exit 1
fi
echo "Project created. ID: $PROJECT_ID"

# 7. Add uploaded image to project canvas
echo "7. Adding image element to project canvas..."
# Fetch current canvas
CURRENT_PROJ=$(curl -s -f -X GET "$CORE_URL/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN")

# Append image element using Python to keep JSON valid
UPDATED_CANVAS=$(python3 -c "
import json
data = json.loads('''$CURRENT_PROJ''')
canvas = data['canvas']
canvas['elements'].append({
    'id': 'image-test-$RAND_SUFFIX',
    'type': 'image',
    'assetId': '$ASSET_ID',
    'x': 50,
    'y': 50,
    'width': 200,
    'height': 200,
    'rotation': 0,
    'opacity': 1.0,
    'filters': {'brightness': 0, 'contrast': 0, 'saturation': 0, 'grayscale': False}
})
print(json.dumps({'canvas': canvas}))
")

curl -s -f -X PUT "$CORE_URL/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_CANVAS" > /dev/null
echo "Project canvas updated with image element."

# 8. Export PNG
echo "8. Requesting PNG export..."
EXPORT_RESP=$(curl -s -f -X POST "$CORE_URL/api/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\", \"format\":\"png\", \"scale\":1}")
JOB_ID=$(echo "$EXPORT_RESP" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Export queued. Job ID: $JOB_ID"

# 9. Poll export status
echo "9. Polling export status..."
DOWNLOAD_URL=""
for i in {1..30}; do
  STATUS_RESP=$(curl -s -f -X GET "$CORE_URL/api/exports/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")
  JOB_STATUS=$(echo "$STATUS_RESP" | grep -o '"status":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "Attempt $i: status = $JOB_STATUS"
  if [ "$JOB_STATUS" = "done" ]; then
    DOWNLOAD_URL=$(echo "$STATUS_RESP" | grep -o '"downloadUrl":"[^"]*' | head -n 1 | cut -d'"' -f4)
    break
  elif [ "$JOB_STATUS" = "failed" ]; then
    echo "FAILED: Export job failed: $STATUS_RESP"
    exit 1
  fi
  sleep 1
done

if [ -z "$DOWNLOAD_URL" ]; then
  echo "FAILED: Export job timed out!"
  exit 1
fi
echo "Export completed successfully. Download URL: $DOWNLOAD_URL"

# 10. Download exported file
echo "10. Downloading exported PNG..."
OUT_FILE="/tmp/smoke_out_${RAND_SUFFIX}.png"
curl -s -f "$CORE_URL$DOWNLOAD_URL" -o "$OUT_FILE"

FILE_SIZE=$(wc -c < "$OUT_FILE" | tr -d ' ')
echo "Downloaded file size: $FILE_SIZE bytes"
if [ "$FILE_SIZE" -lt 100 ]; then
  echo "FAILED: Downloaded file too small!"
  rm -f "$OUT_FILE"
  exit 1
fi

# Verify PNG header
HEADER=$(head -c 4 "$OUT_FILE" || true)
if [ "$(printf '%s' "$HEADER" | xxd -p)" != "89504e47" ]; then
  echo "FAILED: Output file is not a valid PNG!"
  rm -f "$OUT_FILE"
  exit 1
fi
rm -f "$OUT_FILE"
echo "PNG verified valid!"

# 11. Test font-service catalog
echo "11. Testing font-service..."
FONTS_LIST=$(curl -s -f "$FONT_URL/fonts/list")
FONT_COUNT=$(python3 -c "import json; print(len(json.loads('''$FONTS_LIST''')))")
if [ "$FONT_COUNT" -ne 6 ]; then
  echo "FAILED: Expected 6 fonts, got $FONT_COUNT"
  exit 1
fi
echo "Font list verified: 6 fonts available."

# Download a font file
FONT_HEADERS=$(curl -s -I "$FONT_URL/fonts/files/Roboto-400.ttf")
echo "$FONT_HEADERS" | grep -i "Cache-Control" > /dev/null
echo "Font file caching header verified."

echo ""
echo "=========================================="
echo "  SMOKE TEST PASSED SUCCESSFULLY! (Phase 1)"
echo "=========================================="
