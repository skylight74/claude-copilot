#!/bin/bash
# Sync fork with upstream (runs silently, only shows output if updates found)

cd "$(dirname "$0")/.." || exit 1

# Fetch upstream silently
git fetch upstream --quiet 2>/dev/null

# Check if we're behind
BEHIND=$(git rev-list --count HEAD..upstream/main 2>/dev/null)

if [ "$BEHIND" -gt 0 ]; then
    echo "🔄 Upstream has $BEHIND new commit(s). Syncing..."

    # Try to merge
    if git merge upstream/main --no-edit --quiet; then
        echo "✅ Synced successfully"
        git push origin main --quiet
    else
        echo "⚠️  Merge conflict. Run manually:"
        echo "   git merge upstream/main"
        git merge --abort
    fi
fi
