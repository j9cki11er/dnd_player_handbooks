import weapons from '../data-weapons.json' with { type: 'json' };
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const catalogWeapons = weapons.map(item => {
    const [, amount, currency] = item.cost.match(/([\d,.]+)\s*(CP|SP|GP|PP)/) || [];
    const price = Number(amount?.replaceAll(',', '')) * ({ CP: 0.01, SP: 0.1, GP: 1, PP: 10 }[currency] || 1);
    return { ...item, id: `weapon:${item.id}`, pricesGP: [price], pathParts: ['物品', '武器'], descriptionHtml: `<dl>${[['类别',item.category],['伤害',item.damage],['词条',item.properties],['精通',item.mastery],['重量',item.weight],['价格',item.cost]].map(([label,value]) => `<dt><strong>${escape(label)}</strong></dt><dd>${escape(value)}</dd>`).join('')}</dl>` };
});
