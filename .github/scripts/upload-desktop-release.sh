#!/usr/bin/env bash
set -euo pipefail

dist="${1:?Desktop dist directory required}"
version="${2:?Desktop version required}"
bucket=goyo-releases
wrangler_limit=$((300 * 1024 * 1024))

upload() {
  local file="$1" key="$2" bytes
  bytes="$(wc -c < "$file" | tr -d '[:space:]')"
  if (( bytes <= wrangler_limit )); then
    pnpm exec wrangler --config wrangler.jsonc r2 object put "$bucket/$key" --file "$file" --remote
    return
  fi

  if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    echo "::error::$(basename "$file") is $bytes bytes. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY for uploads over 300 MiB."
    return 1
  fi
  aws s3 cp "$file" "s3://$bucket/$key" \
    --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID:?Cloudflare account required}.r2.cloudflarestorage.com" \
    --region auto --only-show-errors
}

shopt -s nullglob
for file in "$dist"/*; do
  [[ -f "$file" ]] || continue
  name="${file##*/}"
  case "$name" in
    *.dmg) alias=Goyo.dmg ;;
    *.exe) alias=Goyo-Setup.exe ;;
    *.AppImage) alias=Goyo.AppImage ;;
    *.deb) alias=Goyo.deb ;;
    *.zip|*.blockmap) alias= ;;
    *) continue ;;
  esac

  upload "$file" "releases/v$version/$name"
  upload "$file" "releases/$name"
  if [[ -n "$alias" ]]; then
    upload "$file" "releases/$alias"
  fi
done

# Publish updater manifests last so clients never see a version before its assets.
for file in "$dist"/*.yml; do
  upload "$file" "releases/${file##*/}"
done
