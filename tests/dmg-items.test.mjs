import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
import { compareContentNames } from '../src/utils/contentOrder.js';
import { isExpansionBook } from '../src/utils/expansions.js';
const book = '城主指南：魔法物品 (DMG 2024)';
const data = JSON.parse(fs.readFileSync(new URL('../src/data.json', import.meta.url)));
const pages = data.filter(item => item.sourceBook === 'DMG2024');
const items = pages.filter(item => item.itemType);
test('DMG 2024 adds 350 independent items across nine categories and eight rule pages', () => {
    assert.equal(isExpansionBook(book), true);
    assert.equal(items.length, 350);
    assert.equal(new Set(items.map(item => item.itemType)).size, 9);
    assert.equal(pages.filter(item => item.pathParts[1] === '使用与制造').length, 8);
    assert.ok(!pages.some(item => /随机魔法物品|奖励魔法物品/.test(item.originalSource)));
});
test('item content uses UTF-8, preserves metadata and supports bookmarks', () => {
    for (const item of pages) {
        const source = new TextDecoder('utf8', { fatal: true }).decode(fs.readFileSync(new URL(`../data-source/${item.id}`, import.meta.url)));
        assert.ok(!source.includes('\ufffd'));
        assert.ok(source.includes('charset="utf-8"'));
        const html = fs.readFileSync(new URL(`../public/content/${item.path}`, import.meta.url), 'utf8');
        assert.ok(html.trim().length > 50);
        assert.equal(resolveBookmarkItem(item.id, { data, categoryTree: {}, spellData: [], featData: [], masteryData: [] }).path, item.path);
        if (item.itemType) assert.ok(item.rarity && item.itemMeta && item.titleEn);
    }
    assert.equal(new Set(data.map(item => item.id)).size, data.length);
});
test('artificer reference items and crafting costs are present', () => {
    for (const title of ['次元袋', '炼金壶', '秘银甲']) assert.ok(items.some(item => item.title === title));
    const crafting = pages.find(item => item.title === '制造魔法物品');
    const html = fs.readFileSync(new URL(`../public/content/${crafting.path}`, import.meta.url), 'utf8');
    assert.ok(html.includes('时间与成本') && html.includes('工具') && html.includes('奥秘'));
    const collision = items.filter(item => item.id.includes('Clockwork_Amulet'));
    assert.equal(collision.length, 2);
    assert.equal(new Set(collision.map(item => item.path)).size, 2);
    assert.equal(new Set(collision.map(item => item.title)).size, 2);
});
test('rarity directories order common items before higher rarities', () => {
    assert.deepEqual(['神器', '珍稀', '普通', '传说', '非普通', '极珍稀'].sort((a,b) => compareContentNames(a,b,[book,'物品图鉴','戒指'])), ['普通', '非普通', '珍稀', '极珍稀', '传说', '神器']);
});
