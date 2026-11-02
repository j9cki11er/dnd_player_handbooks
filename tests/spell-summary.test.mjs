import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spellText, summarizeComponents, summarizeDuration } from '../src/utils/spellSummary.js';
const spells = JSON.parse(fs.readFileSync(new URL('../src/data-spells.json', import.meta.url)));
test('reaction previews remove HTML without losing the trigger', () => {
    const shield = spells.find(spell => spell.id === 'Shield');
    const text = spellText(shield.castingTime);
    assert.ok(text.includes('反应'));
    assert.ok(text.includes('Magic Missile'));
    assert.ok(!/[<>]/.test(text));
});
test('long material requirements remain available in full while the preview stays compact', () => {
    const clone = spells.find(spell => spell.id === 'Clone');
    const result = summarizeComponents(clone.components);
    assert.equal(result.summary, 'V、S、M（1000+ GP、2000+ GP）');
    assert.equal(result.hasDetails, true);
    assert.ok(result.text.includes('1000GP+'));
    assert.ok(result.text.includes('2000GP+'));
});
test('simple and missing components retain usable labels', () => {
    assert.deepEqual(summarizeComponents('V、S'), { summary: 'V、S', text: 'V、S', hasDetails: false });
    assert.equal(summarizeComponents().summary, 'V、S');
    for (const spell of spells) {
        const result = summarizeComponents(spell.components);
        assert.ok(result.summary.length > 0);
        assert.ok(!/<[^>]+>/.test(result.text));
    }
});

test('component previews show GP amounts without material descriptions', () => {
    assert.equal(summarizeComponents('V、S、M（一枚价值5+GP的圣徽）').summary, 'V、S、M（5+ GP）');
    assert.equal(summarizeComponents('V, S, M（一根羽毛，价值至少200GP）').summary, 'V、S、M（200 GP）');
    assert.equal(summarizeComponents('S、M（少量羊毛）').summary, 'S、M');
});

test('duration previews compact concentration and time units without changing source text', () => {
    assert.equal(summarizeDuration('专注，至多 10 分钟'), 'C 10Min');
    assert.equal(summarizeDuration('专注，至多一小时'), 'C 1Hr');
    assert.equal(summarizeDuration('专注，最多10分钟'), 'C 10Min');
    assert.equal(summarizeDuration('至多8小时'), '8Hr');
    assert.equal(summarizeDuration('立即或 1 个小时（见下文）'), '立即或 1Hr（见下文）');
    assert.equal(summarizeDuration('1 分钟'), '1Min');
    assert.equal(summarizeDuration('专注，至多6轮'), 'C 6轮');
    assert.equal(summarizeDuration('直到被解除或触发'), '直到被解除或触发');
    for (const spell of spells) {
        const preview = summarizeDuration(spell.duration);
        assert.ok(!/专注|至多|最多|分钟|小时/.test(preview));
        if (spell.duration?.includes('专注')) assert.ok(preview.startsWith('C '));
    }
});
