#!/bin/bash
set -euo pipefail

repository_root=$(git rev-parse --show-toplevel)
cd "$repository_root"

if ! declare -F report_schema_diff > /dev/null; then
  report_schema_diff() {
    echo '```diff'
    cat "$2"
    echo '```'
  }
fi

schema_roots=(
  extension/src/ai/skills/ivy-json-files/schemas
  extension/src/ai/skills/ivy-market/schemas
  extension/src/ai/skills/ivy-yaml-files/schemas
)

temporary_dir=$(mktemp -d)
temporary_index="$temporary_dir/index"
cp "$(git rev-parse --git-path index)" "$temporary_index"

GIT_INDEX_FILE="$temporary_index" git add --intent-to-add -- "${schema_roots[@]}"
mapfile -d '' changed < <(
  GIT_INDEX_FILE="$temporary_index" git diff --name-only --diff-filter=ACDMRT -z -- "${schema_roots[@]}"
)

if ((${#changed[@]})); then
  echo '## Out-of-sync schemas'
  for schema in "${changed[@]}"; do
    old="$temporary_dir/old-schema.json"
    new="$temporary_dir/new-schema.json"
    : > "$old"
    : > "$new"
    git show "HEAD:$schema" 2>/dev/null | jq . > "$old" || true
    if [[ -f "$schema" ]]; then
      jq . "$schema" > "$new"
    fi
    diff_file="$temporary_dir/schema.diff"
    diff -u --label "cloned/$schema" --label "official/$schema" "$old" "$new" > "$diff_file" || true
    report_schema_diff "$schema" "$diff_file"
  done
fi
