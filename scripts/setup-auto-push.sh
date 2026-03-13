#!/usr/bin/env bash
set -euo pipefail

# Configure this repository so first push automatically sets upstream
# (equivalent to `git push --set-upstream origin <branch>`).
git config --local push.autoSetupRemote true

# Keep push behavior predictable: push only the current branch by default.
git config --local push.default current

echo "✅ Auto-push configuration applied for $(basename "$(git rev-parse --show-toplevel)")"
echo "   - push.autoSetupRemote=true"
echo "   - push.default=current"
