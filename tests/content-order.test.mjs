import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareContentItems, compareContentNames, readNumber } from '../src/utils/contentOrder.js';
const data = JSON.parse(fs.readFileSync(new URL('../src/data.json', import.meta.url)));
test('character creation steps follow their numeric sequence in actual content', () => {
    const path = ['第二章：创建角色', '创建你的角色'];
    const items = data.filter(item => item.pathParts.join('/') === path.join('/')).sort((a, b) => compareContentItems(a, b, path));
    assert.deepEqual(items.map(item => item.title.slice(0, 3)), ['第一步', '第二步', '第三步', '第四步', '第五步']);
});
test('spell chapters run from cantrips through ninth level', () => {
    const path = ['第七章：法术', '法术详述'];
    const items = data.filter(item => item.pathParts.join('/') === path.join('/')).sort((a, b) => compareContentItems(a, b, path));
    assert.deepEqual(items.map(item => item.title), ['戏法（零环）', '一环', '二环', '三环', '四环', '五环', '六环', '七环', '八环', '九环']);
});
test('numeric titles and fractional challenge ratings use numeric order', () => {
    assert.deepEqual(['第十步', '第二步', '第十一步', '第一步'].sort(compareContentNames), ['第一步', '第二步', '第十步', '第十一步']);
    assert.deepEqual(['CR 10', 'CR1/2', 'CR1', 'CR0-CR1/4', 'CR 2'].sort((a, b) => compareContentNames(a, b)), ['CR0-CR1/4', 'CR1/2', 'CR1', 'CR 2', 'CR 10']);
    assert.equal(readNumber('二十'), 20);
});
test('chapter introduction and basic feat choices precede advanced options', () => {
    const path = ['第五章：专长'];
    const items = data.filter(item => item.pathParts.join('/') === path.join('/')).sort((a, b) => compareContentItems(a, b, path));
    assert.equal(items[0].isOverview, true);
    assert.deepEqual(items.slice(1).map(item => item.title), ['专长概述', '起源专长', '通用专长', '战斗风格专长', '传奇恩惠专长']);
});
