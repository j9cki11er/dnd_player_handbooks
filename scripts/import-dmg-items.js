import fs from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
const book = '城主指南：魔法物品 (DMG 2024)';
const sourceRoot = path.join(process.env.DND_REFERENCE_ROOT || '../DND5e_chm', '城主指南2024');
const itemRoot = path.join(sourceRoot, '7.宝藏/魔法物品详述');
const entries = [], assets = [], ids = new Set();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
function decode(file) {
    const bytes = fs.readFileSync(file);
    try { return new TextDecoder('utf8', { fatal: true }).decode(bytes); }
    catch { return iconv.decode(bytes, 'gbk'); }
}
const text = value => value.replace(/\s+/g, ' ').trim();
function save(relative, title, html, originalSource, fields = {}) {
    if (html.includes('\ufffd')) throw new Error(`Damaged source: ${originalSource}`);
    const id = `${book}/${relative}`;
    if (ids.has(id)) throw new Error(`Duplicate item path: ${id}`);
    ids.add(id);
    const publicPath = id.replace(/\.htm$/, '.html');
    const sourceFile = path.join('data-source', id), publicFile = path.join('public/content', publicPath);
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.mkdirSync(path.dirname(publicFile), { recursive: true });
    fs.writeFileSync(sourceFile, `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title></head><body>\n${html}\n</body></html>\n`);
    fs.writeFileSync(publicFile, html + '\n');
    entries.push({ id, title, category: book, path: publicPath, pathParts: id.split('/').slice(0, -1), isOverview: path.basename(relative) === '_概述.htm', sourceBook: 'DMG2024', originalSource, ...fields });
}
for (const file of walk(itemRoot).filter(file => /\.html?$/.test(file))) {
    const root = parse(decode(file));
    root.querySelectorAll('head,script,style,link').forEach(node => node.remove());
    for (const image of root.querySelectorAll('img[src]')) {
        const src = image.getAttribute('src');
        if (/^(?:https?:|data:|\/)/.test(src)) continue;
        const source = path.resolve(path.dirname(file), src.replace(/\\/g, '/'));
        if (!fs.existsSync(source)) throw new Error(`Missing image: ${source}`);
        const relative = `${book}/assets/${path.basename(source)}`;
        for (const folder of ['data-source', 'public/content']) {
            const target = path.join(folder, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
        }
        assets.push(relative);
        image.setAttribute('src', `/content/${relative}`);
    }
    const original = path.relative(itemRoot, file);
    const hierarchy = original.split('/');
    if (hierarchy.length < 2) continue;
    const itemType = hierarchy[0];
    const rarity = path.basename(file, path.extname(file));
    for (const header of root.querySelectorAll('h6[id]')) {
        const fullTitle = text(header.textContent);
        const englishIndex = fullTitle.search(/[A-Za-z]/);
        let title = englishIndex < 0 ? fullTitle : fullTitle.slice(0, englishIndex).trim();
        const titleEn = englishIndex < 0 ? '' : fullTitle.slice(englishIndex).trim();
        const bonus = fullTitle.match(/[，,]\s*([+＋]\d.*)$/)?.[1];
        if (bonus) title += `（${bonus}）`;
        const nodes = [];
        let sibling = header.nextElementSibling;
        while (sibling && !(sibling.tagName === 'H6' && sibling.hasAttribute('id'))) {
            nodes.push(sibling.outerHTML); sibling = sibling.nextElementSibling;
        }
        const html = `<h2>${fullTitle}</h2>\n${nodes.join('\n')}`;
        const meta = text(parse(nodes.join('\n')).querySelector('em')?.textContent || '');
        const filename = header.id.replace(/[^A-Za-z0-9_-]+/g, '_');
        if (!filename) throw new Error(`Missing stable item ID: ${fullTitle}`);
        save(`物品图鉴/${hierarchy.slice(0, -1).join('/')}/${rarity}/${filename}.htm`, title, html, `城主指南2024/7.宝藏/魔法物品详述/${original}`, { titleEn, fullTitle, itemType, rarity, requiresAttunement: meta.includes('需同调'), itemMeta: meta });
    }
}
const itemCount = entries.length;
for (const name of ['魔法物品', '制造魔法物品', '激活魔法物品', '魔法物品的类别', '魔法物品的稀有度', '魔法物品的耐久', '诅咒物品', '“下个黎明”']) {
    const relative = `7.宝藏/魔法物品/${name}.htm`;
    const root = parse(decode(path.join(sourceRoot, relative)));
    const body = root.querySelector('body');
    root.querySelectorAll('head,script,style,link').forEach(node => node.remove());
    save(`使用与制造/${name === '魔法物品' ? '_概述' : name}.htm`, name, (body || root.querySelector('html') || root).innerHTML.trim(), `城主指南2024/${relative}`);
}
save('_概述.htm', book, `<h1>城主指南 2024 · 魔法物品</h1>\n<p>按类别和稀有度查阅魔法物品。每件物品都可独立搜索和收藏，制造所需的工具、法术、时间与成本可在“使用与制造”中查阅。</p>`, '魔法物品玩家导览（本站整理）');
const indexFile = 'src/data.json';
const previous = JSON.parse(fs.readFileSync(indexFile));
const next = [...previous.filter(entry => entry.sourceBook !== 'DMG2024'), ...entries];
if (new Set(next.map(entry => entry.id)).size !== next.length) throw new Error('Duplicate index IDs');
fs.writeFileSync(indexFile, JSON.stringify(next, null, 2) + '\n');
const report = { book, edition: '2024', items: itemCount, rules: 8, pages: entries.length, types: [...new Set(entries.map(entry => entry.itemType).filter(Boolean))], assets: [...new Set(assets)] };
fs.writeFileSync('dmg-items-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
