# Manuscript Editor

A desktop manuscript editor built with Electron and Express.

Copyright (c) 2026 Ernie Braswell. See [LICENSE](LICENSE) for the license terms.

## Requirements

- Node.js 22.12 or later
- npm

## Run from source

```sh
npm install
npm run desktop
```

The desktop app supports Windows, macOS, and Linux. For a browser-only preview, run `npm start` and open `http://127.0.0.1:3000`. The local server binds to loopback and is not exposed to other network devices; native file actions are available in the desktop app.

In the desktop app, use the native **File** menu in the application menu bar to open a `.txt` or Markdown document, save it, choose a new location with **Save As**, or download a `.txt` copy. **Save** prompts for a location the first time and then saves to that file. The editor page stays uncluttered; document actions are in the desktop application's top menu bar.

The welcome guide appears on first launch; use its checkbox to keep it hidden on later launches. Reopen it from **Help → Welcome guide**. If you close the desktop window with unsaved changes, choose to save, discard, or cancel.
