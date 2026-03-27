#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   GITHUB_TOKEN=ghp_xxx bash ./scripts/setup-git-auth.sh
#   bash ./scripts/setup-git-auth.sh <token>

REPO_URL_DEFAULT="https://github.com/hansonjs80-design/PTperfect"
TOKEN="${1:-${GITHUB_TOKEN:-${GH_TOKEN:-}}}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not inside a git repository"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO_URL_DEFAULT"
  echo "[auth-setup] origin added: $REPO_URL_DEFAULT"
fi

# Use per-repo credential store so token isn't required every push.
git config --local credential.helper "store --file .git/credentials"

echo "[auth-setup] credential.helper configured (local)"

if [ -z "$TOKEN" ]; then
  echo "⚠️  No token provided."
  echo "    Set GITHUB_TOKEN (or GH_TOKEN), then rerun:"
  echo "    GITHUB_TOKEN=<token> bash ./scripts/setup-git-auth.sh"
  exit 0
fi

# Register GitHub PAT/token into git credential store
printf "protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n\n" "$TOKEN" | git credential approve

echo "[auth-setup] token saved to .git/credentials"

if git ls-remote --heads origin >/dev/null 2>&1; then
  echo "✅ GitHub authentication check passed (ls-remote ok)"
else
  echo "⚠️  Auth saved, but remote access check failed. Verify token scopes/repo permissions."
fi
