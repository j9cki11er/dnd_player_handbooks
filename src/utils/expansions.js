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
