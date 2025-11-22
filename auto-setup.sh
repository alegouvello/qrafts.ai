#!/bin/bash
cd "/Users/alegouvello/Library/CloudStorage/OneDrive-Personal/qrafts"
npm install && npm run build && git init && git add . && git commit -m "Initial commit: Qrafts iOS app setup" && git remote add origin https://github.com/alegouvello/qraft.git 2>/dev/null || git remote set-url origin https://github.com/alegouvello/qraft.git && git fetch origin && git checkout -b ios 2>/dev/null || git checkout ios && echo "Ready to push. Run: git push -u origin ios" && npx cap add ios && npm run ios:sync && echo "✅ Setup complete! Run: npm run ios:open"

