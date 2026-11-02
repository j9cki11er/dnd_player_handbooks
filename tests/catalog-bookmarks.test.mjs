import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
const read = name => JSON.parse(fs.readFileSync(new URL(`../src/${name}.json`, import.meta.url)));
const gear = read('data-gear'), data = read('data');
const context = { categoryTree: {}, spellData: [], featData: [], masteryData: [], data };
test('all equipment bookmarks resolve after persistence or import', () => {
    for (const item of gear) {
        const resolved = resolveBookmarkItem(item.id, context);
        assert.equal(resolved.title, item.title);
        assert.ok(resolved.descriptionHtml);
    }
});
test('all magic item bookmarks retain category, rarity and content path', () => {
    const items = data.filter(item => item.itemType && item.rarity);
    assert.equal(items.length, 350);
    for (const item of items) {
        const resolved = resolveBookmarkItem(item.id, context);
        assert.equal(resolved.rarity, item.rarity);
        assert.equal(resolved.itemType, item.itemType);
        assert.ok(resolved.path);
    }
});
test('weapon bookmarks retain complete weapon statistics and valid currency amounts', async () => {
    const { catalogWeapons } = await import('../src/utils/weapons.js');
    assert.equal(catalogWeapons.length, 38);
    for (const item of catalogWeapons) {
        const resolved = resolveBookmarkItem(item.id, context);
        assert.equal(resolved.damage, item.damage);
        assert.ok(resolved.descriptionHtml.includes(item.mastery));
        assert.ok(Number.isFinite(item.pricesGP[0]));
    }
});
