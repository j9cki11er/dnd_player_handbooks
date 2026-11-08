import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import data from '../data.json';
import CatalogDialog from './CatalogDialog';
import { gearPriceLabel } from '../utils/gear';
import GearBrowser from './GearBrowser';
import { catalogArmor } from '../utils/armor';
import { catalogWeapons } from '../utils/weapons';

export const magicItems = data.filter(item => item.itemType && item.rarity);
const isLightWeapon = item => item.properties?.includes('轻型');

function weaponWeight(item) {
    const [amount, denominator = 1] = item.weight.replace('磅', '').split('/');
    return Number(amount) / Number(denominator);
}

function CoinPrice({ cost }) {
    const match = cost.match(/^(.+?)\s+(CP|SP|GP)$/);
    if (!match) return cost;

    const [, amount, unit] = match;
    return <span className="weapon-price">{amount}{' '}<span className="weapon-price-unit" data-unit={unit}>{unit}</span></span>;
}

export function CatalogCard({ item, onClick, openBookmarkDialog, isBookmarkedAnywhere }) {
    const saved = isBookmarkedAnywhere?.(item.id);
    if (item.armorClass || item.damage) return <div className="catalog-card glass-panel equipment-card">
        <button className="catalog-open" onClick={onClick} aria-label={`查看${item.title}说明`}>
            <span className="weapon-card-classification equipment-classification"><span className="spell-level-badge">{item.category}</span>{['轻型', '重型'].filter(property => item.properties?.includes(property)).map(property => <strong key={property} className="spell-concentration">{property}</strong>)}</span>
            <span className="equipment-title-row"><strong>{item.title}</strong><small lang="en">{item.titleEn}</small></span>
            <span className="gear-card-meta equipment-meta"><span className="equipment-stats gear-weight">{item.armorClass ? `AC ${item.armorClass}` : item.damage} · {item.weight}</span><span className="gear-price"><CoinPrice cost={item.cost} /></span></span>
        </button>
        <button className={`catalog-save ${saved ? 'saved' : ''}`} aria-label={`收藏${item.title}`} aria-pressed={!!saved} onClick={() => openBookmarkDialog(item)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>;
    return <div className="catalog-card glass-panel">
        <button className="catalog-open" onClick={onClick} aria-label={`查看${item.title}说明`}>
            {(item.damage || item.armorClass) && <span className="weapon-card-classification">
                <strong className="spell-level-badge">{item.category}</strong>
                {['轻型', '重型'].filter(property => item.properties?.includes(property)).map(property => <strong key={property} className="spell-concentration">{property}</strong>)}
            </span>}
            {item.itemType && <span className="weapon-card-classification magic-card-meta">
                <strong className="spell-level-badge">{item.rarity}</strong>
                <span className="gear-weight">{item.itemType}</span>
                {item.requiresAttunement && <strong className="spell-concentration">同调</strong>}
            </span>}
            <span className="catalog-name-row">
                <span className={`gear-name ${item.damage ? '' : 'catalog-name-stacked'}`}>
                    <strong>{item.title}</strong>{item.titleEn && <small lang="en">{item.titleEn}</small>}
                </span>
            </span>
            {!item.itemType && <span className="gear-card-meta">
                <span className="gear-weight">{item.damage ? `${item.damage} · ${item.weight}` : item.armorClass ? `AC ${item.armorClass} · ${item.weight}` : `重量 ${item.weight}`}</span>
                <span className="gear-price"><CoinPrice cost={item.damage ? item.cost : gearPriceLabel(item)} /></span>
            </span>}
        </button>
        <button className={`catalog-save ${saved ? 'saved' : ''}`} aria-label={`收藏${item.title}`} aria-pressed={!!saved} onClick={() => openBookmarkDialog(item)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>;
}
export function MagicBrowser({ openBookmarkDialog, isBookmarkedAnywhere, initialType = '', initialRarity = '普通', initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery), [type, setType] = useState(initialType), [rarity, setRarity] = useState(initialRarity), [attunement, setAttunement] = useState('');
    const [sort, setSort] = useState('rarity');
    const [selected, setSelected] = useState(null);
    const rarities = ['普通', '非普通', '珍稀', '极珍稀', '传说', '神器', '多种稀有度'];
    const items = magicItems.filter(item => (!type || item.itemType === type) && (!rarity || item.rarity === rarity) && (!attunement || item.requiresAttunement === (attunement === 'yes')) && `${item.title} ${item.titleEn}`.toLowerCase().includes(query.trim().toLowerCase()));
    const rarityOrder = (a, b) => rarities.indexOf(a.rarity) - rarities.indexOf(b.rarity);
    const typeOrder = (a, b) => a.itemType.localeCompare(b.itemType, 'zh-CN');
    const nameOrder = (a, b) => (a.titleEn || a.title).localeCompare(b.titleEn || b.title);
    items.sort((a, b) => {
        if (sort === 'name') return nameOrder(a, b);
        if (sort === 'type') return typeOrder(a, b) || rarityOrder(a, b) || nameOrder(a, b);
        return rarityOrder(a, b) || typeOrder(a, b) || nameOrder(a, b);
    });
    return <section className="gear-browser" aria-label="魔法物品图鉴"><header className="gear-browser-header"><h2>魔法物品 <span>Magic Items</span></h2><p>按类别与稀有度查找 · 点击查看说明，爱心保存到收藏。</p></header>
        <div className="gear-filters unified-filter-bar">
            <select aria-label="物品类别" value={type} onChange={e => setType(e.target.value)}><option value="">全部类别</option>{[...new Set(magicItems.map(i => i.itemType))].sort().map(t => <option key={t}>{t}</option>)}</select>
            <select aria-label="物品稀有度" value={rarity} onChange={e => setRarity(e.target.value)}><option value="">全部稀有度</option>{rarities.map(r => <option key={r}>{r}</option>)}</select>
            <select aria-label="同调要求" value={attunement} onChange={e => setAttunement(e.target.value)}><option value="">全部同调</option><option value="yes">需同调</option><option value="no">无需同调</option></select>
            <select aria-label="魔法物品排序" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="rarity">按稀有度</option><option value="type">按类别</option><option value="name">按英文名称</option>
            </select>
            <label className="gear-search"><input aria-label="搜索魔法物品" placeholder="搜索名称 / English" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="gear-reset" onClick={() => { setQuery(''); setType(initialType); setRarity(initialRarity); setAttunement(''); setSort('rarity'); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {magicItems.length} 件魔法物品</p><ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} {...{openBookmarkDialog, isBookmarkedAnywhere}} /></li>)}</ul>{!items.length && <p className="gear-empty">没有符合条件的物品。</p>}{selected && <CatalogDialog item={selected} onClose={() => setSelected(null)} />}
    </section>;
}
export function WeaponBrowser({ openBookmarkDialog, isBookmarkedAnywhere, initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery), [category, setCategory] = useState(''), [mastery, setMastery] = useState('');
    const [sort, setSort] = useState('category');
    const [lightOnly, setLightOnly] = useState(false);
    const [priceRange, setPriceRange] = useState('');
    const [selected, setSelected] = useState(null);
    const items = catalogWeapons.filter(item => (!category || item.category === category) && (!mastery || item.mastery === mastery) && (!lightOnly || isLightWeapon(item)) && (!priceRange || item.pricesGP[0] <= 50) && `${item.title} ${item.titleEn} ${item.properties}`.toLowerCase().includes(query.trim().toLowerCase()));
    // The source table already follows the handbook's category order.
    if (sort === 'mastery') {
        items.sort((a, b) => a.mastery.localeCompare(b.mastery, 'zh-CN'));
    } else if (sort === 'price-asc') {
        items.sort((a, b) => a.pricesGP[0] - b.pricesGP[0]);
    } else if (sort === 'price-desc') {
        items.sort((a, b) => b.pricesGP[0] - a.pricesGP[0]);
    } else if (sort.startsWith('weight-')) {
        const direction = sort === 'weight-asc' ? 1 : -1;
        items.sort((a, b) => {
            const first = weaponWeight(a);
            const second = weaponWeight(b);
            if (Number.isNaN(first)) return Number.isNaN(second) ? 0 : 1;
            if (Number.isNaN(second)) return -1;
            return (first - second) * direction;
        });
    }
    return <section className="gear-browser" aria-label="武器图鉴"><header className="gear-browser-header"><h2>武器 <span>Weapons</span></h2><p>按武器类别与精通筛选 · 点击查看伤害、词条及价格，爱心保存到收藏。</p></header>
        <div className="gear-filters unified-filter-bar">
            <select aria-label="武器类别" value={category} onChange={e => setCategory(e.target.value)}><option value="">全部类别</option>{[...new Set(catalogWeapons.map(i => i.category))].map(c => <option key={c}>{c}</option>)}</select>
            <select aria-label="武器精通" value={mastery} onChange={e => setMastery(e.target.value)}><option value="">全部精通</option>{[...new Set(catalogWeapons.map(i => i.mastery))].map(m => <option key={m}>{m}</option>)}</select>
            <select aria-label="武器排序" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="category">按类别</option>
                <option value="mastery">按精通</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
                <option value="weight-asc">重量从轻到重</option>
                <option value="weight-desc">重量从重到轻</option>
            </select>
            <select aria-label="武器价格范围" value={priceRange} onChange={e => setPriceRange(e.target.value)}>
                <option value="">全部价格</option><option value="0-50">0–50 GP</option>
            </select>
            <label className="spell-ritual-filter"><input type="checkbox" checked={lightOnly} onChange={e => setLightOnly(e.target.checked)} />轻型</label>
            <label className="gear-search"><input aria-label="搜索武器" placeholder="搜索名称 / English / 词条" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="gear-reset" onClick={() => { setQuery(''); setCategory(''); setMastery(''); setSort('category'); setPriceRange(''); setLightOnly(false); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {catalogWeapons.length} 件武器</p><ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} {...{openBookmarkDialog, isBookmarkedAnywhere}} /></li>)}</ul>{!items.length && <p className="gear-empty">没有符合条件的武器。</p>}{selected && <CatalogDialog item={selected} onClose={() => setSelected(null)} />}
    </section>;
}
export function ArmorBrowser({ openBookmarkDialog, isBookmarkedAnywhere, initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState('');
    const [sort, setSort] = useState('category');
    const [stealth, setStealth] = useState('');
    const [selected, setSelected] = useState(null);
    const items = catalogArmor.filter(item => (!category || item.category === category)
        && (!stealth || (item.stealth === '劣势') === (stealth === 'disadvantage'))
        && `${item.title} ${item.titleEn} ${item.armorClass}`.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort.startsWith('price-')) items.sort((a, b) => (a.pricesGP[0] - b.pricesGP[0]) * (sort === 'price-asc' ? 1 : -1));
    if (sort.startsWith('weight-')) items.sort((a, b) => (weaponWeight(a) - weaponWeight(b)) * (sort === 'weight-asc' ? 1 : -1));
    return <section className="gear-browser" aria-label="护甲图鉴">
        <header className="gear-browser-header"><h2>护甲 <span>Armor</span></h2><p>按护甲类别与隐匿影响筛选 · 点击查看护甲等级、穿脱时间及价格，爱心保存到收藏。</p></header>
        <div className="gear-filters unified-filter-bar">
            <select aria-label="护甲类别" value={category} onChange={e => setCategory(e.target.value)}><option value="">全部类别</option>{[...new Set(catalogArmor.map(item => item.category))].map(value => <option key={value}>{value}</option>)}</select>
            <select aria-label="护甲隐匿影响" value={stealth} onChange={e => setStealth(e.target.value)}><option value="">全部隐匿影响</option><option value="none">无隐匿劣势</option><option value="disadvantage">隐匿劣势</option></select>
            <select aria-label="护甲排序" value={sort} onChange={e => setSort(e.target.value)}><option value="category">按类别</option><option value="price-asc">价格从低到高</option><option value="price-desc">价格从高到低</option><option value="weight-asc">重量从轻到重</option><option value="weight-desc">重量从重到轻</option></select>
            <label className="gear-search"><input aria-label="搜索护甲" placeholder="搜索名称 / English / AC" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="gear-reset" onClick={() => { setQuery(''); setCategory(''); setStealth(''); setSort('category'); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {catalogArmor.length} 件护甲</p>
        <ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} {...{openBookmarkDialog, isBookmarkedAnywhere}} /></li>)}</ul>
        {!items.length && <p className="gear-empty">没有符合条件的护甲。</p>}
        {selected && <CatalogDialog item={selected} onClose={() => setSelected(null)} />}
    </section>;
}
export default function ItemCatalog(props) {
    const [route] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const catalog = params.get('catalog');
        return ['gear', 'magic', 'weapons', 'armor'].includes(catalog)
            ? { catalog, query: params.get('q') || '' }
            : null;
    });
    const [tab, setTab] = useState(() => {
        if (route) return route.catalog;
        const saved = localStorage.getItem('item_catalog_tab');
        return ['gear', 'magic', 'weapons', 'armor'].includes(saved) ? saved : 'weapons';
    });
    const selectTab = id => {
        setTab(id);
        localStorage.setItem('item_catalog_tab', id);
    };
    const initialQuery = route?.catalog === tab ? route.query : '';
    return <div className="spell-browser-container p-4"><div className="spell-list-panel item-catalog-panel"><div className="catalog-tabs" role="tablist" aria-label="物品分类">{[['weapons','武器'],['armor','护甲'],['gear','装备'],['magic','魔法物品']].map(([id,title]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => selectTab(id)}>{title}</button>)}</div><div className="catalog-scroll" role="tabpanel">{tab === 'armor' ? <ArmorBrowser {...props} initialQuery={initialQuery} /> : tab === 'gear' ? <GearBrowser {...props} initialQuery={initialQuery} /> : tab === 'weapons' ? <WeaponBrowser {...props} initialQuery={initialQuery} /> : <MagicBrowser {...props} initialQuery={initialQuery} initialRarity={initialQuery ? '' : undefined} />}</div></div></div>;
}
