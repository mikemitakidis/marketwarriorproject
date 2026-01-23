#!/bin/bash

echo "=== Fetching latest from GitHub ==="
git fetch origin
echo ""

echo "=== Current branch and commit ==="
git branch --show-current
git log --oneline -5
echo ""

echo "=== Checking if commit 15f2d78 exists ==="
if git log --oneline --all | grep -q "15f2d78"; then
    echo "✅ Commit 15f2d78 FOUND"
else
    echo "❌ Commit 15f2d78 NOT FOUND - need to pull"
fi
echo ""

echo "=== Pulling latest main ==="
git checkout main
git pull origin main
echo ""

echo "=== Latest commits on main ==="
git log --oneline -5
echo ""

echo "=== Verifying rate limiting in files ==="
FILES=(
    "pages/api/auth/logout.js"
    "pages/api/auth/set-session.js"
    "pages/api/community/comments.js"
    "pages/api/community/posts.js"
    "pages/api/me.js"
    "pages/api/progress/status.js"
    "pages/api/day/[day].js"
    "pages/api/template/[day].js"
    "pages/api/welcome/complete.js"
    "pages/api/keep-alive.js"
    "pages/api/cron/keep-alive.js"
    "pages/api/dev/grant-access.js"
)

MISSING=0
for file in "${FILES[@]}"; do
    if grep -q "applyRateLimit" "$file" 2>/dev/null; then
        echo "✅ $file has rate limiting"
    else
        echo "❌ $file MISSING rate limiting"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "=== Summary ==="
if [ $MISSING -eq 0 ]; then
    echo "✅ All 12 files have rate limiting!"
else
    echo "❌ $MISSING files are missing rate limiting"
fi
