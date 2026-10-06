# Manuscript Editor

A desktop manuscript editor built with Electron and Express.

Copyright (c) 2026 Ernie Braswell. See [LICENSE](LICENSE) for the license terms.

## Requirements

- Node.js 20 or later
- npm

## Run from source

```sh
npm install
npm run desktop
```

The desktop app supports Windows, macOS, and Linux. To run the web interface instead, use `npm start` and open `http://localhost:3000`.

In the desktop app, use the native **File** menu in the application menu bar to open a `.txt` or Markdown document, save it, choose a new location with **Save As**, or download a `.txt` copy. **Save** prompts for a location the first time and then saves to that file. The editor page stays uncluttered; document actions are in the desktop application's top menu bar.

The welcome guide appears on first launch; use its checkbox to keep it hidden on later launches. Reopen it with the **Welcome guide** button.
