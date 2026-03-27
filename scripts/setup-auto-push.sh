#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "⚠️ Not a git repository. Skipping auto push setup."
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_PATH="$HOOK_DIR/post-commit"

mkdir -p "$HOOK_DIR"

# Configure this repository so first push automatically sets upstream
# (equivalent to `git push --set-upstream origin <branch>`).
git config --local push.autoSetupRemote true

# Keep push behavior predictable: push only the current branch by default.
git config --local push.default current

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
set -u

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
if [ -z "$branch" ]; then
  echo "[auto-push] detached HEAD - skip"
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[auto-push] origin remote is not configured - skip"
  exit 0
fi

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"

if [ -z "$upstream" ]; then
  echo "[auto-push] first push for '$branch' (set upstream)"
  git push -u origin "$branch" || {
    echo "[auto-push] push failed (check auth/network)."
    exit 0
  }
else
  echo "[auto-push] pushing '$branch' to origin"
  git push origin "$branch" || {
    echo "[auto-push] push failed (check auth/network)."
    exit 0
  }
fi
HOOK

chmod +x "$HOOK_PATH"

echo "✅ Auto commit-push configuration applied for $(basename "$REPO_ROOT")"
echo "   - push.autoSetupRemote=true"
echo "   - push.default=current"
echo "   - post-commit hook installed: .git/hooks/post-commit"
echo "   - npm postinstall will keep this hook auto-linked"
