function layoutGroupedRollTable(table, rows, labels) {
    if (labels.length !== 3 || !/^\d*d\d+$/i.test(labels[1])) return;
    const groups = [];
    for (let start = 1; start < rows.length;) {
        const category = rows[start].cells[0];
        const count = category?.rowSpan;
        if (!(count > 1) || start + count > rows.length) return;
        const groupRows = rows.slice(start, start + count);
        if (!groupRows.every((row, index) =>
            row.cells.length === (index === 0 ? 3 : 2) &&
            Array.from(row.cells).every((cell, column) =>
                cell.colSpan === 1 && ((index === 0 && column === 0) || cell.rowSpan === 1)
            )
        )) return;
        groups.push({ category, rows: groupRows });
        start += count;
    }
    if (groups.length < 2) return;

    const document = table.ownerDocument;
    const grid = document.createElement('div');
    grid.className = 'grouped-roll-grid';
    for (const group of groups) {
        const card = document.createElement('div');
        const groupTable = document.createElement('table');
        const caption = groupTable.createCaption();
        caption.append(...group.category.childNodes);
        const header = groupTable.createTHead().insertRow();
        for (const label of labels.slice(1)) {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = label;
            header.append(cell);
        }
        const body = groupTable.createTBody();
        group.category.remove();
        body.append(...group.rows);
        card.append(groupTable);
        grid.append(card);
    }
    table.replaceWith(grid);
}

// Scale and offset measured from each illustration’s visible alpha bounds.
const conditionArtCrop = {
    Blinded: [1.2470, '-3.32%', '1.86%'],
    Charmed: [1.1531, '-0.28%', '0.96%'],
    Deafened: [1.1602, '-7.02%', '4.19%'],
    Exhaustion: [1.1142, '-4.27%', '-5.77%'],
    Frightened: [1.3391, '6.21%', '0.62%'],
    Grappled: [1.0196, '-3.88%', '-3.14%'],
    Incapacitated: [1.1948, '-0.58%', '11.06%'],
    Invisible: [1.3967, '9.17%', '-1.47%'],
    Paralyzed: [1.7098, '0.00%', '23.04%'],
    Petrified: [1.2047, '-2.88%', '4.47%'],
    Poisoned: [1.1850, '-1.97%', '5.79%'],
    Prone: [1.0124, '-0.32%', '0.22%'],
    Restrained: [1.2315, '10.22%', '2.77%'],
    Stunned: [1.1717, '0.17%', '5.49%'],
    Unconscious: [1.0168, '0.32%', '-2.76%']
};

function layoutConditionCards(document) {
    const overview = document.getElementById('Condition');
    if (!overview) return;

    const headings = Array.from(document.body.querySelectorAll('h3[id]'))
        .filter(heading => heading.textContent.trim().endsWith('【状态】'));
    if (!headings.length) return;

    const grid = document.createElement('div');
    grid.className = 'condition-grid';
    headings[0].before(grid);

    const names = new Set();
    for (const heading of headings) {
        const card = document.createElement('article');
        card.className = 'condition-card';
        card.setAttribute('aria-labelledby', heading.id);

        const image = document.createElement('img');
        image.className = 'condition-card-art';
        image.src = `/condition/${heading.id}.webp`;
        image.width = 2048;
        image.height = 2048;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.alt = '';

        const art = document.createElement('div');
        art.className = 'condition-art-frame';
        const crop = conditionArtCrop[heading.id];
        if (crop) {
            const [scale, x, y] = crop;
            art.style.setProperty('--art-scale', scale);
            art.style.setProperty('--art-x', x);
            art.style.setProperty('--art-y', y);
        }
        art.append(image);

        const body = document.createElement('div');
        body.className = 'condition-card-body';
        const content = [];
        for (let node = heading.nextSibling; node && !/^H[1-6]$/.test(node.nodeName); node = node.nextSibling) {
            content.push(node);
        }
        const titleEn = document.createElement('small');
        titleEn.textContent = heading.id;
        heading.textContent = heading.textContent.trim().split(/\s/)[0];
        heading.append(titleEn);
        names.add(heading.firstChild.textContent);
        body.append(...content);

        const header = document.createElement('div');
        header.className = 'condition-card-header';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'condition-card-toggle';
        toggle.setAttribute('aria-label', heading.firstChild.textContent);
        toggle.setAttribute('aria-haspopup', 'dialog');
        header.append(art, heading, toggle);
        card.append(header, body);
        grid.append(card);
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'condition-dialog';
    dialog.setAttribute('aria-labelledby', 'condition-dialog-title');
    dialog.innerHTML = '<form method="dialog"><h3 id="condition-dialog-title"></h3><button type="submit" aria-label="关闭">×</button></form><div class="condition-dialog-art"></div><div class="condition-dialog-rules"></div>';
    grid.after(dialog);

    const index = Array.from(document.body.querySelectorAll('table')).find(table => {
        const cells = Array.from(table.querySelectorAll('td'));
        return cells.length === names.size && cells.every(cell => names.has(cell.textContent.trim()));
    });
    index?.remove();
}

// Legacy CHM pages carry presentational colors that conflict with app themes.
export function prepareContent(html) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const probe = document.createElement('span');
    const isBlack = value => {
        probe.style.color = '';
        probe.style.color = value;
        return ['black', 'rgb(0, 0, 0)'].includes(probe.style.color.toLowerCase());
    };
    const themeColors = {
        'white': '--text-primary',
        'rgb(255, 255, 255)': '--text-primary',
        'rgb(128, 128, 128)': '--text-muted',
        'rgb(0, 128, 0)': '--content-green',
        'rgb(0, 128, 128)': '--content-green',
        'rgb(0, 0, 128)': '--content-blue',
        'rgb(0, 0, 255)': '--content-blue',
        'rgb(255, 0, 0)': '--content-red',
        'rgb(128, 0, 0)': '--content-red'
    };
    for (const element of document.body.querySelectorAll('[color], [style], [bgcolor]')) {
        if (element.hasAttribute('color') && isBlack(element.getAttribute('color'))) element.removeAttribute('color');
        const weight = element.style.fontWeight;
        if (weight && weight !== '300' && weight !== '400') {
            element.style.setProperty('font-weight', '400', element.style.getPropertyPriority('font-weight'));
        }
        if (isBlack(element.style.color)) element.style.removeProperty('color');
        probe.style.color = '';
        probe.style.color = element.style.color || element.getAttribute('color') || '';
        const token = themeColors[probe.style.color];
        if (token) {
            element.removeAttribute('color');
            element.style.setProperty('color', `var(${token})`, 'important');
        }
        element.removeAttribute('bgcolor');
        const legacyCallout = element.matches('div.center') && Boolean(element.style.backgroundColor);
        if (legacyCallout) element.classList.add('content-callout');
        if (element.closest('table') || legacyCallout) {
            element.style.removeProperty('background');
            element.style.removeProperty('background-color');
        }
    }
    // Some CHM pages incorrectly nest whole tables inside headings.
    for (const heading of document.body.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
        let anchor = heading;
        for (const table of Array.from(heading.querySelectorAll('table'))) {
            if (!heading.contains(table)) continue;
            anchor.after(table);
            anchor = table;
        }
    }
    for (const table of document.body.querySelectorAll('table')) {
        const rows = Array.from(table.rows);
        const labels = Array.from(rows[0]?.cells || []).map(cell => cell.textContent.trim());
        if (labels.join('|') !== '名称|伤害|词条|精通|重量|价格') {
            layoutGroupedRollTable(table, rows, labels);
            continue;
        }
        table.classList.add('weapon-reference-table');
        table.style.removeProperty('width');
        const head = document.createElement('thead');
        const firstRow = rows[0];
        for (const cell of Array.from(firstRow.cells)) {
            const th = document.createElement('th');
            th.scope = 'col'; th.textContent = cell.textContent.trim();
            cell.replaceWith(th);
        }
        head.append(firstRow); table.prepend(head);
        let alternate = false;
        for (const row of rows.slice(1)) {
            if (row.cells.length === 1 && row.cells[0].colSpan > 1) {
                row.classList.add('weapon-group-heading');
                alternate = false;
                continue;
            }
            row.classList.add(alternate ? 'weapon-row-alt' : 'weapon-row');
            alternate = !alternate;
            const name = row.cells[0];
            const bilingual = name.textContent.trim().match(/^([^A-Za-z]+)\s*([A-Za-z].*)$/s);
            if (bilingual) {
                name.textContent = '';
                const zh = document.createElement('span'), en = document.createElement('small');
                zh.className = 'weapon-name-zh'; zh.textContent = bilingual[1].trim();
                en.className = 'weapon-name-en'; en.textContent = bilingual[2].trim();
                name.append(zh, en);
            }
        }
        const scroll = document.createElement('div');
        scroll.className = 'weapon-reference-scroll';
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', '武器表，可横向滚动');
        scroll.tabIndex = 0;
        table.before(scroll); scroll.append(table);
    }
    layoutConditionCards(document);
    return document.body.innerHTML;
}

export async function loadContent(path, signal) {
    const response = await fetch(`/content/${path}`, { signal });
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    const html = await response.text();
    // Vite serves the app shell for missing HTML paths with a successful status.
    if (/<div\b[^>]*\bid=["']root["']/i.test(html)) throw new Error('Content page not found');
    return prepareContent(html);
}
