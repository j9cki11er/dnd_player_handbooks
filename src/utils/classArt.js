import crops from '../data-class-art.json' with { type: 'json' };

export function classArt(name) {
    const title = name?.replace(/（EFA）$/, '').trim();
    const crop = crops[title];
    return crop ? {
        src: `/classes/${title}.webp`,
        style: { '--art-scale': crop.scale, '--art-x': crop.x, '--art-y': crop.y },
    } : null;
}

export function itemClassArt(item) {
    const parts = item?.pathParts || [];
    const isClass = parts.some(part => /角色职业|角色选项|职业/.test(part))
        || (parts[0] === '艾伯伦：奇械锻炉 (EFA)' && parts[1] === '奇械师');
    return isClass ? classArt(item.title) : null;
}
