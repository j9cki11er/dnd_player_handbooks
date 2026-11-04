const expansionCodes = {
    '启封奥秘': 'AU',
    '艾伯伦：奇械锻炉 (EFA)': 'EFA',
    '被遗忘的国度：费伦英雄': 'FRHOF',
    '洛温：初光 (LFL)': 'LFL',
    '鸦阁魔域：魔障深藏': 'RHW',
    '瓦罗怪物指南 (VGM)': 'VGM',
    '珊娜萨的万事指南 (XGE)': 'XGE',
    '城主指南：魔法物品 (DMG 2024)': 'DMG 2024'
};

const magicItemGuide = '城主指南：魔法物品 (DMG 2024)';

export const EXPANSION_TITLES = [
    ...Object.keys(expansionCodes).filter(title => title !== magicItemGuide)
        .sort((a, b) => expansionCodes[a].localeCompare(expansionCodes[b])),
    magicItemGuide
];
export const isExpansionBook = title => Object.hasOwn(expansionCodes, title);
export const expansionCode = title => isExpansionBook(title) ? expansionCodes[title] : '';
export const expansionLabel = title => {
    const code = expansionCode(title);
    if (!code) return title;
    const suffix = ` (${code})`;
    const name = title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
    return `${code} ${name}`;
};

const sectionCodes = { 职业: 'class', 子职: 'subclass', 种族: 'species', 背景: 'background', 专长: 'feat' };
export const EXPANSION_ROLE_SECTIONS = Object.keys(sectionCodes);
export const expansionSectionCode = label => sectionCodes[label];

export function expansionSections(root, feats) {
    const sections = new Map([...EXPANSION_ROLE_SECTIONS, '内容'].map(name => [name, []]));
    const book = root._path[0];
    const bookFeats = feats.filter(feat => feat.pathParts?.[0] === book);
    const splitFeatSources = new Set(bookFeats.map(feat => feat.originalSource).filter(Boolean));
    const groups = { 职业: '职业', 子职: '子职', 种族: '种族', 玩家可用种族: '种族', 背景: '背景', 专长: '专长' };

    function collect(node, group) {
        if (node._selfFile) sections.get('内容').push(node._selfFile);
        const files = node._files.filter(file => !file.isOverview);
        for (const file of files) {
            if (!splitFeatSources.has(file.originalSource)) sections.get(group).push(file);
        }
        for (const child of Object.values(node._children)) collect(child, group);
    }

    function addDirectory(node) {
        sections.get('内容').push({ id: node._id, title: node._title, pathParts: node._path, isDir: true });
    }

    for (const file of root._files) {
        if (!file.isOverview) sections.get('内容').push(file);
    }
    for (const [name, node] of Object.entries(root._children)) {
        if (name === '角色选项') {
            if (node._selfFile) sections.get('内容').push(node._selfFile);
            sections.get('内容').push(...node._files.filter(file => !file.isOverview));
            for (const [option, child] of Object.entries(node._children)) {
                if (Object.hasOwn(groups, option)) collect(child, groups[option]);
                else if (expansionCode(book) === 'XGE' && child._selfFile && child._selfFile.title === option) {
                    collect(child, '子职');
                } else addDirectory(child);
            }
        } else if (Object.hasOwn(groups, name)) collect(node, groups[name]);
        else if (expansionCode(book) === 'EFA' && name === '奇械师') {
            if (node._selfFile) sections.get('职业').push(node._selfFile);
            for (const file of node._files.filter(file => !file.isOverview)) {
                sections.get(file.title.includes('法术列表') ? '内容' : '子职').push(file);
            }
        } else addDirectory(node);
    }
    sections.get('专长').push(...bookFeats);
    return [...sections].filter(([, items]) => items.length);
}
