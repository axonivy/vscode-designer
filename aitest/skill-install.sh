#!/bin/bash
set -euo pipefail

install_dir=$1
exit_code=0

expected_yaml_files=(
  SKILL.md
  schemas/config/custom-fields.json
  schemas/config/databases.json
  schemas/config/formats.json
  schemas/config/persistence.json
  schemas/config/rest-clients.json
  schemas/config/roles.json
  schemas/config/users.json
  schemas/config/variables.json
  schemas/config/webservice-clients.json
)
expected_json_files=(
  SKILL.md
  references/form.md
  schemas/project/casemap.json
  schemas/project/data-class.json
  schemas/project/form.json
  schemas/project/process.json
)

assert() {
  local -n expect=$1
  local dir="$2"
  diff -u \
    <(printf '%s\n' "${expect[@]}" | sort) \
    <(find "$dir" -type f -printf '%P\n' | sort) || exit_code=1
}

copySkill() {
  source_dir=$(mktemp -d)
  git archive HEAD extension/src/ai/skills | tar -x -C "$source_dir"
}

copySkill
gh skill install "$source_dir" --from-local --all --dir "$install_dir"

assert expected_yaml_files "$install_dir/ivy-yaml-files"
assert expected_json_files "$install_dir/ivy-json-files"
exit "$exit_code"