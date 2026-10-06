// Copyright (c) 2026 Ernie Braswell
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const { once } = require('node:events');
const path = require('path');
const { startServer } = require('./server');
const { readTextDocument, writeTextDocument } = require('./document-files');

const PORT = Number(process.env.PORT) || 0;
let mainWindow;
let activeFilePath = null;
let allowWindowClose = false;
let localServerOrigin = null;

function createWindow(port) {
  localServerOrigin = `http://127.0.0.1:${port}`;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    title: 'Manuscript Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      if (new URL(navigationUrl).origin !== localServerOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(localServerOrigin).catch((error) => {
    console.error('Unable to load the manuscript editor window:', error);
  });

  mainWindow.on('close', (event) => {
    if (allowWindowClose) {
      return;
    }

    if (mainWindow.webContents.isLoading()) {
      allowWindowClose = true;
      return;
    }

    event.preventDefault();
    mainWindow.webContents.send('menu:file-command', 'close-request');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    allowWindowClose = false;
  });
}

function createApplicationMenu() {
  const sendFileCommand = (command) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:file-command', command);
    }
  };

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open File…', accelerator: 'CmdOrCtrl+O', click: () => sendFileCommand('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendFileCommand('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendFileCommand('saveAs') },
        { label: 'Download', click: () => sendFileCommand('download') }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Welcome guide', click: () => sendFileCommand('welcome') },
        { type: 'separator' },
        { label: 'About Manuscript Editor', role: 'about' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerFileHandlers() {
  const assertTrustedRenderer = (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      throw new Error('Request came from an unexpected renderer.');
    }

    let senderOrigin;
    try {
      senderOrigin = new URL(event.senderFrame.url).origin;
    } catch {
      throw new Error('Request came from an untrusted origin.');
    }

    if (senderOrigin !== localServerOrigin) {
      throw new Error('Request came from an untrusted origin.');
    }
  };

  ipcMain.handle('document:open', async (event) => {
    assertTrustedRenderer(event);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open manuscript',
      properties: ['openFile'],
      filters: [{ name: 'Manuscripts', extensions: ['txt', 'md', 'markdown'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const text = await readTextDocument(filePath);
    activeFilePath = filePath;
    return { canceled: false, filePath, fileName: path.basename(filePath), text };
  });

  ipcMain.handle('window:resolve-close', (event, shouldClose) => {
    assertTrustedRenderer(event);

    if (shouldClose === true) {
      allowWindowClose = true;
      mainWindow.close();
    }
  });

  ipcMain.handle('document:save', async (event, { text, saveAs, suggestedName }) => {
    assertTrustedRenderer(event);
    if (typeof text !== 'string') {
      throw new TypeError('Manuscript content must be text.');
    }

    let filePath = saveAs ? null : activeFilePath;
    if (!filePath) {
      const safeName = typeof suggestedName === 'string'
        ? path.basename(suggestedName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        : 'manuscript.txt';
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save manuscript',
        defaultPath: safeName || 'manuscript.txt',
        buttonLabel: 'Save',
        filters: [{ name: 'Text manuscript', extensions: ['txt'] }, { name: 'Markdown', extensions: ['md'] }]
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      filePath = result.filePath;
    }

    await writeTextDocument(filePath, text);
    activeFilePath = filePath;
    return { canceled: false, filePath, fileName: path.basename(filePath), saved: text.length };
  });
}

app.whenReady().then(async () => {
  registerFileHandlers();
  createApplicationMenu();
  const server = startServer(PORT);
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine the local manuscript server port.');
  }
  createWindow(address.port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const address = server.address();
      if (address && typeof address !== 'string') {
        createWindow(address.port);
      }
    }
  });
}).catch((error) => {
  console.error('Unable to start Manuscript Editor:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  allowWindowClose = false;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
