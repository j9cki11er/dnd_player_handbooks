import { catalogArmor } from './armor.js';
import { catalogWeapons } from './weapons.js';
import gearData from '../data-gear.json' with { type: 'json' };
export const parseCR = (cr) => {
    if (!cr || cr === 'Unknown') return 999;
    if (cr === '1/8') return 0.125;
    if (cr === '1/4') return 0.25;
    if (cr === '1/2') return 0.5;
    const num = parseFloat(cr);
    return isNaN(num) ? 999 : num;
};

export const resolveBookmarkItem = (id, { categoryTree, spellData, featData, masteryData, invocationData = [], data }) => {
    // Resolve bookmarks exported before the VGM directory was renamed.
    id = id.replace('瓦罗怪物指南 (MPMM)', '瓦罗怪物指南 (VGM)');
    if (id.startsWith('dir:')) {
        const pathStr = id.replace('dir:', '').replace(/^第二章：创建角色\/创建你的角色(?=\/|$)/, '第二章：创建角色');
        const appendix = '附录 B：生物数据卡';
        // Fractional CR labels contain a slash within a single directory name.
        const parts = pathStr === appendix + '/CR0-CR1/4'
            ? [appendix]
            : pathStr.startsWith(appendix + '/')
            ? [appendix, pathStr.slice(appendix.length + 1)]
            : pathStr.split('/');
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
    const armor = catalogArmor.find(item => item.id === id);
    if (armor) return armor;
    const weapon = catalogWeapons.find(item => item.id === id);
    if (weapon) return weapon;
    const gear = gearData.find(item => item.id === id);
    if (gear) return { ...gear, pathParts: ['物品', '装备'] };
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
            pathParts: feat.pathParts || ['第五章：专长', feat.category]
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

    const invocation = invocationData.find(item => item.id === id);
    if (invocation) return { ...invocation, pathParts: ['第三章：角色职业', '魔契师', '魔能祈唤'] };

    // Then check files
    const file = data.find(i => i.id === id);
    if (file) {
        if (file.pathParts?.[0] === '第二章：创建角色' && file.pathParts[1] === '创建你的角色') {
            return { ...file, pathParts: ['第二章：创建角色', ...file.pathParts.slice(2)] };
        }
        return file;
    }
    return null;
};
