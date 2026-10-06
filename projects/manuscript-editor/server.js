// Copyright (c) 2026 Ernie Braswell
const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const manuscriptPath = path.join(__dirname, 'data', 'manuscript.txt');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const defaultText = `# Draft Manuscript\n\nStart writing here...`;

async function readManuscript() {
  try {
    const data = await fs.readFile(manuscriptPath, 'utf8');
    return data || defaultText;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return defaultText;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Manuscript editor is running.' });
});

app.get('/api/manuscript', async (_req, res) => {
  try {
    res.json({ text: await readManuscript() });
  } catch (error) {
    console.error('Unable to read manuscript:', error);
    res.status(500).json({ error: 'Unable to read manuscript.' });
  }
});

app.post('/api/manuscript', async (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Request body must include a text string.' });
  }

  try {
    await fs.mkdir(path.dirname(manuscriptPath), { recursive: true });
    await fs.writeFile(manuscriptPath, text, 'utf8');
    return res.json({ success: true, saved: text.length });
  } catch (error) {
    console.error('Unable to save manuscript:', error);
    return res.status(500).json({ error: 'Unable to save manuscript.' });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port = PORT, host = '127.0.0.1') {
  const server = app.listen(port, host, () => {
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Manuscript editor running at http://${host}:${boundPort}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, readManuscript };
