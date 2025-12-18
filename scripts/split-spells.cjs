const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

const SOURCE_DIR = path.join(__dirname, '../public/content/第七章：法术/法术详述');
const OUTPUT_DIR = path.join(__dirname, '../public/content/spells');
const DATA_OUTPUT = path.join(__dirname, '../src/data-spells.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const spellIndex = [];
// File names are like 0环.html, 1环.html ... 9环.html
const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('环.html'));

files.sort((a, b) => {
    const levelA = parseInt(a) || 0;
    const levelB = parseInt(b) || 0;
    return levelA - levelB;
});

files.forEach(file => {
    const levelStr = file.replace('.html', '');
    const content = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf-8');
    const root = parse(content);

    // Spells start with <H4>
    const headers = root.querySelectorAll('h4');

    headers.forEach((header, index) => {
        // 1. Extract Basic Info
        const fullTitle = header.text.trim();
        // Title format: "Acid Splash｜酸液飞溅" or "酸液飞溅｜Acid Splash" (It seems to be Chinese｜English based on file view)
        // Checking file content: "酸液飞溅｜Acid Splash"
        const [zhTitle, enTitle] = fullTitle.split('｜').map(s => s.trim());

        // Some IDs have spaces or are missing, fallback
        const originalId = header.getAttribute('id') || zhTitle;

        // 2. Extract Metadata & Content
        // The content is everything until the next H4
        let spellContent = [];
        let nextNode = header.nextElementSibling;
        let metaText = '';

        while (nextNode && nextNode.tagName !== 'H4') {
            spellContent.push(nextNode.outerHTML);
            if (nextNode.tagName === 'P' && !metaText) {
                // The first P usually contains the metadata inside <EM>
                const em = nextNode.querySelector('em');
                if (em) metaText = em.text;
            }
            nextNode = nextNode.nextElementSibling;
        }

        // 3. Parse Metadata (School, Level, Classes) from string like "塑能 戏法（术士、法师）"
        // Regex to match: (School) (Level)（(Classes)）
        // Example: "塑能 戏法（术士、法师）" -> School: 塑能, LevelType: 戏法, Classes: 术士、法师
        let school = '';
        let levelType = '';
        let classes = [];

        // Cleanup metaText
        const cleanMeta = metaText.replace(/&nbsp;/g, ' ').trim();

        // Try to parse
        // Parts split by space? "塑能 戏法（术士、法师）"
        // Sometimes there might be multiple spaces or no space?
        // Let's use a simpler approach: extract content in brackets for classes
        const classMatch = cleanMeta.match(/（(.*?)）/);
        if (classMatch) {
            classes = classMatch[1].split(/[、,]/).map(c => c.trim());
        }

        // Remove classes part to get school and level
        const typeInfo = cleanMeta.replace(/（.*?）/, '').trim();
        const parts = typeInfo.split(/\s+/);

        // Known schools (Chinese names)
        const knownSchools = ['防护', '咒法', '预言', '惑控', '塑能', '幻术', '死灵', '变化'];

        if (parts.length >= 2) {
            // Check if first part is a school
            if (knownSchools.some(s => parts[0].includes(s))) {
                school = parts[0];
                levelType = parts[1];
            } else {
                // Assume first part is level, second is school
                levelType = parts[0];
                school = parts[1];
            }
        } else {
            school = typeInfo;
        }

        // Determine numeric level from filename if needed, or stick to processed ID
        const levelNumeric = parseInt(file.replace('环.html', '')) || 0;

        // 4. Save individual file
        // Some IDs like "Acid_Splash" are good, others might be Chinese or have spaces
        // Let's prefer English ID if available/simple, otherwise Pinyin or just hashed?
        // Using originalId from HTML which seemed to be English like "Acid_Splash"
        let safeId = originalId.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (!safeId) safeId = `spell_${spellIndex.length}`;

        const fileName = `${safeId}.html`;
        const fullHtml = `<h2>${fullTitle}</h2>\n${spellContent.join('\n')}`;

        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), fullHtml);

        // 5. Add to Index
        spellIndex.push({
            id: safeId,
            title: zhTitle || fullTitle,
            titleEn: enTitle || '',
            fullTitle: fullTitle,
            level: levelNumeric === 0 ? '戏法' : `${levelNumeric}环`,
            levelNumeric: levelNumeric,
            school: school,
            classes: classes,
            path: `spells/${fileName}`,
            source: file // keep track of source file
        });
    });
});

fs.writeFileSync(DATA_OUTPUT, JSON.stringify(spellIndex, null, 2));
console.log(`Processed ${files.length} context files.`);
console.log(`Generated ${spellIndex.length} spells.`);
console.log(`Saved index to ${DATA_OUTPUT}`);
