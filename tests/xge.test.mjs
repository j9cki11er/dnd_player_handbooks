import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isExpansionBook } from '../src/utils/expansions.js';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
const read = file => JSON.parse(fs.readFileSync(new URL(`../src/${file}`, import.meta.url)));
const data = read('data.json'), featData = read('data-feats.json'), spellData = read('data-spells.json');
const pages = data.filter(item => item.sourceBook === 'XGE');
const feats = featData.filter(item => item.sourceBook === 'XGE');
const spells = spellData.filter(item => item.source === 'XGE');
const options = { categoryTree: {}, data, featData, spellData, masteryData: [] };
test('XGE contains player sections and excludes encounter/trap/DM chapters', () => {
    assert.equal(isExpansionBook('珊娜萨的万事指南 (XGE)'), true);
    assert.equal(pages.length, 165);
    for (const page of pages) {
        assert.ok(!/陷阱|随机遭遇|共享战役|建构遭遇|由DM裁决/.test(page.originalSource));
        const html = new TextDecoder('utf8', { fatal: true }).decode(fs.readFileSync(new URL(`../data-source/${page.id}`, import.meta.url)));
        assert.ok(!html.includes('\ufffd'));
        assert.ok(fs.existsSync(new URL(`../public/content/${page.path}`, import.meta.url)));
    }
});
test('15 racial feats are individually readable and keep their racial prerequisites', () => {
    assert.equal(feats.length, 15);
    for (const feat of feats) {
        assert.equal(feat.category, '种族专长');
        assert.ok(feat.prerequisite);
        assert.equal(resolveBookmarkItem(feat.id, options).pathParts[0], '珊娜萨的万事指南 (XGE)');
        const html = fs.readFileSync(new URL(`../public/content/${feat.path}`, import.meta.url), 'utf8');
        assert.ok(html.includes(feat.title));
    }
});
test('95 XGE spells retain original versions and compact list metadata', () => {
    assert.equal(spells.length, 95);
    for (const spell of spells) {
        assert.ok(spell.classes.length);
        assert.ok(spell.duration.length < 45);
        assert.ok(spell.components && spell.castingTime && spell.range);
        assert.ok(fs.existsSync(new URL(`../public/content/${spell.path}`, import.meta.url)));
        assert.equal(resolveBookmarkItem(spell.id, options).path, spell.path);
    }
    const oldVersion = spells.find(spell => spellData.some(other => other.source !== 'XGE' && other.titleEn === spell.titleEn));
    assert.ok(oldVersion);
    const currentVersion = spellData.find(spell => spell.source !== 'XGE' && spell.titleEn === oldVersion.titleEn);
    assert.notEqual(currentVersion.id, oldVersion.id);
    assert.notEqual(currentVersion.path, oldVersion.path);
    for (const items of [data, featData, spellData]) assert.equal(new Set(items.map(item => item.id)).size, items.length);
});
