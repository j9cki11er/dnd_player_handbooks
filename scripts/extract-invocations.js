import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '..');
const SOURCE_FILE = path.join(BASE_DIR, 'public/content/第三章：角色职业/魔契师/魔能祈唤选项.html');
const OUTPUT_DIR = path.join(BASE_DIR, 'public/content/invocations');
const JSON_OUTPUT_PATH = path.join(BASE_DIR, 'src/data-invocations.json');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function extractInvocations() {
    ensureDir(OUTPUT_DIR);
    if (!fs.existsSync(SOURCE_FILE)) {
        console.error(`Source file not found: ${SOURCE_FILE}`);
        return;
    }

    const html = fs.readFileSync(SOURCE_FILE, 'utf8');
    const root = parse(html);

    // Find all potential titles
    const allStrongs = root.querySelectorAll('strong, b');
    const starters = [];
    const blacklist = ['先决', '复选', 'Cantrips', 'Focus', 'Attack', 'DC', 'Damage', 'Aerial', 'Aquatic', 'Necrotic', 'Radiant', 'Resistance', 'Save'];

    allStrongs.forEach(s => {
        const text = s.innerText.trim();
        const isBlacklisted = blacklist.some(word => text.includes(word));
        if (text.length > 2 && /[a-zA-Z]/.test(text) && !isBlacklisted && text.length < 100) {
            starters.push(s);
        }
    });

    const invocations = [];

    // Brute force: get all direct children of body, or just the whole body and split.
    // Instead, let's assign each element to a starter.
    const body = root.querySelector('body') || root;
    const allElements = body.querySelectorAll('*');

    // Actually, let's use the starters' positions.
    const starterInfo = starters.map((s, i) => {
        const text = s.innerText.trim().replace(/\s+/g, ' ');
        let title = text;
        let titleEn = '';
        const titleMatch = text.match(/^([\u4e00-\u9fa5（）\s]+)(.*)$/);
        if (titleMatch) {
            title = titleMatch[1].trim();
            titleEn = titleMatch[2].trim();
        }
        if (!titleEn) {
            const enMatch = title.match(/[a-zA-Z].*$/);
            if (enMatch) {
                titleEn = enMatch[0];
                title = title.replace(titleEn, '').trim();
            }
        }
        return { node: s, title, titleEn, text, content: [] };
    });

    // Walk through all nodes in the body
    function walk(node, currentStarterIndex) {
        // If node is a starter, update currentStarter
        const sIndex = starters.indexOf(node);
        if (sIndex !== -1) {
            currentStarterIndex = sIndex;
        } else if (currentStarterIndex !== -1) {
            // Add this node's content if it's a leaf node or we want its HTML
            // To avoid double counting, only add if it's a text node or it doesn't have children we walk into.
        }

        if (node.childNodes && node.childNodes.length > 0) {
            node.childNodes.forEach(child => {
                currentStarterIndex = walk(child, currentStarterIndex);
            });
        } else {
            // Leaf node
            if (currentStarterIndex !== -1 && node !== starters[currentStarterIndex]) {
                const content = node.rawText || node.outerHTML || '';
                starterInfo[currentStarterIndex].content.push(content);
            }
        }
        return currentStarterIndex;
    }

    walk(body, -1);

    starterInfo.forEach(info => {
        let prerequisite = '';
        let reqLevel = 0;

        const fullContentText = info.content.join('');
        const prereqMatch = fullContentText.match(/先决[:：]\s*([^<>\n]+)/);
        if (prereqMatch) {
            prerequisite = prereqMatch[1].split('。')[0].split('<')[0].trim();
            const levelMatch = prerequisite.match(/等级\s*(\d+)/);
            if (levelMatch) reqLevel = parseInt(levelMatch[1]);
        }

        const inv = {
            id: `invocation_${info.text.replace(/\s+/g, '_').replace(/[^\w]/g, '').toLowerCase()}`,
            title: info.title,
            titleEn: info.titleEn,
            prerequisite,
            reqLevel,
            category: '魔能祈唤'
        };

        saveInvocation(inv, info.content, invocations);
    });

    // Deduplicate
    const unique = [];
    const seen = new Set();
    invocations.forEach(i => {
        if (!seen.has(i.id)) {
            unique.push(i);
            seen.add(i.id);
        }
    });

    unique.sort((a, b) => {
        if (a.reqLevel !== b.reqLevel) return a.reqLevel - b.reqLevel;
        return a.title.localeCompare(b.title, 'zh-CN');
    });

    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(unique, null, 2));
    console.log(`Extracted ${unique.length} unique invocations to ${JSON_OUTPUT_PATH}`);
}

function saveInvocation(invocation, contentArr, allInvocations) {
    const filename = `${invocation.id}.html`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    invocation.path = `invocations/${filename}`;

    const fullHtml = `<h2>${invocation.title}${invocation.titleEn ? ' ' + invocation.titleEn : ''}</h2>\n<p>` + contentArr.join('').replace(/\n/g, '<br>') + '</p>';
    fs.writeFileSync(outputPath, fullHtml);
    allInvocations.push(invocation);
}

extractInvocations();
