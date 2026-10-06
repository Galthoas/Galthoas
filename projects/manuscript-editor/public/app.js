const editor = document.getElementById('editor');
const saveButton = document.getElementById('saveButton');
const status = document.getElementById('status');
const welcomeDialog = document.getElementById('welcomeDialog');
const welcomeButton = document.getElementById('welcomeButton');
const startWritingButton = document.getElementById('startWritingButton');
const dontShowWelcome = document.getElementById('dontShowWelcome');
const welcomePreferenceKey = 'manuscript-editor-hide-welcome';

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
    const data = await response.json();
    editor.value = data.text || '';
    status.textContent = 'Draft loaded';
  } catch (error) {
    status.textContent = 'Unable to load draft';
    console.error(error);
  }
}

async function saveManuscript() {
  const text = editor.value;
  status.textContent = 'Saving…';

  try {
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

    status.textContent = `Saved ${data.saved} characters`;
  } catch (error) {
    status.textContent = 'Save failed';
    console.error(error);
  }
}

saveButton.addEventListener('click', saveManuscript);
welcomeButton.addEventListener('click', showWelcome);
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
