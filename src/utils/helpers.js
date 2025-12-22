export const parseCR = (cr) => {
    if (!cr || cr === 'Unknown') return 999;
    if (cr === '1/8') return 0.125;
    if (cr === '1/4') return 0.25;
    if (cr === '1/2') return 0.5;
    const num = parseFloat(cr);
    return isNaN(num) ? 999 : num;
};

export const resolveBookmarkItem = (id, { categoryTree, spellData, featData, masteryData, data }) => {
    if (id.startsWith('dir:')) {
        const pathStr = id.replace('dir:', '');
        const parts = pathStr.split('/');
        let current = categoryTree;
        let node = null;
        for (const part of parts) {
            if (current && current[part]) {
                node = current[part];
                current = current[part]._children;
            } else {
                return null;
            }
        }
        if (!node) return null;
        return {
            id: node._id,
            title: node._title,
            pathParts: node._path,
            isDir: true,
            path: node._selfFile?.path
        };
    }
    // Check if it's a spell first for better matching
    const spell = spellData.find(s => s.id === id);
    if (spell) {
        return {
            ...spell,
            pathParts: spell.pathParts || ['法术']
        };
    }
    // Then check feats
    const feat = featData.find(f => f.id === id);
    if (feat) {
        return {
            ...feat,
            pathParts: ['第五章：专长', feat.category]
        };
    }

    // Then check masteries
    const mastery = masteryData.find(m => m.id === id);
    if (mastery) {
        return {
            ...mastery,
            pathParts: ['第六章：装备', '精通词条']
        };
    }

    // Then check files
    const file = data.find(i => i.id === id);
    if (file) return file;
    return null;
};
