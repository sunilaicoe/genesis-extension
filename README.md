# Genesis - AI SDLC Architect

A VS Code extension that brings AI-powered software development lifecycle orchestration directly into your editor.

## Features

- **Home Dashboard** — Workspace overview with live stats, recent projects, activity timeline, system resources, and terminal output
- **My Workflows** — View, manage, and monitor all your AI-powered SDLC pipelines with phase tracking and progress bars
- **Settings** — Configure AI provider, storage, export formats, notifications, keybindings, and telemetry
- **Sidebar Navigation** — Quick access to all views with live workflow status indicators

## Tech Stack

- TypeScript
- VS Code Extension API
- Webview Panels (HTML/CSS/JS)
- Material Symbols Outlined icons
- Space Grotesk + Inter + Fira Code fonts

## Getting Started

```bash
npm install
npm run compile
```

### Run in Extension Development Host

```
code --extensionDevelopmentPath=/path/to/genesis-extension --new-window
```

Or press **F5** in VS Code with this project open.

## Design System

- **Base**: `#131313`
- **Sidebar**: `#1B1B1C`
- **Content**: `#202020`
- **Primary**: `#A3C9FF` → `#0078D4` (gradient)
- **Tertiary**: `#61dac1`
- **Typography**: Space Grotesk (headings), Inter (body), Fira Code (mono)
- **Icons**: Material Symbols Outlined

## License

MIT
