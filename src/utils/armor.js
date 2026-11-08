import armor from '../data-armor.json' with { type: 'json' };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const catalogArmor = armor.map(source => {
    const item = { ...source, armorClass: source.armorClass.replaceAll('敏捷调整值', '敏捷') };
    return ({
    ...item,
    descriptionHtml: `<dl>${[['类别', item.category], ['护甲等级（AC）', item.armorClass], ['力量要求', item.strength], ['隐匿', item.stealth], ['重量', item.weight], ['价格', item.cost], ['穿脱时间', item.donDoff]].map(([label, value]) => `<dt><strong>${escape(label)}</strong></dt><dd>${escape(value)}</dd>`).join('')}</dl>`,
    });
});
