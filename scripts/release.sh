#!/usr/bin/env bash
# ==============================================================================
# HOSTIFY APPLIANCE - BUILD & RELEASE SCRIPT (MULTI-ARCH)
# ==============================================================================
# Builds and publishes the official multi-architecture Docker image for:
#   - linux/amd64 (Intel/AMD x86_64: PCs, Servers, UGREEN NAS, Synology)
#   - linux/arm64 (Apple Silicon, Raspberry Pi 4/5, ARM-based NAS)
# ==============================================================================
set -euo pipefail

IMAGE_NAME="${1:-hostify/appliance}"
VERSION="${2:-1.0.0}"

echo "=================================================================="
echo "  Hostify Multi-Architecture Build & Push"
echo "  Image:       ${IMAGE_NAME}"
echo "  Version:     ${VERSION} (and latest)"
echo "  Platforms:   linux/amd64, linux/arm64"
echo "=================================================================="

# Ensure runtime templates are synchronized before packaging
mkdir -p app/templates/feishin
cp docker-compose.yml app/templates/
cp docker/feishin/settings.js.template app/templates/feishin/

# Setup or activate Docker Buildx builder instance
BUILDER_NAME="hostify-builder"
if ! docker buildx inspect "${BUILDER_NAME}" &>/dev/null; then
    echo "==> Creating new buildx builder instance: ${BUILDER_NAME}..."
    docker buildx create --name "${BUILDER_NAME}" --driver docker-container --use
else
    docker buildx use "${BUILDER_NAME}"
fi

docker buildx inspect --bootstrap

echo "==> Building and pushing multi-arch images..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${IMAGE_NAME}:${VERSION}" \
    -t "${IMAGE_NAME}:latest" \
    -f app/Dockerfile ./app \
    --push

echo ""
echo "=================================================================="
echo "  ✓ Release build completed successfully!"
echo "  - ${IMAGE_NAME}:${VERSION}"
echo "  - ${IMAGE_NAME}:latest"
echo "=================================================================="
