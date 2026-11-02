import fs from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import { compareContentItems } from '../src/utils/contentOrder.js';

const book = '艾伯伦：奇械锻炉 (EFA)';
const referenceRoot = process.env.DND_REFERENCE_ROOT || '../DND5e_chm';
const reference = path.join(referenceRoot, '艾伯伦：奇械锻炉');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
function decode(file) {
    const bytes = fs.readFileSync(file);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return iconv.decode(bytes, 'gbk'); }
}
const mappings = new Map();
for (const file of walk(path.join(reference, '第一章'))) {
    if (!/\.html?$/.test(file) || path.basename(file) === '第一章：奇械师.htm') continue;
    const name = path.basename(file);
    mappings.set(file, `奇械师/${name === '法术.htm' ? '法术/人工生命仆从.htm' : name}`);
}
const species = ['幻身灵', '离梦人', '科拉瓦', '化兽者', '战俑'];
for (const file of walk(path.join(reference, '第二章'))) {
    if (!/\.html?$/.test(file)) continue;
    const name = path.basename(file, '.htm');
    let target = `角色选项/${path.basename(file)}`;
    if (name === '第二章：角色选项') target = '角色选项/_概述.htm';
    else if (name === '种族详述') target = '角色选项/种族/_概述.htm';
    else if (species.includes(name)) target = `角色选项/种族/${name}.htm`;
    else if (file.includes('/背景/')) target = `角色选项/背景/${name === '背景' ? '_概述' : name}.htm`;
    else if (['专长', '龙纹专长', '通用专长', '传奇恩惠'].includes(name)) target = `角色选项/专长/${name === '专长' ? '_概述' : name}.htm`;
    mappings.set(file, target);
}
mappings.set(path.join(reference, '附录A：魔法物品.htm'), '魔法物品/_概述.htm');
// Credits remain in the reference repository, outside the player directory.
for (const file of [path.join('data-source', book, '来源与鸣谢.htm'), path.join('public/content', book, '来源与鸣谢.html')]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
}
const imported = [], skipped = [];
function writePage(relative, title, content, originalSource) {
    if (content.includes('\ufffd')) throw new Error(`Damaged source: ${originalSource}`);
    const relativePath = `${book}/${relative}`;
    const publicPath = relativePath.replace(/\.htm$/, '.html');
    const sourceFile = path.join('data-source', relativePath);
    const publicFile = path.join('public/content', publicPath);
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.mkdirSync(path.dirname(publicFile), { recursive: true });
    fs.writeFileSync(sourceFile, `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title></head><body>\n${content}\n</body></html>\n`);
    fs.writeFileSync(publicFile, content + '\n');
    const pathParts = relativePath.split('/').slice(0, -1);
    imported.push({ id: relativePath, title, category: book, path: publicPath, pathParts,
        isOverview: path.basename(relative) === '_概述.htm' || path.basename(relative, '.htm') === pathParts.at(-1),
        sourceBook: 'EFA', originalSource,
        ...(relative === '奇械师/法术/人工生命仆从.htm' ? { hiddenFromDirectory: true } : {}),
        ...(['龙纹专长.htm', '通用专长.htm', '传奇恩惠.htm'].includes(path.basename(relative)) ? { featCategory: path.basename(relative, '.htm') === '传奇恩惠' ? '传奇恩惠专长' : path.basename(relative, '.htm') } : {}) });
}
for (const [file, target] of mappings) {
    const html = decode(file);
    if (!html.trim()) { skipped.push(path.relative(reference, file)); continue; }
    const root = parse(html);
    const title = target === '来源与鸣谢.htm' ? '来源与鸣谢' : target === '奇械师/法术/人工生命仆从.htm' ? '人工生命仆从' : root.querySelector('title')?.textContent.trim() || path.basename(target, '.htm');
    const body = root.querySelector('body');
    root.querySelectorAll('script, style, head, link').forEach(element => element.remove());
    let content = (body || root.querySelector('html') || root).innerHTML.trim();
    if (!content) throw new Error(`Empty content: ${file}`);
    if (target === '魔法物品/_概述.htm') content = '<h1>魔法物品 Magic Items</h1>\n' + content;
    writePage(target, title, content, path.relative(referenceRoot, file));
}
writePage('_概述.htm', book, `<h1>艾伯伦：奇械锻炉 Eberron: Forge of the Artificer</h1>
<p>这里汇集艾伯伦冒险者可用的角色资料：奇械师及五个子职、角色种族与背景、龙纹与专长，以及相关法术和魔法物品。</p>
<p>从下方选择分类，阅读规则或将常用资料收藏到文件夹。</p>`, '玩家资料导览（本站整理）');
const featsFile = 'src/data-feats.json';
const feats = JSON.parse(fs.readFileSync(featsFile)).filter(item => item.sourceBook !== 'EFA');
const efaFeats = [];
for (const [name, category] of [['龙纹专长', '龙纹专长'], ['通用专长', '通用专长'], ['传奇恩惠', '传奇恩惠专长']]) {
    const originalSource = `艾伯伦：奇械锻炉/第二章/${name}.htm`;
    const root = parse(fs.readFileSync(path.join('public/content', book, '角色选项/专长', `${name}.html`), 'utf8'));
    let feat = null, content = [];
    const save = () => {
        if (!feat) return;
        const output = path.join('public/content', feat.path);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `<h2>${feat.title} ${feat.titleEn}</h2>\n${content.join('\n')}\n`);
        efaFeats.push(feat);
    };
    for (const node of root.childNodes) {
        const starter = node.tagName === 'P' ? node.querySelector('font[color="#d08c36"]') : null;
        if (starter) {
            save();
            const titleFull = starter.textContent.replace(/\s+/g, ' ').trim();
            const [title, ...english] = titleFull.split(' ');
            const titleEn = english.join(' ');
            const id = `EFA_${titleEn.replace(/[^A-Za-z0-9]+/g, '_')}`;
            const meta = node.querySelector('i')?.textContent.replace(/\s+/g, ' ').trim() || '';
            const prerequisite = meta.match(/（先决：(.+?)）/)?.[1] || '';
            feat = { id, title, titleEn, category, prerequisite, fullCategory: `${book} > ${category}`, path: `feats/${id}.html`, pathParts: [book, '角色选项', '专长', category], sourceBook: 'EFA', originalSource };
            content = [];
        }
        if (feat) content.push(node.toString());
    }
    save();
}
if (efaFeats.length !== 28) throw new Error(`Expected 28 EFA feats, got ${efaFeats.length}`);
fs.writeFileSync(featsFile, JSON.stringify([...feats, ...efaFeats], null, 2) + '\n');
const indexFile = 'src/data.json';
const existing = JSON.parse(fs.readFileSync(indexFile));
const next = [...existing.filter(item => item.category !== book), ...imported.sort((a, b) => a.pathParts.join('/').localeCompare(b.pathParts.join('/'), 'zh-CN') || compareContentItems(a, b, a.pathParts))];
fs.writeFileSync(indexFile, JSON.stringify(next, null, 2) + '\n');
// The EFA spell page includes its player-controlled companion's stat block.
const spellsFile = 'src/data-spells.json';
const spells = JSON.parse(fs.readFileSync(spellsFile));
const spellPath = `${book}/奇械师/法术/人工生命仆从.html`;
const spell = { id: 'EFA_Homunculus_Servant', title: '人工生命仆从', titleEn: 'Homunculus Servant', fullTitle: '人工生命仆从｜Homunculus Servant', level: '2环', levelNumeric: 2, school: '咒法', classes: ['奇械师'], path: spellPath, source: 'EFA', castingTime: '1小时或仪式', range: '10尺', components: 'V、S、M（价值100+GP的宝石）', duration: '立即' };
const allSpells = [...spells.filter(item => item.id !== spell.id), spell];
const list = parse(fs.readFileSync(path.join('public/content', book, '奇械师/奇械师法术列表.html'), 'utf8'));
const unmatchedSpells = [];
let classSpells = 0;
for (const row of list.querySelectorAll('tr')) {
    const label = row.querySelector('td')?.textContent.replace(/\s+/g, '').trim();
    if (!label || !/[A-Za-z]/.test(label)) continue;
    const titleZh = label.match(/^[^A-Za-z]+/)?.[0];
    const titleEn = label.replace(/^[^A-Za-z]+/, '').toLowerCase();
    const match = allSpells.find(item => item.title === titleZh || item.titleEn.replace(/\s+/g, '').toLowerCase() === titleEn);
    if (!match) { unmatchedSpells.push(label); continue; }
    match.classes = [...new Set([...match.classes, '奇械师'])];
    classSpells++;
}
fs.writeFileSync(spellsFile, JSON.stringify(allSpells, null, 2) + '\n');
console.log(JSON.stringify({ book, pages: imported.length, skippedEmptyPages: skipped, playerSpells: 1, playerFeats: efaFeats.length, classSpells, unmatchedSpells }, null, 2));
