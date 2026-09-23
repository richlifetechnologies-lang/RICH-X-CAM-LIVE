#!/bin/bash
# Script to push RICH X CAM LIVE files to your GitHub repository safely
# Usage: ./push_to_github.sh <YOUR_GITHUB_REPO_URL>

if [ -z "$1" ]; then
  echo "Usage: ./push_to_github.sh https://github.com/your-username/rich-x-cam-live.git"
  exit 1
fi

REPO_URL=$1

echo "Initializing Git repository..."
git init
git branch -M main

echo "Adding all files..."
git add .

echo "Creating initial commit..."
git commit -m "Initial release of RICH X CAM LIVE - Real-Time Video & Voice Studio"

echo "Adding remote origin..."
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

echo "Pushing to GitHub..."
git push -u origin main

echo "Done! Your repository is safely updated on GitHub."
