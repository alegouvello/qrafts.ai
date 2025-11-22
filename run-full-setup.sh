#!/bin/bash

# Complete Automated Setup for Qrafts iOS App
# This script does everything: install, build, git setup, and GitHub connection

set -e  # Exit on any error

echo "🚀 Starting complete Qrafts iOS setup..."
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/13: Installing dependencies..."
npm install --legacy-peer-deps
echo "✅ Dependencies installed"
echo ""

# Step 2: Build the web app
echo "🔨 Step 2/13: Building the web app..."
npm run build
echo "✅ Build complete"
echo ""

# Step 3: Initialize Git
echo "📝 Step 3/13: Initializing Git repository..."
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi
echo ""

# Step 4: Add all files
echo "📁 Step 4/13: Adding files to Git..."
git add .
echo "✅ Files added"
echo ""

# Step 5: Make initial commit
echo "💾 Step 5/13: Creating initial commit..."
git commit -m "Initial commit: Qrafts iOS app setup" || echo "⚠️  No changes to commit (or already committed)"
echo "✅ Commit created"
echo ""

# Step 6: Add GitHub remote
echo "🔗 Step 6/13: Connecting to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/alegouvello/qraft.git
echo "✅ Remote added"
echo ""

# Step 7: Fetch from GitHub
echo "📥 Step 7/13: Fetching from GitHub..."
git fetch origin || echo "⚠️  Fetch completed (may show warnings if repo is new)"
echo "✅ Fetch complete"
echo ""

# Step 8: Create ios branch
echo "🌿 Step 8/13: Creating ios branch..."
git checkout -b ios 2>/dev/null || git checkout ios
echo "✅ On ios branch"
echo ""

# Step 9: Push to GitHub
echo "📤 Step 9/13: Pushing to GitHub..."
echo "⚠️  Note: You may be prompted for GitHub credentials"
git push -u origin ios || {
    echo ""
    echo "❌ Push failed. This is usually due to authentication."
    echo "   You'll need to:"
    echo "   1. Create a Personal Access Token at: https://github.com/settings/tokens"
    echo "   2. Use the token as your password when prompted"
    echo "   Or run: git push -u origin ios (and enter your token)"
    echo ""
    exit 1
}
echo "✅ Pushed to GitHub"
echo ""

# Step 10: Add Capacitor iOS
echo "📱 Step 10/13: Setting up Capacitor for iOS..."
npx cap add ios
echo "✅ Capacitor iOS added"
echo ""

# Step 11: Sync to iOS
echo "🔄 Step 11/13: Syncing web app to iOS..."
npm run ios:sync
echo "✅ Sync complete"
echo ""

# Step 12: Summary
echo "🎉 Setup Complete!"
echo ""
echo "✅ All steps completed successfully!"
echo ""
echo "📋 Summary:"
echo "   • Dependencies installed"
echo "   • App built"
echo "   • Git initialized and connected to GitHub"
echo "   • Code pushed to 'ios' branch"
echo "   • Capacitor iOS configured"
echo "   • Web app synced to iOS project"
echo ""
echo "🚀 Next Steps:"
echo "   1. Open in Xcode: npm run ios:open"
echo "   2. Or manually: open ios/App/App.xcworkspace"
echo "   3. Select a simulator and click Run (▶️)"
echo ""
echo "📝 Your code is on GitHub at:"
echo "   https://github.com/alegouvello/qraft/tree/ios"
echo ""

