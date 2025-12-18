import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spellsJsonPath = path.join(__dirname, '../src/data-spells.json');
const contentDir = path.join(__dirname, '../public/content/');

async function extractMetadata() {
    console.log('Reading data-spells.json...');
    const spells = JSON.parse(fs.readFileSync(spellsJsonPath, 'utf8'));

    let updatedCount = 0;
    let errorCount = 0;

    for (const spell of spells) {
        const htmlPath = path.join(contentDir, spell.path);
        if (!fs.existsSync(htmlPath)) {
            console.warn(`File not found: ${htmlPath}`);
            errorCount++;
            continue;
        }

        const html = fs.readFileSync(htmlPath, 'utf8');

        // Simple regex extraction based on the observed HTML structure:
        // <STRONG>施法时间：</STRONG>动作<BR>
        // <STRONG>施法距离：</STRONG>60 尺<BR>
        // <STRONG>法术成分：</STRONG>V、S<BR>
        // <STRONG>持续时间：</STRONG>立即<BR>

        const castingTimeMatch = html.match(/<STRONG>施法时间：<\/STRONG>(.*?)<BR>/i);
        const rangeMatch = html.match(/<STRONG>施法距离：<\/STRONG>(.*?)<BR>/i);
        const componentsMatch = html.match(/<STRONG>法术成分：<\/STRONG>(.*?)<BR>/i);
        const durationMatch = html.match(/<STRONG>持续时间：<\/STRONG>(.*?)<BR>/i);

        if (castingTimeMatch) spell.castingTime = castingTimeMatch[1].trim();
        if (rangeMatch) spell.range = rangeMatch[1].trim();
        if (componentsMatch) spell.components = componentsMatch[1].trim();
        if (durationMatch) spell.duration = durationMatch[1].trim();

        updatedCount++;
    }

    console.log(`Updated ${updatedCount} spells, encountered ${errorCount} errors.`);
    fs.writeFileSync(spellsJsonPath, JSON.stringify(spells, null, 2));
    console.log('Written updated data-spells.json');
}

extractMetadata().catch(err => {
    console.error('Error during extraction:', err);
    process.exit(1);
});
