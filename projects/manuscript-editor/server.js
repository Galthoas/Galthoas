const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const manuscriptPath = path.join(__dirname, 'data', 'manuscript.txt');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const defaultText = `# Draft Manuscript\n\nStart writing here...`;

function readManuscript() {
  try {
    const data = fs.readFileSync(manuscriptPath, 'utf8');
    return data || defaultText;
  } catch (error) {
    return defaultText;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Manuscript editor is running.' });
});

app.get('/api/manuscript', (_req, res) => {
  res.json({ text: readManuscript() });
});

app.post('/api/manuscript', (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Request body must include a text string.' });
  }

  try {
    fs.mkdirSync(path.dirname(manuscriptPath), { recursive: true });
    fs.writeFileSync(manuscriptPath, text, 'utf8');
    return res.json({ success: true, saved: text.length });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to save manuscript.', details: error.message });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`Manuscript editor running at http://localhost:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, readManuscript };
