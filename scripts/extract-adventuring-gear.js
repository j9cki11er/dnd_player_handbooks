import fs from 'node:fs';
import { parse } from 'node-html-parser';
const source = 'public/content/第六章：装备/冒险装备.html';
const root = parse(fs.readFileSync(source, 'utf8'));
const clean = value => value.replace(/\s+/g, ' ').trim();
const key = value => value.replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '');
const coins = { CP: 0.01, SP: 0.1, EP: 0.5, GP: 1, PP: 10 };
const prices = value => [...value.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(CP|SP|EP|GP|PP)/gi)].map(([, n, coin]) => Number(n.replace(/,/g, '')) * coins[coin.toUpperCase()]);
const items = [];
for (const row of root.querySelector('table').querySelectorAll('tr').slice(1)) {
    const cells = row.querySelectorAll('td');
    for (const offset of [0, 4]) {
        const title = clean(cells[offset]?.textContent || '');
        if (!title) continue;
        const weight = clean(cells[offset + 1]?.textContent || '—');
        const cost = clean(cells[offset + 2]?.textContent || '多种');
        items.push({ id: `gear:${title}`, title, weight, cost, pricesGP: prices(cost) });
    }
}
let current = null, parts = [];
const unmatchedDescriptions = [];
const save = () => {
    if (!current) return;
    const html = parts.join('\n');
    current.descriptionHtml = html;
    if (current.title === '戏法卷轴') {
        const firstLevel = items.find(item => item.title === '一环卷轴');
        firstLevel.descriptionHtml = html;
        firstLevel.titleEn = 'Spell Scroll (Level 1)';
        current.titleEn = 'Spell Scroll (Cantrip)';
    }
    if (!current.pricesGP.length) {
        const sub = parse(html);
        const values = sub.querySelectorAll('table tr').flatMap(row => prices(row.querySelectorAll('td').at(-1)?.textContent || ''));
        current.pricesGP = [...new Set([...values, ...prices(current.originalHeading)])];
    }
};
for (const node of root.childNodes) {
    const strong = node.tagName === 'P' ? node.querySelector('strong') : null;
    const heading = strong ? clean(strong.textContent) : '';
    const match = heading.match(/^([^A-Za-z]+)\s*([A-Za-z].*)$/);
    if (match && /[（(].*[）)]\s*$/.test(heading)) {
        save();
        const rawTitle = key(match[1]);
        const title = { '卷轴匣/地图匣': '地图或卷轴匣', '法术卷轴': '戏法卷轴' }[rawTitle] || rawTitle;
        current = items.find(item => key(item.title) === title);
        if (!current) unmatchedDescriptions.push(heading);
        if (current) {
            current.titleEn = match[2].replace(/\s*[（(].*[）)]\s*$/, '').trim();
            current.originalHeading = heading;
            strong.remove();
        }
        parts = [];
    }
    if (current) parts.push(node.toString());
}
save();
const missing = items.filter(item => !item.descriptionHtml).map(item => item.title);
if (missing.length || unmatchedDescriptions.length) throw new Error(JSON.stringify({ missing, unmatchedDescriptions }));
items.sort((a, b) => a.titleEn.localeCompare(b.titleEn, 'en'));
fs.writeFileSync('src/data-gear.json', JSON.stringify(items, null, 2) + '\n');
console.log(JSON.stringify({ items: items.length, variablePrices: items.filter(item => !prices(item.cost).length).map(item => [item.title, item.pricesGP]) }));
