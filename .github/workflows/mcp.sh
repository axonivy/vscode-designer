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
if ! "${CODE_INSIDERS_BIN}" --list-extensions --extensions-dir "${EXTENSIONS_DIR}" | grep -q '^axonivy.vscode-designer-14$'; then
	echo "Expected extension axonivy.vscode-designer-14 is not installed in ${EXTENSIONS_DIR}" >&2
	exit 1
fi


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
CODE_INSIDERS_PID_FILE="${USER_DATA_DIR}/code-insiders.pid"
MCP_HEALTH_URL="http://127.0.0.1:32140/health"
MCP_START_TIMEOUT_SEC="90"

launch_vscode() {
	local -a args
	args=(
		--disable-dev-shm-usage
		--disable-telemetry
		--disable-gpu
		--disable-updates
		--skip-welcome
		--skip-release-notes
		--disable-workspace-trust
		"--extensionDevelopmentPath=${REPO_ROOT}/extension"
		"--extensions-dir=${EXTENSIONS_DIR}"
		"--user-data-dir=${USER_DATA_DIR}"
		"${WORKSPACE_PATH}"
	)

	# CI runners may not expose DISPLAY; xvfb-run keeps Electron alive in that case.
	if [[ -z "${DISPLAY:-}" ]] && command -v xvfb-run >/dev/null 2>&1; then
		xvfb-run -a --server-args='-screen 0 1920x1080x24' "${CODE_INSIDERS_BIN}" "${args[@]}" >> "${CODE_INSIDERS_LOG}" 2>&1 &
	else
		"${CODE_INSIDERS_BIN}" "${args[@]}" >> "${CODE_INSIDERS_LOG}" 2>&1 &
	fi
}

echo "Launching VS Code Insiders..."
echo "Workspace: ${WORKSPACE_PATH}"
echo "Extensions dir: ${EXTENSIONS_DIR}"
echo "User data dir: ${USER_DATA_DIR}"
echo "Log file: ${CODE_INSIDERS_LOG}"

rm -f "${CODE_INSIDERS_LOG}"
launch_vscode
VSCODE_PID=$!
echo "VS Code launcher PID: ${VSCODE_PID}"
echo "${VSCODE_PID}" > "${CODE_INSIDERS_PID_FILE}"
echo "PID file: ${CODE_INSIDERS_PID_FILE}"

wait_for_mcp() {
	local deadline=$((SECONDS + MCP_START_TIMEOUT_SEC))
	while (( SECONDS < deadline )); do
		if ! kill -0 "${VSCODE_PID}" 2>/dev/null; then
			echo "VS Code Insiders process exited before MCP became available." >&2
			return 1
		fi
		if curl -fsS "${MCP_HEALTH_URL}" >/dev/null 2>&1; then
			return 0
		fi
		sleep 2
	done
	echo "Timed out after ${MCP_START_TIMEOUT_SEC}s waiting for ${MCP_HEALTH_URL}" >&2
	return 1
}

if ! wait_for_mcp; then
	echo "==== VS Code process status ===="
	ps -fp "${VSCODE_PID}" || true
	pgrep -af 'code-insiders|code-insider|Code - Insiders|electron' || true

	echo "==== code-insiders.log (tail) ===="
	tail -n 200 "${CODE_INSIDERS_LOG}" || true

	echo "==== exthost logs (tail) ===="
	LATEST_EXT_LOG_DIR="$(find "${USER_DATA_DIR}/logs" -type d -path '*/window*/exthost' 2>/dev/null | sort | tail -n 1 || true)"
	if [[ -n "${LATEST_EXT_LOG_DIR}" ]]; then
		find "${LATEST_EXT_LOG_DIR}" -maxdepth 2 -type f -name '*.log' -print -exec tail -n 80 {} \; || true
	else
		echo "No exthost logs found under ${USER_DATA_DIR}/logs"
	fi

	echo "==== display/xvfb diagnostics ===="
	echo "DISPLAY=${DISPLAY:-<unset>}"
	command -v xvfb-run >/dev/null 2>&1 && xvfb-run --help >/dev/null 2>&1 && echo "xvfb-run available" || echo "xvfb-run not available"

	exit 1
fi

echo "MCP health endpoint is reachable at ${MCP_HEALTH_URL}"
curl -fsS "${MCP_HEALTH_URL}"
