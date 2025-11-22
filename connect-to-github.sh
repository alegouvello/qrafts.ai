#!/bin/bash

# Connect Qrafts iOS project to existing GitHub repository
# Repository: alegouvello/qraft

set -e

echo "🔗 Connecting Qrafts to GitHub repository: alegouvello/qraft"
echo ""

# Step 1: Initialize Git if not already done
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: Qrafts iOS app setup"
else
    echo "✅ Git repository already initialized"
    git add .
    git commit -m "Add Qrafts iOS app configuration" || echo "No changes to commit"
fi

# Step 2: Add remote (remove if exists first)
echo "🔗 Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/alegouvello/qraft.git

# Step 3: Fetch from remote
echo "📥 Fetching from remote..."
git fetch origin

# Step 4: Check if we should merge or create a new branch
echo ""
echo "⚠️  The remote repository already has code."
echo "Choose an option:"
echo "1. Push to a new branch (recommended for iOS app)"
echo "2. Merge with main branch (may have conflicts)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Create and push to ios branch
    echo "🌿 Creating ios branch..."
    git checkout -b ios 2>/dev/null || git checkout ios
    echo "📤 Pushing to ios branch..."
    git push -u origin ios
    echo ""
    echo "✅ Success! Your iOS app code is now on the 'ios' branch."
    echo "   View it at: https://github.com/alegouvello/qraft/tree/ios"
elif [ "$choice" = "2" ]; then
    # Merge with main
    echo "🔄 Merging with main branch..."
    git branch -M main
    git pull origin main --allow-unrelated-histories || true
    git push -u origin main
    echo ""
    echo "✅ Success! Your code has been merged with main branch."
else
    echo "❌ Invalid choice. Exiting."
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Build the app: npm run build"
echo "3. Set up iOS: npx cap add ios && npm run ios:sync"
echo "4. Open in Xcode: npm run ios:open"

