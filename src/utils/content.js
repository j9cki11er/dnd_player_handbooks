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
        'rgb(0, 128, 0)': '--content-green',
        'rgb(0, 128, 128)': '--content-green',
        'rgb(0, 0, 128)': '--content-blue',
        'rgb(0, 0, 255)': '--content-blue',
        'rgb(255, 0, 0)': '--content-red',
        'rgb(128, 0, 0)': '--content-red'
    };
    for (const element of document.body.querySelectorAll('[color], [style], [bgcolor]')) {
        if (element.hasAttribute('color') && isBlack(element.getAttribute('color'))) element.removeAttribute('color');
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
