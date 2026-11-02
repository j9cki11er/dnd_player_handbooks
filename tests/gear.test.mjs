import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filterGear, gearPriceLabel, sortGear, gearCurrencyFactor } from '../src/utils/gear.js';
const data = JSON.parse(fs.readFileSync(new URL('../src/data-gear.json', import.meta.url)));
test('all 82 table entries retain weight, price and individual descriptions', () => {
    assert.equal(data.length, 82);
    assert.equal(new Set(data.map(item => item.id)).size, 82);
    assert.equal(filterGear(data).length, 82);
    for (const item of data) {
        assert.ok(item.titleEn && item.weight && item.cost);
        assert.ok(item.descriptionHtml.replace(/<[^>]*>/g, '').trim().length > 0);
        assert.ok(item.pricesGP.length);
        assert.ok(item.pricesGP.every(price => Number.isFinite(price) && price >= 0));
    }
});
test('currency conversion filters copper, silver and gold prices consistently', () => {
    assert.ok(filterGear(data, { min: '0', max: '0.01' }).some(item => item.title === '火把'));
    assert.equal(filterGear(data, { query: '强酸', min: '25', max: '25' }).length, 1);
    assert.equal(filterGear(data, { query: '强酸', max: '24.99' }).length, 0);
    assert.equal(filterGear(data, { query: 'spyglass', min: '1000', max: '1000' }).length, 1);
});
test('variable-price gear matches actual option prices rather than gaps in the range', () => {
    assert.equal(filterGear(data, { query: '奥术法器', min: '15', max: '15' }).length, 0);
    assert.equal(filterGear(data, { query: '奥术法器', min: '10', max: '10' }).length, 1);
    assert.equal(gearPriceLabel(data.find(item => item.title === '奥术法器')), '5–20 GP');
    assert.equal(gearPriceLabel(data.find(item => item.title === '强酸')), '25 GP');
});
test('shared scroll descriptions retain separate item prices', () => {
    const cantrip = data.find(item => item.title === '戏法卷轴');
    const first = data.find(item => item.title === '一环卷轴');
    assert.deepEqual(cantrip.pricesGP, [30]);
    assert.deepEqual(first.pricesGP, [50]);
    assert.equal(cantrip.descriptionHtml, first.descriptionHtml);
    assert.deepEqual(filterGear(data, { min: '50', max: '10' }), []);
    assert.deepEqual(filterGear(data, { min: 'invalid' }), []);
});

test('currency display and budget sorting keep the same underlying prices', () => {
    const torch = data.find(item => item.title === '火把');
    assert.equal(gearPriceLabel(torch, 'CP'), '1 CP');
    assert.equal(gearPriceLabel(torch, 'GP'), '0.01 GP');
    assert.equal(10 * gearCurrencyFactor('CP'), 0.1);
    const filtered = filterGear(data, { min: '5', max: '10' });
    const sorted = sortGear(filtered, 'price-asc', { min: '5', max: '10' });
    const price = item => Math.min(...item.pricesGP.filter(p => p >= 5 && p <= 10));
    assert.ok(sorted.every((item, i) => i === 0 || price(sorted[i - 1]) <= price(item)));
    assert.deepEqual(sortGear(filtered, 'price-desc', { min: '5', max: '10' }).map(price), sorted.map(price).reverse());
});
