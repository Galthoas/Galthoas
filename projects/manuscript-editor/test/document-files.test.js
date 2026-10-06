// Copyright (c) 2026 Ernie Braswell
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { readTextDocument, writeTextDocument } = require('../document-files');

test('writes and reads a UTF-8 manuscript at the selected path', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'manuscript-editor-'));
  const filePath = path.join(directory, 'draft.txt');
  const originalText = 'Chapter 1\nA text with Unicode: café.';

  try {
    await writeTextDocument(filePath, originalText);
    assert.equal(await readTextDocument(filePath), originalText);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('rejects non-text content instead of writing invalid data', async () => {
  await assert.rejects(writeTextDocument('unused.txt', null), {
    name: 'TypeError',
    message: 'Manuscript content must be text.'
  });
});
