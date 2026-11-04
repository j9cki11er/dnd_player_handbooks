// Metadata is extracted from HTML; list previews should never display raw tags.
export function spellText(value = '') {
    return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}
export function summarizeComponents(value) {
    const text = spellText(value || 'V、S');
    const base = text.split(/[（(]/)[0].trim().replace(/\s*[,、]\s*/g, '、');
    const prices = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(\+)?\s*GP\s*(\+)?/gi)]
        .map(([, amount, before, after]) => `${amount}${before || after ? '+' : ''} GP`);
    const summary = prices.length && /M/i.test(base)
        ? `${base}（${[...new Set(prices)].join('、')}）`
        : base;
    return { text, summary, hasDetails: summary !== text };
}

export function summarizeDuration(value) {
    const text = spellText(value || '瞬时');
    const concentration = text.includes('专注');
    const duration = text.replace(/专注|至多|最多/g, '').replace(/^[，,、\s]+|[，,、\s]+$/g, '')
        .replace(/一\s*(?=分钟|小时)/g, '1')
        .replace(/(\d+)\s*分钟/g, '$1Min')
        .replace(/(\d+)\s*(?:个\s*)?小时/g, '$1Hr')
        .replace(/(\d+)\s*(轮|日|天)/g, '$1$2');
    return concentration ? `C ${duration}`.trim() : duration;
}

// Split only the leading rules block. Keep any unfamiliar markup in the body.
export function splitSpellDetails(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const fields = {};
    const labels = { 施法时间: 'castingTime', 施法距离: 'range', 法术成分: 'components', 持续时间: 'duration' };
    const paragraph = template.content.firstElementChild;
    if (paragraph?.tagName !== 'P') return { html, fields };

    const classification = paragraph.firstElementChild;
    const hasClassification = classification?.matches('em, i')
        && /戏法|[一二三四五六七八九1-9]环/.test(classification.textContent)
        && !/施法时间|施法距离|法术成分|持续时间/.test(classification.textContent);
    if (hasClassification) classification.remove();

    const legacy = hasClassification && paragraph.firstElementChild?.textContent.trim() === 'Legacy'
        ? paragraph.firstElementChild
        : null;
    legacy?.remove();

    let line = [];
    // A paragraph end can also terminate the last metadata line.
    for (const node of [...paragraph.childNodes, null]) {
        if (node && node.nodeName !== 'BR') {
            line.push(node);
            continue;
        }
        const value = line.map(part => part.textContent).join('').replace(/\s+/g, ' ').trim();
        const match = value.match(/^(施法时间|施法距离|法术成分|持续时间)\s*[：:]\s*(.+)$/);
        const closingClassification = hasClassification && !Object.keys(fields).length && /^[）)]$/.test(value);
        if (value && !match && !closingClassification) break;
        if (match) fields[labels[match[1]]] = match[2];
        line.forEach(part => part.remove());
        node?.remove();
        line = [];
    }

    if (legacy) paragraph.before(legacy);
    if (!paragraph.textContent.trim() && !paragraph.firstElementChild) paragraph.remove();
    return { html: template.innerHTML, fields };
}


export const isHandbookSpell = spell => /^[0-9]环\.html$/.test(spell.source);

export const isListedSpell = spell => isHandbookSpell(spell) || (spell.sourceBook || spell.source) === 'EFA';

export function spellBookLabel(spell) {
    if (isHandbookSpell(spell)) return '';
    const books = {
        EFA: '艾伯伦：奇械锻炉',
        XGE: '珊娜萨的万事指南',
        FRHF: '被遗忘的国度：费伦英雄',
        AU: '启封奥秘',
    };
    return books[spell.sourceBook || spell.source] || spell.sourceBook || spell.source;
}

// Keep the handbook's physical and mental abilities in two side-by-side tables.
export function formatCreatureBlocks(html, { expanded = false } = {}) {
    if (!html.includes('stat-block')) return { html, hasCreatures: false };
    const template = document.createElement('template');
    template.innerHTML = html;
    const creatures = template.content.querySelectorAll('.stat-block');
    for (const creature of creatures) {
        creature.classList.add('spell-creature-card');
        const disclosure = document.createElement('details');
        disclosure.className = 'spell-creature-disclosure';
        disclosure.open = expanded;
        const summary = document.createElement('summary');
        summary.textContent = creature.querySelector('h5')?.textContent.trim().replace(/\s+/g, ' ') || '生物数据';
        creature.before(disclosure);
        disclosure.append(summary, creature);

        const abilities = creature.querySelector('.stat-abilities');
        if (!abilities || abilities.rows.length !== 3) continue;
        const groups = Array.from(abilities.rows).slice(1).flatMap(row => {
            const cells = Array.from(row.cells).filter(cell => cell.textContent.trim());
            if (cells.length !== 12) return [];
            return [cells.slice(0, 4), cells.slice(4, 8), cells.slice(8, 12)];
        });
        if (groups.length !== 6) continue;

        const layout = document.createElement('div');
        layout.className = 'spell-creature-abilities';
        for (const [label, entries] of [
            ['体能属性', [groups[0], groups[1], groups[2]]],
            ['心智能力', [groups[3], groups[4], groups[5]]],
        ]) {
            const table = document.createElement('table');
            table.setAttribute('aria-label', label);
            const header = table.createTHead().insertRow();
            for (const title of ['属性', '数值', '调整', '豁免']) {
                const cell = document.createElement('th');
                cell.scope = 'col';
                cell.textContent = title;
                header.append(cell);
            }
            const body = table.createTBody();
            for (const cells of entries) {
                const row = body.insertRow();
                cells.forEach((source, index) => {
                    const cell = document.createElement(index === 0 ? 'th' : 'td');
                    if (index === 0) cell.scope = 'row';
                    cell.textContent = source.textContent.trim();
                    row.append(cell);
                });
            }
            layout.append(table);
        }
        abilities.replaceWith(layout);
    }
    return { html: template.innerHTML, hasCreatures: creatures.length > 0 };
}
