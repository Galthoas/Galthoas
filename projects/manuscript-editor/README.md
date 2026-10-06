# Manuscript Editor

A desktop manuscript editor built with Electron and Express.

## Requirements

- Node.js 20 or later
- npm

## Run from source

```sh
npm install
npm run desktop
```

The desktop app supports Windows, macOS, and Linux. To run the web interface instead, use `npm start` and open `http://localhost:3000`.

Manuscripts are saved to `data/manuscript.txt` on the local computer. The welcome guide appears on first launch; use its checkbox to keep it hidden on later launches. The guide can be opened again with the Welcome guide button.
