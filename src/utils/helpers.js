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

export const CR0_WHITELIST = [
    "獾", "蝙蝠", "猫", "蟹", "蛙", "山羊", "隼", "章鱼", "猫头鹰", "蜥蜴", "鼠", "渡鸦", "蝎", "蜘蛛", "鼬", "骆驼", "巨蟹", "巨鼬", "獒犬", "骡", "矮种马", "毒蛇", "野猪", "蟒蛇", "驮用马", "赤鹿", "巨獾", "豹", "乘用马", "狼"
];

export const CR1_2_WHITELIST = [
    "猿", "黑熊", "鳄鱼", "巨山羊", "巨海马", "礁鲨", "战马"
];

export const CR1_WHITELIST = [
    "棕熊", "恐狼", "巨蜘蛛", "狮子", "虎"
];

export const CR4_WHITELIST = [
    "象"
];
