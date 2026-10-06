// Copyright (c) 2026 Ernie Braswell
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('manuscriptFiles', {
  open: () => ipcRenderer.invoke('document:open'),
  save: (text, options = {}) => ipcRenderer.invoke('document:save', {
    text,
    saveAs: options.saveAs === true,
    suggestedName: options.suggestedName
  }),
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu:file-command', listener);
    return () => ipcRenderer.removeListener('menu:file-command', listener);
  }
});
