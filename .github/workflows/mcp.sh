#!/usr/bin/env bash

set -euo pipefail

# Launch VS Code Insiders similarly to playwright/tests/fixtures/baseTest.ts:runElectronAppTest
# Usage:
#   .github/workflows/mcp.sh [workspace-or-code-workspace]

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

WORKSPACE_INPUT="${1:-${REPO_ROOT}}"
if [[ "${WORKSPACE_INPUT}" = /* ]]; then
	WORKSPACE_PATH="${WORKSPACE_INPUT}"
else
	WORKSPACE_PATH="${REPO_ROOT}/${WORKSPACE_INPUT}"
fi

if [[ ! -e "${WORKSPACE_PATH}" ]]; then
	echo "Workspace path does not exist: ${WORKSPACE_PATH}" >&2
	exit 1
fi

CACHE_DIR="${HOME}/.cache/vscode-insiders"
DOWNLOAD_DIR="${CACHE_DIR}/download"
INSTALL_DIR="${CACHE_DIR}/install"
ARCHIVE_PATH="${DOWNLOAD_DIR}/vscode-insiders.tar.gz"
DOWNLOAD_URL="https://update.code.visualstudio.com/latest/linux-x64/insider"

mkdir -p "${DOWNLOAD_DIR}" "${INSTALL_DIR}"

CODE_INSIDERS_BIN=""
if [[ -z "$(find "${INSTALL_DIR}" -mindepth 1 -print -quit 2>/dev/null)" ]]; then
	echo "Downloading VS Code Insiders..."
	curl -fL "${DOWNLOAD_URL}" -o "${ARCHIVE_PATH}"

	echo "Extracting VS Code Insiders..."
	rm -rf "${INSTALL_DIR:?}"/*
	tar -xzf "${ARCHIVE_PATH}" -C "${INSTALL_DIR}"
fi

CODE_INSIDERS_BIN="$(find "${INSTALL_DIR}" -type f -path '*/bin/code-insiders' -print -quit 2>/dev/null || true)"
if [[ -z "${CODE_INSIDERS_BIN}" || ! -x "${CODE_INSIDERS_BIN}" ]]; then
	echo "Unable to locate code-insiders in ${INSTALL_DIR}" >&2
	exit 1
fi

EXTENSIONS_DIR="$(mktemp -d -t vscode-insiders-ext-XXXXXX)"
USER_DATA_DIR="${REPO_ROOT}/ci-user-data"

echo "Installing extensions ..."
"${CODE_INSIDERS_BIN}" --list-extensions  --extensions-dir "${EXTENSIONS_DIR}"
"${CODE_INSIDERS_BIN}" --install-extension vscjava.vscode-java-pack --extensions-dir "${EXTENSIONS_DIR}"
"${CODE_INSIDERS_BIN}" --install-extension ${REPO_ROOT}/extension/vscode-designer*.vsix --extensions-dir "${EXTENSIONS_DIR}"


# SETTINGS_DIR="$(mktemp -d -t vscode-insiders-settings-XXXXXX)"
mkdir -p "${USER_DATA_DIR}/User"
SETTINGS_FILE="${USER_DATA_DIR}/User/settings.json"

cat > "${SETTINGS_FILE}" << EOF
{
  "java.jdt.ls.java.home": "${JAVA_HOME:-}",
  "axonivy.localMcp.enabled": true,
  "axonivy.localMcp.host": "0.0.0.0",
  "axonivy.localMcp.port": 32140,
  "axonivy.localMcp.exposeAllTools": false
}
EOF

CODE_INSIDERS_LOG="${USER_DATA_DIR}/code-insiders.log"

echo "Launching VS Code Insiders..."
echo "Workspace: ${WORKSPACE_PATH}"
echo "Extensions dir: ${EXTENSIONS_DIR}"
echo "User data dir: ${USER_DATA_DIR}"
echo "Log file: ${CODE_INSIDERS_LOG}"
exec "${CODE_INSIDERS_BIN}" \
	--disable-dev-shm-usage \
	--disable-telemetry \
	--disable-gpu \
	--disable-animation \
	--disable-updates \
	--skip-welcome \
	--skip-release-notes \
	--disable-workspace-trust \
	--extensionDevelopmentPath="${REPO_ROOT}/extension" \
	--extensions-dir="${EXTENSIONS_DIR}" \
	--user-data-dir="${USER_DATA_DIR}" \
	"${WORKSPACE_PATH}" >> "${CODE_INSIDERS_LOG}" &

sleep 5
echo "Logs: "
cat "${CODE_INSIDERS_LOG}"

ps aux | grep insiders

curl -L --retry 5 --retry-delay 2 --retry-all-errors http://127.0.0.1:32140/health
