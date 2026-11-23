#!/usr/bin/env bash
set -euo pipefail

schema_paths=(
  extension/src/ai/skills/ivy-yaml-files/schemas
  extension/src/ai/skills/ivy-json-files/schemas
  extension/src/ai/skills/ivy-market/schemas
  extension/src/ai/skills/schemas
)

if [[ -z "$(git status --porcelain --untracked-files=all -- "${schema_paths[@]}")" ]]; then
  exit 0
fi

git diff --no-ext-diff --unified=3 -- "${schema_paths[@]}"
while IFS= read -r -d '' file; do
  diff_status=0
  git diff --no-index --no-ext-diff --unified=3 -- /dev/null "$file" || diff_status=$?
  if [[ "$diff_status" -gt 1 ]]; then
    exit "$diff_status"
  fi
done < <(git ls-files --others --exclude-standard -z -- "${schema_paths[@]}")

echo "::error::Skill schemas are out of date. Run 'pnpm --dir extension generate:schemas' and commit the updated files."
exit 1
