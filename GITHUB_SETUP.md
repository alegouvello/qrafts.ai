# GitHub Setup Guide for Qrafts

Follow these steps to connect your Qrafts project to GitHub and complete the setup.

## Step 1: Run the Setup Script

Make the setup script executable and run it:

```bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"
chmod +x setup.sh
./setup.sh
```

This will:
- Install all npm dependencies
- Build the app
- Initialize Git
- Set up Capacitor for iOS
- Sync to iOS

## Step 2: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Repository name: `qrafts` (or your preferred name)
4. Description: "Qrafts iOS app"
5. Choose **Private** or **Public**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### Option B: Using GitHub CLI (if installed)

```bash
gh repo create qrafts --private --source=. --remote=origin --push
```

## Step 3: Connect Local Repository to GitHub

After creating the repository on GitHub, run these commands:

```bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"

# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/qrafts.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Verify Setup

1. Check that the remote is set:
   ```bash
   git remote -v
   ```

2. Visit your repository on GitHub to confirm all files are there

## Step 5: Open in Xcode

Once everything is set up:

```bash
npm run ios:open
```

This will open the project in Xcode where you can:
- Run on iOS Simulator
- Run on a physical device
- Configure app settings, icons, etc.

## Troubleshooting

### If you get authentication errors:
- Use a Personal Access Token instead of password
- Or set up SSH keys: `ssh-keygen -t ed25519 -C "your_email@example.com"`

### If Capacitor sync fails:
- Make sure you've run `npm run build` first
- Check that `dist/` folder exists

### If Xcode won't open:
- Make sure Xcode is installed
- Try: `open ios/App/App.xcworkspace` manually

