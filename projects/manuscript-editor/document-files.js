// Copyright (c) 2026 Ernie Braswell
const fs = require('fs/promises');

async function readTextDocument(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeTextDocument(filePath, text) {
  if (typeof text !== 'string') {
    throw new TypeError('Manuscript content must be text.');
  }

  await fs.writeFile(filePath, text, 'utf8');
}

module.exports = { readTextDocument, writeTextDocument };
