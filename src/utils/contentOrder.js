// Reading order is shared by the sidebar, directory cards and source generator.
const chapterOrders = {
    '城主指南：魔法物品 (DMG 2024)': ['使用与制造', '物品图鉴'],
    '城主指南：魔法物品 (DMG 2024)/使用与制造': ['制造魔法物品', '魔法物品的类别', '魔法物品的稀有度', '激活魔法物品', '魔法物品的耐久', '诅咒物品', '“下个黎明”'],
    '珊娜萨的万事指南 (XGE)': ['角色选项', '工具', '休整期活动', '补充规则', '角色姓名'],
    '被遗忘的国度：费伦英雄': ['角色选项', '装备', '施法规则'],
    '鸦阁魔域：魔障深藏': ['角色选项'],
    '启封奥秘': ['角色选项', '魔法物品'],
    '艾伯伦：奇械锻炉 (EFA)': ['奇械师', '角色选项', '魔法物品'],
    '艾伯伦：奇械锻炉 (EFA)/奇械师': ['奇械师', '炼金师', '装甲师', '魔炮师', '战地匠师', '制图师', '奇械师法术列表', '法术'],
    '艾伯伦：奇械锻炉 (EFA)/角色选项': ['背景', '种族', '龙纹', '专长'],
    '艾伯伦：奇械锻炉 (EFA)/角色选项/专长': ['龙纹专长', '通用专长', '传奇恩惠专长', '传奇恩惠'],
    '序章：欢迎来到冒险世界': ['序章：欢迎来到冒险世界', '充满冒险的世界', '你需要什么', '使用本书'],
    '第一章：进行游戏': ['玩家还是DM？', '游戏规律', '游戏节奏', '长期游戏', '骰子', '六项属性', 'D20检定', '动作', '交涉', '探索', '战斗', '伤害与治疗', '战斗与伤害案例', '状态'],
    '第一章：进行游戏/D20 检定': ['属性检定', '豁免检定', '攻击检定', '优势/劣势', '熟练'],
    '第一章：进行游戏/动作': ['附赠动作', '反应'],
    '第一章：进行游戏/战斗': ['战斗流程', '移动和位置', '发动攻击', '远程攻击', '近战攻击', '骑乘战斗', '水下战斗'],
    '第一章：进行游戏/探索': ['视野与光照', '躲藏', '与物件交互', '危害', '旅行', '探索案例'],
    '第一章：进行游戏/伤害与治疗': ['生命值', '伤害掷骰', '重击命中', '豁免检定与伤害', '伤害类型', '抗性和易伤', '免疫', '治疗', '生命值降至0点', '临时生命值'],
    '第二章：创建角色': ['第一步：选择职业', '第二步：确定起源', '第三步：确定属性值', '第四步：选择阵营', '第五步：丰富细节', '等级提升', '以更高等级开始', '兼职', '饰品'],
    '第四章：角色起源': ['起源的构成部分', '背景详述', '种族详述'],
    '第五章：专长': ['专长概述', '起源专长', '通用专长', '战斗风格专长', '传奇恩惠专长'],
    '第六章：装备': ['钱币', '武器', '护甲', '工具', '冒险装备', '坐骑与载具', '服务', '魔法物品', '制作装备', '精通词条'],
    '第六章：装备/工具': ['工匠工具', '其他工具'],
    '第七章：法术': ['获得法术', '法术环阶', '魔法学派', '职业法术列表', '施展法术', '施法时间', '施法距离', '法术成分', '持续时间', '法术效应', '法术详述'],
    '附录 A：多元宇宙': ['物质领域', '过渡位面', '内层位面', '外层位面'],
    '附录 C：术语汇编': ['术语速查', '动作', '态度', '状态', '危害', '效应区域', '其他术语']
};
const normalize = value => value.replace(/\s+/g, '');
const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
export function readNumber(value) {
    if (/^\d+$/.test(value)) return Number(value);
    if (value in digits) return digits[value];
    const match = value.match(/^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/);
    return match ? (digits[match[1]] || 1) * 10 + (digits[match[2]] || 0) : null;
}
function numberedTitle(title) {
    let match = title.match(/^第([零〇一二两三四五六七八九十\d]+)(步|章|级|层)/);
    if (match) return { group: match[2], value: readNumber(match[1]) };
    if (/^(戏法|零环|0环)/.test(title)) return { group: '环', value: 0 };
    match = title.match(/^([零〇一二两三四五六七八九十\d]+)环/);
    if (match) return { group: '环', value: readNumber(match[1]) };
    match = title.match(/^CR\s*(\d+)(?:\/(\d+))?/i);
    if (match) return { group: 'CR', value: Number(match[1]) / Number(match[2] || 1) };
    return null;
}
export function compareContentNames(a, b, parentPath = []) {
    const order = chapterOrders[parentPath.join('/')];
    if (order) {
        const rank = title => { const index = order.findIndex(name => normalize(name) === normalize(title)); return index < 0 ? Infinity : index; };
        const left = rank(a), right = rank(b);
        if (left !== right) return left - right;
    }
    if (parentPath.includes('城主指南：魔法物品 (DMG 2024)')) {
        const rarities = ['普通', '非普通', '珍稀', '极珍稀', '传说', '神器', '多种稀有度'];
        const first = rarities.indexOf(a), second = rarities.indexOf(b);
        if (first >= 0 && second >= 0 && first !== second) return first - second;
    }
    const left = numberedTitle(a), right = numberedTitle(b);
    if (left && right && left.group === right.group && left.value !== null && right.value !== null && left.value !== right.value) return left.value - right.value;
    return a.localeCompare(b, 'zh-CN', { numeric: true });
}
export function compareContentItems(a, b, parentPath = []) {
    if (Boolean(a.isOverview) !== Boolean(b.isOverview)) return a.isOverview ? -1 : 1;
    return compareContentNames(a.title, b.title, parentPath);
}
