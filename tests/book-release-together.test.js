'use strict';
// Books Three and Four are released together, with every part (Curtis, 25
// November 2026). A save that begins an AI story after the last book that is
// out never goes into a book released later (src/book.js, finished), so
// releasing Book Three first would cost those saves Book Four. Read without
// the preview, as players have the shelf.
delete process.env.BRIARWATCH_PREVIEW_BOOKS; delete process.env.BRIARWATCH_PREVIEW_PARTS;
const test = require('node:test'), assert = require('node:assert/strict');
const Book = require('../src/book');

test('Book Three and Book Four come out together, with every part of each', () => {
  const three = Book.SHELF.find((b) => b.n === 3), four = Book.SHELF.find((b) => b.n === 4);
  const out = (b) => Number(b.open) || 0;
  if (out(three) === 0 && out(four) === 0) return; // both still hidden
  assert.equal(out(three), three.parts, 'Book Three is released whole');
  assert.equal(out(four), four.parts, 'Book Four is released whole, with Book Three');
});
