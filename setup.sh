#!/bin/bash

# Qrafts Setup Script
# This script will:
# 1. Install dependencies
# 2. Build the app
# 3. Initialize Git
# 4. Set up Capacitor for iOS
# 5. Help connect to GitHub

set -e

echo "🚀 Setting up Qrafts project..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Build the app
echo "🔨 Building the app..."
npm run build

# Step 3: Initialize Git
echo "📝 Initializing Git repository..."
git init
git add .
git commit -m "Initial commit: Qrafts iOS app setup"

# Step 4: Set up Capacitor for iOS
echo "📱 Setting up Capacitor for iOS..."
npx cap add ios

# Step 5: Sync to iOS
echo "🔄 Syncing to iOS..."
npm run ios:sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository named 'qrafts' (or your preferred name)"
echo "2. Run these commands to connect:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/qrafts.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. To open in Xcode:"
echo "   npm run ios:open"

