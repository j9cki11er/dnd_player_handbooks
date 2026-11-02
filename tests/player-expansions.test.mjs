import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isExpansionBook } from '../src/utils/expansions.js';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
const read = name => JSON.parse(fs.readFileSync(new URL(`../src/${name}`, import.meta.url)));
const data = read('data.json'), featData = read('data-feats.json'), spellData = read('data-spells.json');
const config = [ ['FRHF', '被遗忘的国度：费伦英雄', 34, 19], ['RHW', '鸦阁魔域：魔障深藏', 11, 0], ['AU', '启封奥秘', 28, 33] ];
const options = { categoryTree: {}, data, featData, spellData, masteryData: [] };
test('three player expansions expose complete split feat and spell selections', () => {
    for (const [code, title, featCount, spellCount] of config) {
        assert.equal(isExpansionBook(title), true);
        assert.equal(featData.filter(item => item.sourceBook === code).length, featCount);
        assert.equal(spellData.filter(item => item.source === code).length, spellCount);
        const pages = data.filter(item => item.sourceBook === code);
        assert.ok(pages.some(item => item.isOverview && item.pathParts.length === 1));
        assert.ok(!pages.some(item => /来源与鸣谢|Credits/i.test(item.title)));
        for (const page of pages) {
            assert.ok(!/\/(?:数据卡|第二章|第三章|第六章|第七章)\//.test(page.originalSource) || (code === 'AU' && page.originalSource.includes('/第二章/')));
            const bytes = fs.readFileSync(new URL(`../data-source/${page.id}`, import.meta.url));
            const html = new TextDecoder('utf8', { fatal: true }).decode(bytes);
            assert.ok(!html.includes('\ufffd'));
            assert.ok(html.includes('charset="utf-8"'));
        }
    }
});
test('all new spell metadata is compact and never captures spell body text', () => {
    for (const spell of spellData.filter(item => ['FRHF', 'AU'].includes(item.source))) {
        assert.ok(spell.classes.length);
        assert.ok(spell.school);
        assert.ok(Number.isInteger(spell.levelNumeric) && spell.levelNumeric >= 0 && spell.levelNumeric <= 9);
        assert.ok(spell.duration.length < 40);
        assert.ok(!spell.duration.includes('你'));
        assert.ok(spell.components);
        assert.ok(spell.castingTime);
        const html = fs.readFileSync(new URL(`../public/content/${spell.path}`, import.meta.url), 'utf8');
        assert.ok(html.includes(spell.title));
        assert.equal(resolveBookmarkItem(spell.id, options).path, spell.path);
    }
    assert.equal(spellData.find(item => item.id === 'FRHF_Spellfire_Flare').duration, '立即');
    assert.equal(spellData.find(item => item.id === 'AU_Battle_Familiar').levelNumeric, 2);
});
test('individual feats preserve their expansion categories, prerequisites and body tables', () => {
    for (const feat of featData.filter(item => config.some(([code]) => item.sourceBook === code))) {
        const html = fs.readFileSync(new URL(`../public/content/${feat.path}`, import.meta.url), 'utf8');
        assert.ok(html.includes(feat.title));
        assert.ok(html.length > 100);
        assert.equal(resolveBookmarkItem(feat.id, options).pathParts[0], feat.pathParts[0]);
    }
    const adept = featData.find(item => item.id === 'AU_Abjuration_Adept');
    assert.ok(adept.prerequisite.includes('等级4+'));
    assert.match(fs.readFileSync(new URL(`../public/content/${adept.path}`, import.meta.url), 'utf8'), /<table\b/i);
});
test('repeated imports keep all IDs unique and every index path valid', () => {
    for (const items of [data, featData, spellData]) {
        assert.equal(new Set(items.map(item => item.id)).size, items.length);
        for (const item of items) assert.ok(fs.existsSync(new URL(`../public/content/${item.path}`, import.meta.url)), item.path);
    }
});
