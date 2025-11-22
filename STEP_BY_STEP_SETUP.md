# Step-by-Step Setup Guide for Qrafts iOS App

Follow these steps in order. Copy and paste each command into your terminal.

## Step 1: Navigate to the Project Directory

Open your terminal and run:

```bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"
```

Verify you're in the right place:
```bash
pwd
```
You should see: `/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts`

---

## Step 2: Install Dependencies

Install all the npm packages needed for the project:

```bash
npm install
```

This will take a minute or two. Wait for it to complete.

**Expected output:** You should see a lot of package installation messages, ending with something like "added XXX packages".

---

## Step 3: Build the Web App

Build the React app so it's ready for iOS:

```bash
npm run build
```

**Expected output:** You should see build messages and a `dist/` folder will be created.

---

## Step 4: Initialize Git Repository

Initialize a Git repository in your project:

```bash
git init
```

**Expected output:** `Initialized empty Git repository in ...`

---

## Step 5: Add All Files to Git

Add all your project files to Git:

```bash
git add .
```

No output is normal - it means it worked!

---

## Step 6: Make Your First Commit

Create your first commit:

```bash
git commit -m "Initial commit: Qrafts iOS app setup"
```

**Expected output:** You should see a message about files being committed.

---

## Step 7: Connect to Your GitHub Repository

Add your GitHub repository as the remote:

```bash
git remote add origin https://github.com/alegouvello/qraft.git
```

No output means it worked!

---

## Step 8: Check the Remote Connection

Verify the connection:

```bash
git remote -v
```

**Expected output:** You should see:
```
origin  https://github.com/alegouvello/qraft.git (fetch)
origin  https://github.com/alegouvello/qraft.git (push)
```

---

## Step 9: Fetch from GitHub

Get information about the existing repository:

```bash
git fetch origin
```

**Expected output:** You'll see information about branches on GitHub.

---

## Step 10: Create and Push to iOS Branch

Since your GitHub repo already has code, we'll create a separate branch for the iOS app:

```bash
git checkout -b ios
```

Then push to GitHub:

```bash
git push -u origin ios
```

**Note:** If this is your first time, GitHub may ask for authentication. You may need to:
- Use a Personal Access Token instead of a password
- Or set up SSH keys

**Expected output:** You should see messages about pushing to the `ios` branch.

---

## Step 11: Set Up Capacitor for iOS

Now let's set up the iOS native project:

```bash
npx cap add ios
```

**Expected output:** You'll see Capacitor installing iOS dependencies.

---

## Step 12: Sync Web App to iOS

Copy your built web app into the iOS project:

```bash
npm run ios:sync
```

This command will:
1. Build the app again
2. Copy it to the iOS project
3. Sync with Capacitor

**Expected output:** Build messages and sync confirmation.

---

## Step 13: Open in Xcode

Open the project in Xcode:

```bash
npm run ios:open
```

**Expected output:** Xcode should open automatically with your project.

---

## ✅ You're Done!

Your Qrafts iOS app is now:
- ✅ Set up with all dependencies
- ✅ Built and ready
- ✅ Connected to GitHub on the `ios` branch
- ✅ Ready to run in Xcode

## Next Steps in Xcode

1. Select a simulator (iPhone 15, etc.) from the device dropdown
2. Click the Play button (▶️) to run the app
3. Or connect a physical iPhone and run it on your device

## Troubleshooting

### If `npm install` fails:
- Make sure you have Node.js installed: `node --version`
- If not, install it from [nodejs.org](https://nodejs.org)

### If `git push` asks for authentication:
- GitHub no longer accepts passwords. You need a Personal Access Token
- Go to: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Use the token as your password when pushing

### If Xcode doesn't open:
- Make sure Xcode is installed from the App Store
- Try opening manually: `open ios/App/App.xcworkspace`

### If you see errors during build:
- Make sure you completed Step 2 (npm install) successfully
- Try deleting `node_modules` and running `npm install` again

---

## Future Development Workflow

When you make changes to your code:

1. **Make your code changes**
2. **Build:** `npm run build`
3. **Sync to iOS:** `npm run ios:sync`
4. **Commit changes:** 
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
5. **Open in Xcode:** `npm run ios:open`

---

Need help with any step? Let me know which step you're on and what error (if any) you're seeing!

