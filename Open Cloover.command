#!/bin/zsh

cd "/Users/shubhamsinha/Documents/New project" || exit 1

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if [ ! -f ".env" ]; then
  osascript -e 'display alert "Cloover setup needed" message "Missing .env file in /Users/shubhamsinha/Documents/New project." as critical'
  exit 1
fi

osascript -e 'tell application "Terminal" to do script "cd \"/Users/shubhamsinha/Documents/New project\" && ./start-cloover.sh"'
