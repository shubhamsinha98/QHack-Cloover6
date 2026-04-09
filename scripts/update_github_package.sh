#!/bin/zsh

set -euo pipefail

PROJECT_DIR="/Users/shubhamsinha/Documents/New project"
PACKAGE_DIR="$PROJECT_DIR/Cloover-GitHub-Package"
SNAPSHOT_ROOT="$PROJECT_DIR/Cloover-GitHub-Package-Versions"

cd "$PROJECT_DIR"

branch=$(git branch --show-current 2>/dev/null || echo "unknown")
commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "no-commit")
commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "0")
generated_at=$(date +"%Y-%m-%d %H:%M:%S %Z")
safe_branch=${branch//\//-}
snapshot_name="Cloover-GitHub-Package-${safe_branch}-v${commit_count}-${commit_hash}"
snapshot_dir="$SNAPSHOT_ROOT/$snapshot_name"

mkdir -p "$PACKAGE_DIR"
mkdir -p "$SNAPSHOT_ROOT"

rm -rf \
  "$PACKAGE_DIR/.env" \
  "$PACKAGE_DIR/.DS_Store" \
  "$PACKAGE_DIR/Code"

rsync -a --delete --delete-excluded \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude 'data/cloover-db.json' \
  --exclude 'Cloover-GitHub-Package' \
  --exclude 'Cloover-GitHub-Package-Versions' \
  ./ "$PACKAGE_DIR"/

cat > "$PACKAGE_DIR/VERSION.txt" <<EOF
Package: Cloover GitHub Package
Branch: $branch
Version: v$commit_count
Commit: $commit_hash
Generated: $generated_at
EOF

if [ ! -d "$snapshot_dir" ]; then
  mkdir -p "$snapshot_dir"

  rsync -a \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.DS_Store' \
    --exclude '.env' \
    --exclude 'data/cloover-db.json' \
    --exclude 'Cloover-GitHub-Package' \
    --exclude 'Cloover-GitHub-Package-Versions' \
    ./ "$snapshot_dir"/

  cat > "$snapshot_dir/VERSION.txt" <<EOF
Package: Cloover GitHub Package Snapshot
Branch: $branch
Version: v$commit_count
Commit: $commit_hash
Generated: $generated_at
EOF
fi
