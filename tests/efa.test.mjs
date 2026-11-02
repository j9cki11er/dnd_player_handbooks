import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isExpansionBook } from '../src/utils/expansions.js';
import { resolveBookmarkItem } from '../src/utils/helpers.js';
const book = '艾伯伦：奇械锻炉 (EFA)';
const data = JSON.parse(fs.readFileSync(new URL('../src/data.json', import.meta.url)));
const spellData = JSON.parse(fs.readFileSync(new URL('../src/data-spells.json', import.meta.url)));
const pages = data.filter(item => item.category === book);
test('EFA is a distinct expansion with only player-facing source chapters', () => {
    assert.equal(isExpansionBook(book), true);
    assert.equal(isExpansionBook('第二章：创建角色'), false);
    assert.equal(pages.length, 40);
    for (const item of pages) {
        assert.ok(!/\/(第三章|第四章|第五章|第六章|第七章|数据卡)\//.test(item.originalSource));
        assert.equal(item.pathParts[0], book);
    }
});
test('every imported page is valid UTF-8 and resolves to existing readable content', () => {
    for (const item of pages) {
        const source = fs.readFileSync(new URL(`../data-source/${item.id}`, import.meta.url));
        const decoded = new TextDecoder('utf8', { fatal: true }).decode(source);
        assert.ok(decoded.includes('charset="utf-8"'));
        assert.ok(!decoded.includes('\ufffd'));
        const content = fs.readFileSync(new URL(`../public/content/${item.path}`, import.meta.url), 'utf8');
        assert.ok(content.trim());
        assert.ok(!/<(?:script|style)\b/i.test(content));
        assert.equal(resolveBookmarkItem(item.id, { categoryTree: {}, spellData, featData: [], masteryData: [], data }).path, item.path);
    }
});
test('all player species and backgrounds are included without empty placeholders', () => {
    assert.equal(pages.filter(item => item.pathParts.at(-1) === '种族' && !item.isOverview).length, 5);
    assert.equal(pages.filter(item => item.pathParts.at(-1) === '背景' && !item.isOverview).length, 17);
});
test('artificer filtering includes its full 80-spell list and the EFA companion spell', () => {
    const spells = spellData.filter(item => item.classes.includes('奇械师'));
    assert.ok(spells.length >= 80);
    const servant = spells.find(item => item.id === 'EFA_Homunculus_Servant');
    assert.equal(servant.levelNumeric, 2);
    assert.ok(fs.existsSync(new URL(`../public/content/${servant.path}`, import.meta.url)));
    assert.ok(spells.some(item => item.id === 'Cure_Wounds'));
    assert.equal(new Set(spellData.map(item => item.id)).size, spellData.length);
});

test('EFA credits and the spell-only companion are absent from player directories', () => {
    assert.ok(!pages.some(item => item.title === '来源与鸣谢'));
    assert.equal(pages.find(item => item.title === '人工生命仆从').hiddenFromDirectory, true);
});
test('all 28 EFA feats have individual content and retain EFA bookmark categories', () => {
    const featData = JSON.parse(fs.readFileSync(new URL('../src/data-feats.json', import.meta.url)));
    const feats = featData.filter(item => item.sourceBook === 'EFA');
    assert.equal(feats.length, 28);
    for (const feat of feats) {
        const resolved = resolveBookmarkItem(feat.id, { categoryTree: {}, spellData, featData, masteryData: [], data });
        assert.equal(resolved.pathParts[0], book);
        const html = fs.readFileSync(new URL(`../public/content/${feat.path}`, import.meta.url), 'utf8');
        assert.ok(html.includes(feat.title));
        assert.ok(html.includes('先决'));
    }
});
