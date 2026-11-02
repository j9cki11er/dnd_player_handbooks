import fs from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';
import { readNumber } from '../src/utils/contentOrder.js';
const referenceRoot = process.env.DND_REFERENCE_ROOT || '../DND5e_chm';
const configs = [
    { title: '珊娜萨的万事指南 (XGE)', code: 'XGE', directory: '珊娜萨的万事指南', roots: ['角色选项', '角色姓名', '法术'], extra: [], description: 'XGE 旧版玩家规则：子职、种族专长、法术、角色生平与姓名参考，以及工具和休整期活动。与 2024 规则重叠的选项保留为独立版本。' },
    { title: '被遗忘的国度：费伦英雄', code: 'FRHF', directory: '被遗忘的国度/费伦英雄', extra: ['第四章', '第五章'], description: '费伦冒险者的子职、背景、种族规则、专长、装备与施法规则。' },
    { title: '鸦阁魔域：魔障深藏', code: 'RHW', directory: '鸦阁魔域：魔障深藏', extra: [], description: '恐怖冒险中的玩家子职、种族、背景、专长、黑暗赠礼与角色塑造建议。' },
    { title: '启封奥秘', code: 'AU', directory: '启封奥秘', extra: ['第二章'], description: '魔法主题的子职、背景、专长、法术与魔法物品。' }
];
const codes = new Set(configs.map(book => book.code));
const load = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const originalIndex = load('src/data.json');
const oldFeats = load('src/data-feats.json');
const oldSpells = load('src/data-spells.json');
const data = originalIndex.filter(item => !codes.has(item.sourceBook));
const feats = oldFeats.filter(item => !codes.has(item.sourceBook));
const spells = oldSpells.filter(item => !codes.has(item.source));
const reports = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
function decode(file) {
    const bytes = fs.readFileSync(file);
    try { return new TextDecoder('utf8', { fatal: true }).decode(bytes); }
    catch { return iconv.decode(bytes, 'gbk'); }
}
const cleanText = text => text.replace(/\s+/g, ' ').trim();
function readPage(file) {
    const raw = decode(file);
    if (!raw.trim()) return null;
    const root = parse(raw);
    const title = cleanText(root.querySelector('title')?.textContent || path.basename(file, path.extname(file)));
    const body = root.querySelector('body');
    root.querySelectorAll('head, script, style, link').forEach(node => node.remove());
    const html = (body || root.querySelector('html') || root).innerHTML.trim();
    if (html.includes('\ufffd')) throw new Error(`Damaged source: ${file}`);
    return { title, html };
}
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
for (const book of configs) {
    const report = { book: book.title, pages: 0, feats: 0, spells: 0, skippedEmpty: [], missingAssets: [] };
    const source = path.join(referenceRoot, book.directory);
    const files = [...(book.roots || ['第一章']).flatMap(chapter => walk(path.join(source, chapter))), ...book.extra.flatMap(chapter => walk(path.join(source, chapter)))].filter(file => /\.html?$/.test(file));
    if (book.code === 'XGE') {
        for (const folder of ['地下城主工具/工具', '地下城主工具/范例休整期活动']) files.push(...walk(path.join(source, folder)).filter(file => /\.html?$/.test(file)));
        for (const name of ['角色姓名.htm', '核心规则/需谨记的十条规则.htm', '地下城主工具/工具熟练.html', '地下城主工具/修整期活动.htm', '地下城主工具/施法.html', '地下城主工具/精金武器.htm', '地下城主工具/打结.htm', '地下城主工具/睡眠.htm', '地下城主工具/坠落.htm', '地下城主工具/同时效应.htm']) files.push(path.join(source, name));
    }
    if (book.code === 'AU') {
        for (const name of ['第五章：魔法物品', '魔法物品', '普通', '非普通', '珍稀', '极珍稀', '传说', '神器', '多种稀有度', '进化魔法物品预设']) {
            const file = path.join(source, '第五章', `${name}.htm`);
            if (fs.existsSync(file)) files.push(file);
        }
    }
    function savePage(relative, title, html, originalSource, metadata = {}) {
        const id = `${book.title}/${relative}`;
        const publicPath = id.replace(/\.htm$/, '.html');
        write(path.join('data-source', id), `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title></head><body>\n${html}\n</body></html>\n`);
        write(path.join('public/content', publicPath), html + '\n');
        const pathParts = id.split('/').slice(0, -1);
        const entry = { id, title, category: book.title, path: publicPath, pathParts, isOverview: path.basename(relative) === '_概述.htm', sourceBook: book.code, originalSource, ...metadata };
        data.push(entry); report.pages++;
        return entry;
    }
    for (const file of files) {
        const relative = path.relative(source, file);
        const base = path.basename(file, path.extname(file));
        if (book.code === 'RHW' && ['第一章/专长.htm', '第一章/起源专长.htm', '第一章/黑暗赠礼.htm'].includes(relative)) continue;
        const page = readPage(file);
        if (!page) { report.skippedEmpty.push(relative); continue; }
        let target;
        if (book.code === 'XGE') {
            target = relative.replace(/\.html?$/, '.htm');
            if (relative.startsWith('角色选项/')) {
                if (base === '种族专长') target = '角色选项/专长/种族专长.htm';
                else if (['吟游诗人', '圣武士', '德鲁伊', '战士', '术士', '武僧', '法师', '游侠', '游荡者', '牧师', '野蛮人', '魔契师'].includes(base)) target = `角色选项/${base}/_概述.htm`;
            } else if (relative.startsWith('地下城主工具/工具/')) target = `工具/${base}.htm`;
            else if (base === '工具熟练') target = '工具/_概述.htm';
            else if (relative.startsWith('地下城主工具/范例休整期活动/')) target = `休整期活动/${base === '范例休整期活动' ? '_活动列表' : base}.htm`;
            else if (base === '修整期活动') target = '休整期活动/_概述.htm';
            else if (base === '角色姓名') target = '角色姓名/_概述.htm';
            else if (relative.startsWith('地下城主工具/') || relative.startsWith('核心规则/')) target = `补充规则/${base}.htm`;
        } else if (relative.startsWith('第一章/')) {
            target = `角色选项/${relative.slice('第一章/'.length)}`;
            if (base === '第一章：角色选项') target = '角色选项/_概述.htm';
            if (['背景', '种族', '子职', '专长'].includes(base)) target = `角色选项/${base}/_概述.htm`;
            // The local Arcana source names its subclass introduction "八环.htm".
            if (book.code === 'AU' && relative === '第一章/子职/八环.htm') target = '角色选项/子职/_概述.htm';
        } else if (relative.startsWith('第四章/')) target = `装备/${base.startsWith('第四章') ? '_概述' : base}.htm`;
        else if (relative.startsWith('第五章/')) target = `${book.code === 'AU' ? '魔法物品' : '施法规则'}/${base.startsWith('第五章') ? '_概述' : base}.htm`;
        else target = `法术/${base.startsWith('第二章') ? '_概述' : base}.htm`;
        const root = parse(page.html);
        // Keep local illustrations alongside the imported page rather than breaking relative URLs.
        for (const image of root.querySelectorAll('img[src]')) {
            const src = image.getAttribute('src');
            if (!src || /^(?:https?:|data:|\/)/i.test(src)) continue;
            const originalAsset = path.resolve(path.dirname(file), src.replace(/\\/g, '/'));
            if (!fs.existsSync(originalAsset)) { report.missingAssets.push({ page: relative, asset: src }); image.remove(); continue; }
            const assetRelative = `${book.title}/assets/${path.basename(originalAsset)}`;
            for (const folder of ['data-source', 'public/content']) {
                const dest = path.join(folder, assetRelative); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(originalAsset, dest);
            }
            image.setAttribute('src', `/content/${assetRelative}`);
        }
        if (book.code === 'XGE') {
            for (const element of root.querySelectorAll('[style]')) {
                const style = element.getAttribute('style').replace(/(^|;)\s*(?:background(?:-color)?|color)\s*:[^;]*(?=;|$)/gi, '$1');
                element.setAttribute('style', style);
            }
        }
        const html = root.toString();
        const originalSource = `${book.directory}/${relative}`;
        const isSpellPage = root.querySelectorAll('h4').some(header => header.textContent.includes('｜'));
        const featCategory = book.code === 'XGE' && base === '种族专长' ? '种族专长' : relative.includes('/专长/') && !['专长'].includes(base)
            ? ({ '传奇恩惠': '传奇恩惠专长', '黑暗赠礼': '黑暗赠礼专长' }[base] || base) : null;
        const entry = savePage(target, page.title, html, originalSource, { ...(isSpellPage || (book.code === 'XGE' && relative.startsWith('法术/')) || (book.code === 'AU' && relative.startsWith('第二章/')) ? { hiddenFromDirectory: true } : {}), ...(featCategory ? { featCategory } : {}) });
        if (featCategory) {
            let current = null, nodes = [];
            const saveFeat = () => {
                if (!current) return;
                write(path.join('public/content', current.path), `<h2>${current.title} ${current.titleEn}</h2>\n${nodes.join('\n')}\n`);
                feats.push(current); report.feats++;
            };
            for (const node of root.childNodes) {
                const font = node.tagName === 'P' ? node.querySelector('font[color]') : null;
                const isStarter = node.tagName === 'H3' || (font && !(book.code === 'XGE' && font.hasAttribute('size')) && cleanText(node.textContent).startsWith(cleanText(font.textContent)));
                if (isStarter) {
                    saveFeat();
                    const fullTitle = cleanText((font || node).textContent);
                    const [title, ...english] = fullTitle.split(' ');
                    const titleEn = english.join(' ');
                    if (!titleEn) throw new Error(`Missing feat English title: ${originalSource}: ${title}`);
                    const id = `${book.code}_${titleEn.replace(/[^A-Za-z0-9]+/g, '_')}`;
                    const meta = node.querySelector?.('i,em')?.textContent || node.nextElementSibling?.textContent || '';
                    const prerequisite = cleanText(meta).match(/[（(]先决[：:](.+?)[）)]/)?.[1] || cleanText(meta).match(/先决条件[：:]\s*(.+)/)?.[1] || '';
                    current = { id, title, titleEn, category: featCategory, prerequisite, fullCategory: `${book.title} > ${featCategory}`, path: `feats/${id}.html`, pathParts: [book.title, '角色选项', '专长', featCategory], sourceBook: book.code, originalSource };
                    nodes = [];
                }
                if (current) nodes.push(node.toString());
            }
            saveFeat();
        }
        if (isSpellPage) {
            for (const header of root.querySelectorAll('h4').filter(node => node.textContent.includes('｜'))) {
                const [title, titleEn] = cleanText(header.textContent).split('｜').map(text => text.trim());
                const parts = [];
                let sibling = header.nextElementSibling;
                while (sibling && sibling.tagName !== 'H4') { parts.push(sibling.outerHTML); sibling = sibling.nextElementSibling; }
                const content = parts.join('\n');
                const contentRoot = parse(content);
                const first = cleanText(contentRoot.querySelector('p')?.textContent || '');
                const levelMatch = first.match(/(戏法|[零一二三四五六七八九十\d]+)\s*环?/);
                const levelNumeric = levelMatch?.[1] === '戏法' ? 0 : readNumber(levelMatch?.[1] || '');
                if (levelNumeric === null) throw new Error(`Cannot parse spell level: ${title}: ${first}`);
                const school = ['防护', '咒法', '预言', '惑控', '塑能', '幻术', '死灵', '变化'].find(name => first.includes(name));
                const classes = first.match(/[（(]([^）)]+)[）)]/)?.[1].split(/[、,，]/).map(name => name.trim()).filter(Boolean) || [];
                if (!school || !classes.length) throw new Error(`Missing spell metadata: ${title}: ${first}`);
                const fields = {};
                for (const paragraph of contentRoot.querySelectorAll('p')) {
                    const lines = paragraph.innerHTML.split(/<br\b[^>]*>/i).map(fragment => cleanText(parse(fragment).textContent));
                    for (const text of lines) {
                        for (const [label, key] of [['施法时间', 'castingTime'], ['施法距离', 'range'], ['法术成分', 'components'], ['持续时间', 'duration']]) {
                            const match = text.match(new RegExp(`${label}[：:]\\s*(.*?)(?=施法时间[：:]|施法距离[：:]|法术成分[：:]|持续时间[：:]|$)`));
                            if (match && !fields[key]) fields[key] = match[1].trim();
                        }
                    }
                }
                if (!fields.castingTime || !fields.components || !fields.duration) throw new Error(`Incomplete spell: ${title}`);
                const id = `${book.code}_${titleEn.replace(/[^A-Za-z0-9]+/g, '_')}`;
                const spell = { id, title, titleEn, fullTitle: `${title}｜${titleEn}`, level: levelNumeric ? `${levelNumeric}环` : '戏法', levelNumeric, school, classes, source: book.code, sourceBook: book.code, originalSource, path: `spells/${id}.html`, ...fields };
                write(path.join('public/content', spell.path), header.outerHTML + '\n' + content + '\n');
                spells.push(spell); report.spells++;
            }
        }
        // Aggregate spell pages are source references; spells are opened from the unified list.
        if (entry.hiddenFromDirectory && target.startsWith('法术/')) entry.pathParts = [book.title];
    }
    savePage('_概述.htm', book.title, `<h1>${book.title}</h1>\n<p>${book.description}</p>\n<p>从下方选择玩家资料分类。专长可以逐项收藏，法术可在法术列表中查阅。</p>`, '玩家资料导览（本站整理）');
    reports.push(report);
}
for (const [file, items] of [['src/data.json', data], ['src/data-feats.json', feats], ['src/data-spells.json', spells]]) {
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error(`Duplicate IDs in ${file}`);
}
// Validate the entire selection before updating any of the shared indexes.
for (const [file, items] of [['src/data.json', data], ['src/data-feats.json', feats], ['src/data-spells.json', spells]]) fs.writeFileSync(file, JSON.stringify(items, null, 2) + '\n');
fs.writeFileSync('player-expansions-report.json', JSON.stringify(reports, null, 2) + '\n');
console.log(JSON.stringify(reports, null, 2));
