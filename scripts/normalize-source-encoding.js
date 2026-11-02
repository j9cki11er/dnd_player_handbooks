import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';

const sourceRoot = 'data-source';
const referenceRoot = process.env.DND_REFERENCE_ROOT || '../DND5e_chm';
const apply = process.argv.includes('--write');
const decoder = new TextDecoder('utf-8', { fatal: true });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.name.startsWith('.') ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const isHtml = file => /\.html?$/i.test(file);
function decode(file) {
    const bytes = fs.readFileSync(file);
    try { return { text: decoder.decode(bytes), encoding: 'utf8' }; }
    catch { return { text: iconv.decode(bytes, 'gbk'), encoding: 'gbk' }; }
}
const normalize = text => (text || '').replace(/\s+/g, ' ').trim();
const corrupt = text => iconv.encode(text, 'gbk').toString('utf8');
let replacements = new Map();
function remember(clean) {
    if (typeof clean !== 'string' || !clean.trim() || clean.includes('\ufffd')) return;
    const broken = corrupt(clean);
    if (broken === clean) return;
    const key = broken.replace(/\s+/g, '');
    const value = normalize(clean);
    if (!replacements.has(key)) replacements.set(key, value);
    else if (replacements.get(key) !== value) replacements.set(key, null);
}
function textNodes(node, callback) {
    if (node.nodeType === 3) callback(node);
    else for (const child of node.childNodes || []) textNodes(child, callback);
}
const references = [...(fs.existsSync(referenceRoot) ? ['玩家手册2024', '瓦罗怪物指南', '怪物图鉴2025'].flatMap(book => walk(path.join(referenceRoot, book)).filter(isHtml)) : []), ...walk('public/content').filter(isHtml)];
for (const file of references) {
    const { text } = decode(file);
    if (text.includes('\ufffd')) continue;
    const root = parse(text, { comment: true });
    textNodes(root, node => remember(node.rawText));
    // Text recovery leaves HTML attributes and page structure intact.
}
const report = { files: 0, legacyConverted: 0, damagedFiles: 0, repairedNodes: 0, unresolved: [] };
for (const file of walk(sourceRoot).filter(isHtml)) {
    const { text, encoding } = decode(file);
    report.files++;
    if (encoding === 'gbk') report.legacyConverted++;
    let output = text;
    if (text.includes('\ufffd')) {
        report.damagedFiles++;
        const globalReplacements = replacements;
        replacements = new Map();
        const relative = path.relative(sourceRoot, file).replace(/\.htm$/, '.html');
        let publicFile = path.join('public/content', relative);
        if (!fs.existsSync(publicFile) && relative.startsWith('怪物图鉴2025/')) {
            publicFile = path.join('public/content/monsters_original', path.relative('data-source/怪物图鉴2025', file));
        }
        if (fs.existsSync(publicFile)) {
            const clean = decode(publicFile).text;
            if (!clean.includes('\ufffd')) {
                const reference = parse(clean, { comment: true });
                textNodes(reference, node => remember(node.rawText));
            }
        }
        let originalFile;
        const relativeSource = path.relative(sourceRoot, file);
        if (relativeSource.startsWith('怪物图鉴2025/')) originalFile = path.join(referenceRoot, relativeSource);
        else if (/^瓦罗怪物指南 \((?:MPMM|VGM)\)\//.test(relativeSource)) originalFile = path.join(referenceRoot, relativeSource.replace(/^瓦罗怪物指南 \((?:MPMM|VGM)\)/, '瓦罗怪物指南'));
        else {
            const candidates = references.filter(candidate => candidate.startsWith(path.join(referenceRoot, '玩家手册2024') + '/') && path.basename(candidate) === path.basename(file));
            if (candidates.length === 1) originalFile = candidates[0];
        }
        if (originalFile && fs.existsSync(originalFile)) textNodes(parse(decode(originalFile).text), node => remember(node.rawText));
        const localReplacements = replacements;
        replacements = globalReplacements;
        const lookup = value => localReplacements.get(value) || globalReplacements.get(value);
        const root = parse(text, { comment: true });
        if (fs.existsSync(publicFile)) {
            const reference = parse(decode(publicFile).text, { comment: true });
            const cleanNodes = [], brokenNodes = [];
            textNodes(reference.querySelector('body') || reference, node => { if (node.rawText.trim()) cleanNodes.push(node); });
            textNodes(root.querySelector('body') || root, node => { if (node.rawText.trim()) brokenNodes.push(node); });
            if (cleanNodes.length === brokenNodes.length) {
                for (let index = 0; index < brokenNodes.length; index++) {
                    const broken = brokenNodes[index], clean = cleanNodes[index];
                    if (!clean.rawText.includes('\ufffd') && corrupt(clean.rawText).replace(/\s+/g, '') === broken.rawText.replace(/\s+/g, '')) {
                        broken.rawText = clean.rawText;
                        report.repairedNodes++;
                    }
                }
            }
        }
        const contextFiles = [publicFile, originalFile].filter(candidate => candidate && fs.existsSync(candidate));
        for (const contextFile of contextFiles) {
            const reference = parse(decode(contextFile).text, { comment: true });
            const sourceElements = root.querySelectorAll('*');
            const referenceElements = reference.querySelectorAll('*');
            for (const tag of new Set(sourceElements.map(element => element.tagName))) {
                const brokenElements = sourceElements.filter(element => element.tagName === tag);
                const cleanElements = referenceElements.filter(element => element.tagName === tag);
                if (brokenElements.length !== cleanElements.length) continue;
                brokenElements.forEach((element, index) => {
                    for (const [attribute, cleanValue] of Object.entries(cleanElements[index].rawAttributes)) {
                        const brokenValue = element.getAttribute(attribute);
                        if (typeof cleanValue === 'string' && typeof brokenValue === 'string' && cleanValue !== brokenValue && corrupt(cleanValue) === brokenValue) {
                            element.setAttribute(attribute, cleanValue);
                            report.repairedNodes++;
                        }
                    }
                    const brokenNodes = element.childNodes.filter(node => node.nodeType === 3 && node.rawText.trim());
                    const cleanNodes = cleanElements[index].childNodes.filter(node => node.nodeType === 3 && node.rawText.trim());
                    if (brokenNodes.length !== cleanNodes.length) return;
                    brokenNodes.forEach((broken, nodeIndex) => {
                        const clean = cleanNodes[nodeIndex];
                        if (!clean.rawText.includes('\ufffd') && corrupt(clean.rawText).replace(/\s+/g, '') === broken.rawText.replace(/\s+/g, '')) {
                            broken.rawText = clean.rawText;
                            report.repairedNodes++;
                        }
                    });
                });
            }
        }
        textNodes(root, node => {
            const replacement = lookup(node.rawText.replace(/\s+/g, ''));
            if (replacement && node.rawText.includes('\ufffd')) {
                const leading = node.rawText.match(/^\s*/)[0];
                const trailing = node.rawText.match(/\s*$/)[0];
                node.rawText = leading + replacement + trailing;
                report.repairedNodes++;
            }
        });
        for (const node of root.querySelectorAll('*')) {
            for (const [key, value] of Object.entries(node.rawAttributes)) {
                const replacement = lookup((value || '').replace(/\s+/g, ''));
                if (replacement) { node.setAttribute(key, replacement); report.repairedNodes++; }
            }
        }
        output = root.toString();
    }
    output = output.replace(/coding\s*:\s*(?:gbk|gb2312|utf-?8)/gi, 'coding: utf-8')
        .replace(/(charset\s*=\s*["']?)(?:gb2312|gbk|gb18030|utf-?8)/gi, '$1utf-8');
    if (!/<meta\b[^>]*charset/i.test(output)) output = output.replace(/<head\b[^>]*>/i, '$&\n<meta charset="utf-8">');
    if (output.includes('\ufffd')) report.unresolved.push({ file, replacements: output.split('\ufffd').length - 1 });
    if (apply && (output !== text || encoding !== 'utf8')) fs.writeFileSync(file, output, 'utf8');
}
console.log(JSON.stringify(report, null, 2));
if (apply) fs.writeFileSync('source-encoding-report.json', JSON.stringify(report, null, 2) + '\n');
