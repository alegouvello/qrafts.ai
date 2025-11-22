# Qrafts

A modern React application built with Vite, TypeScript, and Tailwind CSS for iOS.

## Quick Setup

For complete setup including GitHub connection, see [GITHUB_SETUP.md](./GITHUB_SETUP.md)

## Getting Started

### Install Dependencies

```bash
npm install
# or
bun install
```

### Development

```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:8080`

### Build

```bash
npm run build
# or
bun run build
```

### Preview Production Build

```bash
npm run preview
# or
bun run preview
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Routing
- **Capacitor** - Native iOS app framework

## Project Structure

```
qrafts/
├── src/
│   ├── components/    # React components
│   ├── pages/        # Page components
│   ├── lib/          # Utility functions
│   ├── hooks/        # Custom React hooks
│   ├── App.tsx       # Main app component
│   ├── main.tsx      # Entry point
│   └── index.css    # Global styles
├── public/           # Static assets
└── package.json      # Dependencies
```

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## iOS Development

This app is configured for iOS using Capacitor.

### Initial Setup (First Time Only)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the web app:
   ```bash
   npm run build
   ```

3. Initialize Capacitor for iOS:
   ```bash
   npx cap add ios
   ```

4. Sync the web build to iOS:
   ```bash
   npm run ios:sync
   ```

### Development Workflow

1. Make changes to your React code
2. Build the app:
   ```bash
   npm run build
   ```
3. Sync to iOS:
   ```bash
   npm run ios:sync
   ```
   Or use the combined command:
   ```bash
   npm run ios:sync
   ```

4. Open in Xcode:
   ```bash
   npm run ios:open
   ```

5. Run the app from Xcode on a simulator or device

### iOS Configuration

The iOS app configuration is in `capacitor.config.json`. The app ID is set to `com.qrafts.app` and can be changed if needed.

