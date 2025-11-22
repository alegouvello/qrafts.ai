# Connect Qrafts to Existing GitHub Repository

Your GitHub repository `alegouvello/qraft` already exists. Here's how to connect your local Qrafts iOS project to it.

## Option 1: Use the Automated Script (Recommended)

```bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"
chmod +x connect-to-github.sh
./connect-to-github.sh
```

The script will:
- Initialize Git (if needed)
- Connect to your GitHub repo
- Let you choose to push to a new `ios` branch or merge with `main`

## Option 2: Manual Setup

### Step 1: Initialize Git and Commit

```bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"

# Initialize Git
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Qrafts iOS app setup"
```

### Step 2: Connect to GitHub

```bash
# Add remote
git remote add origin https://github.com/alegouvello/qraft.git

# Fetch from remote
git fetch origin
```

### Step 3: Choose Your Approach

**Option A: Push to a new `ios` branch (Recommended)**
```bash
# Create and switch to ios branch
git checkout -b ios

# Push to GitHub
git push -u origin ios
```

**Option B: Merge with main branch**
```bash
# Rename your branch to main
git branch -M main

# Pull and merge (may have conflicts)
git pull origin main --allow-unrelated-histories

# Resolve any conflicts, then push
git push -u origin main
```

## Recommended: Use a Separate Branch

Since your GitHub repo already has web app code, I recommend pushing the iOS app to a separate `ios` branch. This keeps the codebases separate while still being in the same repository.

## After Connecting

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Set up Capacitor for iOS:**
   ```bash
   npx cap add ios
   npm run ios:sync
   ```

4. **Open in Xcode:**
   ```bash
   npm run ios:open
   ```

## Future Workflow

When you make changes:

```bash
# Make your code changes
# Build
npm run build

# Sync to iOS
npm run ios:sync

# Commit and push
git add .
git commit -m "Your commit message"
git push
```

