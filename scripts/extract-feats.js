import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '..');
const FEATS_SOURCE_DIR = path.join(BASE_DIR, 'public/content/第五章：专长');
const FEATS_OUTPUT_DIR = path.join(BASE_DIR, 'public/content/feats');
const JSON_OUTPUT_PATH = path.join(BASE_DIR, 'src/data-feats.json');

const FEAT_FILES = [
    { name: '起源专长.html', category: '起源专长' },
    { name: '通用专长.html', category: '通用专长' },
    { name: '战斗风格专长.html', category: '战斗风格专长' },
    { name: '传奇恩惠专长.html', category: '传奇恩惠专长' }
];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function extractFeats() {
    ensureDir(FEATS_OUTPUT_DIR);
    const allFeats = [];

    FEAT_FILES.forEach(({ name, category }) => {
        const filePath = path.join(FEATS_SOURCE_DIR, name);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return;
        }

        const html = fs.readFileSync(filePath, 'utf8');
        const root = parse(html);

        // Find all potential feat starters
        // A feat usually starts with a <p> containing <font color="#da0303">
        const paragraphs = root.querySelectorAll('p');
        let currentFeat = null;
        let currentContent = [];

        paragraphs.forEach((p, idx) => {
            const font = p.querySelector('font[color="#da0303"]');
            const isFeatStarter = font && (p.querySelector('b') || p.querySelector('strong'));

            if (isFeatStarter) {
                // Save previous feat if it exists
                if (currentFeat) {
                    saveFeat(currentFeat, currentContent, allFeats);
                }

                // Start new feat
                const titleFull = font.innerText.trim();
                const titleParts = titleFull.split(/\s+/);
                const title = titleParts[0]; // First word is usually CN
                const titleEn = titleParts.slice(1).join(' ');

                // Extract prerequisite from italic/em text
                const meta = p.querySelector('i') || p.querySelector('em');
                let prerequisite = '';
                if (meta) {
                    const metaText = meta.innerText.trim();
                    const preMatch = metaText.match(/（先决：(.+?)）/);
                    if (preMatch) {
                        prerequisite = preMatch[1];
                    }
                }

                currentFeat = {
                    id: titleFull.replace(/\s+/g, '_'),
                    title,
                    titleEn,
                    category,
                    prerequisite,
                    fullCategory: category + (prerequisite ? `（先决：${prerequisite}）` : '')
                };
                currentContent = [p.outerHTML];

                // Also capture siblings until next <p> or end
                let next = p.nextElementSibling;
                while (next && next.tagName !== 'P') {
                    // But wait, some feats have <ul> after the starter <p>
                    // We need to keep going until we hit another <p> that starts a feat
                    // Actually, if it's NOT a feat starter <p>, we should just consume it.
                    // But if it IS a <p>, we should check if it's a feat starter.
                    break;
                }
            } else if (currentFeat) {
                currentContent.push(p.outerHTML);
            }

            // Handle lists and other non-p elements between paragraphs
            let next = p.nextElementSibling;
            while (next && next.tagName !== 'P') {
                if (currentFeat) {
                    currentContent.push(next.outerHTML);
                }
                next = next.nextElementSibling;
            }
        });

        // Save last feat
        if (currentFeat) {
            saveFeat(currentFeat, currentContent, allFeats);
        }
    });

    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(allFeats, null, 2));
    console.log(`Extracted ${allFeats.length} feats to ${JSON_OUTPUT_PATH}`);
}

function saveFeat(feat, contentArr, allFeats) {
    const filename = `${feat.id}.html`;
    const outputPath = path.join(FEATS_OUTPUT_DIR, filename);
    feat.path = `feats/${filename}`;

    // Add <h2> with title
    const fullHtml = `<h2>${feat.title}${feat.titleEn ? ' ' + feat.titleEn : ''}</h2>\n` + contentArr.join('\n');

    fs.writeFileSync(outputPath, fullHtml);
    allFeats.push(feat);
}

extractFeats();
