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

update_version() {
  sed -i -E \
    -e "s/(\"@axonivy[^\"]*\": \"(workspace:)?)~[0-9]+\.[0-9]+\.[0-9]+-next(\")/\1~$NEXT_VERSION\3/" \
    -e "s/(\"@axonivy[^\"]*\": \"(workspace:)?)~[0-9]+\.[0-9]+\.[0-9]+-next\.[0-9]+\.[A-Za-z0-9]+(\")/\1~$NEXT_VERSION\3/" \
    -e "s/(\"@axonivy[^\"]*\": \")next-[0-9]+\.[0-9]+\.[0-9]+(\")/\1$NEXT_TAG\2/" \
    "$1"
}

for pkg in webviews/*/package.json extension/package.json package.json; do
  update_version "$pkg"
done
mvn --batch-mode versions:set-property versions:commit -Dproperty=openapi.version -DnewVersion=${1} -DallowSnapshots=true
