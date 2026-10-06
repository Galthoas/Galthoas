// Copyright (c) 2026 Ernie Braswell
const editor = document.getElementById('editor');
const status = document.getElementById('status');
const welcomeDialog = document.getElementById('welcomeDialog');
const startWritingButton = document.getElementById('startWritingButton');
const dontShowWelcome = document.getElementById('dontShowWelcome');
const welcomePreferenceKey = 'manuscript-editor-hide-welcome';
const desktopFiles = window.manuscriptFiles;
let currentFileName = 'manuscript.txt';
let isDirty = false;
let editVersion = 0;
let closeRequestPending = false;

function showWelcome() {
  if (!welcomeDialog.open) {
    welcomeDialog.showModal();
  }
}

function closeWelcome() {
  if (dontShowWelcome.checked) {
    localStorage.setItem(welcomePreferenceKey, 'true');
  }
  welcomeDialog.close();
}

async function loadManuscript() {
  try {
    const response = await fetch('/api/manuscript');
    if (!response.ok) {
      throw new Error(`Draft request failed with status ${response.status}`);
    }
    const data = await response.json();
    editor.value = data.text || '';
    isDirty = false;
    status.textContent = 'Draft loaded';
  } catch (error) {
    status.textContent = 'Unable to load draft';
    console.error(error);
  }
}

function confirmDiscardChanges() {
  return !isDirty || window.confirm('You have unsaved changes. Discard them?');
}

async function saveManuscript(saveAs = false) {
  const savingVersion = editVersion;
  const text = editor.value;

  try {
    if (desktopFiles) {
      status.textContent = 'Saving…';
      const result = await desktopFiles.save(text, {
        saveAs,
        suggestedName: currentFileName
      });

      if (result.canceled) {
        status.textContent = isDirty ? 'Save canceled; changes are not saved' : 'Save canceled';
        return false;
      }

      currentFileName = result.fileName;
      isDirty = editVersion !== savingVersion;
      status.textContent = isDirty
        ? `Saved ${result.fileName}; newer edits remain unsaved`
        : `Saved ${result.fileName}`;
      return !isDirty;
    }

    if (saveAs) {
      downloadManuscript();
      return !isDirty;
    }

    status.textContent = 'Saving…';
    const response = await fetch('/api/manuscript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Save failed');
    }

    isDirty = editVersion !== savingVersion;
    status.textContent = isDirty
      ? `Saved ${data.saved} characters; newer edits remain unsaved`
      : `Saved ${data.saved} characters`;
    return !isDirty;
  } catch (error) {
    status.textContent = `Save failed: ${error.message}`;
    console.error(error);
    return false;
  }
}

async function openManuscript() {
  if (!confirmDiscardChanges()) {
    return;
  }

  try {
    if (desktopFiles) {
      const result = await desktopFiles.open();
      if (result.canceled) {
        return;
      }

      editor.value = result.text;
      currentFileName = result.fileName;
      isDirty = false;
      status.textContent = `Opened ${result.fileName}`;
      return;
    }

    throw new Error('Open File is available from the desktop app menu.');
  } catch (error) {
    status.textContent = `Open failed: ${error.message}`;
    console.error(error);
  }
}

function downloadManuscript() {
  const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = currentFileName.replace(/\.[^.]+$/, '') + '.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  status.textContent = `Download started: ${link.download}`;
}

function resolveClose(shouldClose) {
  closeRequestPending = false;
  return desktopFiles.resolveClose(shouldClose);
}

async function handleCloseRequest() {
  if (closeRequestPending) {
    return;
  }
  closeRequestPending = true;

  if (!isDirty) {
    await resolveClose(true);
    return;
  }

  const choice = await showCloseDialog();
  if (choice === 'save') {
    if (await saveManuscript()) {
      await resolveClose(true);
      return;
    }
  } else if (choice === 'discard') {
    await resolveClose(true);
    return;
  }

  await resolveClose(false);
}

function showCloseDialog() {
  return new Promise((resolve) => {
    const closeDialog = document.getElementById('closeDialog');
    const finish = (choice) => {
      closeDialog.close();
      resolve(choice);
    };

    document.getElementById('saveBeforeCloseButton').onclick = () => finish('save');
    document.getElementById('discardBeforeCloseButton').onclick = () => finish('discard');
    document.getElementById('cancelCloseButton').onclick = () => finish('cancel');
    closeDialog.addEventListener('cancel', () => resolve('cancel'), { once: true });
    closeDialog.showModal();
  });
}

if (desktopFiles) {
  desktopFiles.onMenuCommand((command) => {
    if (command === 'open') {
      openManuscript();
    } else if (command === 'save') {
      saveManuscript();
    } else if (command === 'saveAs') {
      saveManuscript(true);
    } else if (command === 'download') {
      downloadManuscript();
    } else if (command === 'welcome') {
      showWelcome();
    } else if (command === 'close-request') {
      handleCloseRequest().catch((error) => {
        closeRequestPending = false;
        status.textContent = `Unable to close window: ${error.message}`;
        console.error(error);
      });
    }
  });
}
editor.addEventListener('input', () => {
  editVersion += 1;
  isDirty = true;
  status.textContent = 'Unsaved changes';
});
startWritingButton.addEventListener('click', closeWelcome);
welcomeDialog.addEventListener('cancel', () => {
  if (dontShowWelcome.checked) {
    localStorage.setItem(welcomePreferenceKey, 'true');
  }
});

if (localStorage.getItem(welcomePreferenceKey) !== 'true') {
  showWelcome();
}

loadManuscript();
