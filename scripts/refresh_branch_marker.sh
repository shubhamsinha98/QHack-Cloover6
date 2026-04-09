#!/bin/zsh

set -euo pipefail

cd "/Users/shubhamsinha/Documents/New project"

branch=$(git branch --show-current 2>/dev/null || echo "unknown")
printf 'Current branch: %s\n' "$branch" > CURRENT_BRANCH.txt
