// Copyright (c) 2026 Ernie Braswell
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const { startServer } = require('./server');
const { readTextDocument, writeTextDocument } = require('./document-files');

const PORT = Number(process.env.PORT) || 3000;
let mainWindow;
let activeFilePath = null;

function createWindow() {
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

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
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
  ipcMain.handle('document:open', async () => {
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

  ipcMain.handle('document:save', async (_event, { text, saveAs, suggestedName }) => {
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

app.whenReady().then(() => {
  registerFileHandlers();
  createApplicationMenu();
  startServer(PORT);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
