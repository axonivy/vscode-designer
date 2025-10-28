#!/bin/bash
set -e

mvn --batch-mode -f pom.xml versions:set versions:commit -DnewVersion=${1}

pnpm install
pnpm run raise:version ${1/-SNAPSHOT/}
pnpm install --no-frozen-lockfile

echo "update ivy version in maven.ts"
oldVersion="IVY_ENGINE_VERSION = '[0-9]+.[0-9]+.[0-9]+'"
newVersion="IVY_ENGINE_VERSION = '${1/-SNAPSHOT/}'"
sed -i -E "s|${oldVersion}|${newVersion}|" extension/src/engine/build/maven.ts
