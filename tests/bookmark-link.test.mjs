import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookmarkLink, bookmarkCodeFromInput } from '../src/utils/bookmarkLink.js';
import { readBookmarkQrPart } from '../src/utils/bookmarkQr.js';
test('share URLs round trip reserved characters and keep data in the fragment', () => {
    const code = 'a+b/c==';
    const link = createBookmarkLink(code, 'https://example.com/handbook/?bookmarks=old#old');
    assert.equal(new URL(link).search, '');
    assert.equal(bookmarkCodeFromInput(link), code);
    assert.equal(bookmarkCodeFromInput('https://example.com/?bookmarks=a%2Bb%2Fc%3D%3D'), code);
    assert.equal(bookmarkCodeFromInput(code), code);
});
test('QR import accepts share links and rejects unrelated URLs', async () => {
    const url = createBookmarkLink('test-code', 'https://example.com/');
    assert.equal((await readBookmarkQrPart(url)).code, 'test-code');
    await assert.rejects(readBookmarkQrPart('https://example.com/'), /收藏/);
});
