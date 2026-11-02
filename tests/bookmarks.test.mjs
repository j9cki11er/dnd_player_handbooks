import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
import { loadContent } from '../src/utils/content.js';
const read = name => JSON.parse(fs.readFileSync(new URL(`../src/${name}`, import.meta.url)));
const options = { categoryTree: {}, data: read('data.json'), spellData: read('data-spells.json'), featData: read('data-feats.json'), masteryData: read('data-masteries.json'), invocationData: read('data-invocations.json') };

test('every invocation bookmark resolves and has a readable content file', () => {
    for (const invocation of options.invocationData) {
        const item = resolveBookmarkItem(invocation.id, options);
        assert.equal(item.title, invocation.title);
        assert.ok(item.pathParts.includes('魔契师'));
        assert.ok(fs.existsSync(new URL(`../public/content/${item.path}`, import.meta.url)));
    }
});

test('legacy VGM bookmarks resolve to the same current item', () => {
    for (const item of options.data.filter(item => item.id.includes('(VGM)'))) {
        assert.equal(resolveBookmarkItem(item.id.replace('(VGM)', '(MPMM)'), options), item);
    }
});

test('existing spells, feats and masteries still resolve', () => {
    for (const item of [...options.spellData, ...options.featData, ...options.masteryData]) {
        assert.equal(resolveBookmarkItem(item.id, options).path, item.path);
    }
    assert.equal(resolveBookmarkItem('unknown-bookmark', options), null);
});

test('failed requests and app-shell fallback are rejected instead of shown as content', async t => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
    await assert.rejects(loadContent('missing.html'), /404/);
    globalThis.fetch = async () => ({ ok: true, text: async () => '<html><body><div id="root"></div></body></html>' });
    await assert.rejects(loadContent('missing.html'), /not found/);
});

test('old character creation bookmarks keep their IDs and open in chapter two', () => {
    const steps = options.data.filter(item => item.pathParts[1] === '创建你的角色');
    assert.equal(steps.length, 5);
    for (const step of steps) {
        const resolved = resolveBookmarkItem(step.id, options);
        assert.equal(resolved.id, step.id);
        assert.equal(resolved.path, step.path);
        assert.deepEqual(resolved.pathParts, ['第二章：创建角色']);
    }
    const node = { _id: 'dir:第二章：创建角色', _title: '第二章：创建角色', _path: ['第二章：创建角色'], _children: {} };
    const folder = resolveBookmarkItem('dir:第二章：创建角色/创建你的角色', { ...options, categoryTree: { '第二章：创建角色': node } });
    assert.equal(folder.id, node._id);
});
