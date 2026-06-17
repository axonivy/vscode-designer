#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/version-helper.sh"

NEXT_VERSION="$(to_next_version "$VERSION")"
NEXT_TAG="$(to_next_tag "$VERSION")"

mvn --batch-mode -f pom.xml versions:set versions:commit -DnewVersion="$VERSION"

pnpm install
pnpm run raise:version "$NEXT_VERSION"
sed -i -E "s/(--pre-dist-tag )next-[0-9]+\.[0-9]+\.[0-9]+/\1$NEXT_TAG/" package.json
pnpm install --no-frozen-lockfile
