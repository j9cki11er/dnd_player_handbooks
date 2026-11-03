import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import data from '../data.json';
import CatalogDialog from './CatalogDialog';
import { gearPriceLabel } from '../utils/gear';
import GearBrowser from './GearBrowser';
import { catalogWeapons } from '../utils/weapons';

export const magicItems = data.filter(item => item.itemType && item.rarity);
function CoinPrice({ cost }) {
    const match = cost.match(/^(.+?)\s+(CP|SP|GP)$/);
    if (!match) return cost;

    const [, amount, unit] = match;
    return <span className="weapon-price">{amount}{' '}<span className="weapon-price-unit" data-unit={unit}>{unit}</span></span>;
}

export function CatalogCard({ item, onClick, openBookmarkDialog, isBookmarkedAnywhere }) {
    const saved = isBookmarkedAnywhere?.(item.id);
    return <div className="catalog-card glass-panel">
        <button className="catalog-open" onClick={onClick} aria-label={`查看${item.title}说明`}>
            {item.damage && <span className="weapon-card-classification"><span>{item.category}{item.properties?.includes('轻型') ? ' · 轻型' : ''}</span></span>}
            <span className="gear-name"><strong>{item.title}</strong><small>{item.titleEn}</small></span>
            <span className="gear-card-meta">{item.itemType ? <><span className="gear-weight">{item.itemType}{item.requiresAttunement ? ' · 需同调' : ''}</span><span className="gear-price">{item.rarity}</span></> : <><span className="gear-weight">{item.damage || `重量 ${item.weight}`}</span><span className="gear-price"><CoinPrice cost={item.damage ? item.cost : gearPriceLabel(item)} /></span></>}</span>
        </button>
        <button className={`catalog-save ${saved ? 'saved' : ''}`} aria-label={`收藏${item.title}`} aria-pressed={!!saved} onClick={() => openBookmarkDialog(item)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>;
}
export function MagicBrowser({ openBookmarkDialog, isBookmarkedAnywhere, initialType = '', initialRarity = '普通' }) {
    const [query, setQuery] = useState(''), [type, setType] = useState(initialType), [rarity, setRarity] = useState(initialRarity), [attunement, setAttunement] = useState('');
    const [selected, setSelected] = useState(null);
    const rarities = ['普通', '非普通', '珍稀', '极珍稀', '传说', '神器', '多种稀有度'];
    const items = magicItems.filter(item => (!type || item.itemType === type) && (!rarity || item.rarity === rarity) && (!attunement || item.requiresAttunement === (attunement === 'yes')) && `${item.title} ${item.titleEn}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => rarities.indexOf(a.rarity) - rarities.indexOf(b.rarity) || a.itemType.localeCompare(b.itemType, 'zh-CN') || a.titleEn.localeCompare(b.titleEn));
    return <section className="gear-browser" aria-label="魔法物品图鉴"><header className="gear-browser-header"><h2>魔法物品 <span>Magic Items</span></h2><p>按类别与稀有度查找 · 点击查看说明，爱心保存到收藏。</p></header>
        <div className="gear-filters unified-filter-bar">
            <select aria-label="物品类别" value={type} onChange={e => setType(e.target.value)}><option value="">全部类别</option>{[...new Set(magicItems.map(i => i.itemType))].sort().map(t => <option key={t}>{t}</option>)}</select>
            <select aria-label="物品稀有度" value={rarity} onChange={e => setRarity(e.target.value)}><option value="">全部稀有度</option>{rarities.map(r => <option key={r}>{r}</option>)}</select>
            <select aria-label="同调要求" value={attunement} onChange={e => setAttunement(e.target.value)}><option value="">全部同调</option><option value="yes">需同调</option><option value="no">无需同调</option></select>
            <label className="gear-search"><input aria-label="搜索魔法物品" placeholder="搜索名称 / English" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="gear-reset" onClick={() => { setQuery(''); setType(initialType); setRarity(initialRarity); setAttunement(''); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {magicItems.length} 件魔法物品</p><ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} {...{openBookmarkDialog, isBookmarkedAnywhere}} /></li>)}</ul>{!items.length && <p className="gear-empty">没有符合条件的物品。</p>}{selected && <CatalogDialog item={selected} onClose={() => setSelected(null)} />}
    </section>;
}
export function WeaponBrowser({ openBookmarkDialog, isBookmarkedAnywhere }) {
    const [query, setQuery] = useState(''), [category, setCategory] = useState(''), [mastery, setMastery] = useState('');
    const [sort, setSort] = useState('category');
    const [selected, setSelected] = useState(null);
    const items = catalogWeapons.filter(item => (!category || item.category === category) && (!mastery || item.mastery === mastery) && `${item.title} ${item.titleEn} ${item.properties}`.toLowerCase().includes(query.trim().toLowerCase()));
    // The source table already follows the handbook's category order.
    if (sort === 'mastery') {
        items.sort((a, b) => a.mastery.localeCompare(b.mastery, 'zh-CN'));
    } else if (sort === 'price-asc') {
        items.sort((a, b) => a.pricesGP[0] - b.pricesGP[0]);
    } else if (sort === 'price-desc') {
        items.sort((a, b) => b.pricesGP[0] - a.pricesGP[0]);
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
            </select>
            <label className="gear-search"><input aria-label="搜索武器" placeholder="搜索名称 / English / 词条" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="gear-reset" onClick={() => { setQuery(''); setCategory(''); setMastery(''); setSort('category'); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {catalogWeapons.length} 件武器</p><ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} {...{openBookmarkDialog, isBookmarkedAnywhere}} /></li>)}</ul>{!items.length && <p className="gear-empty">没有符合条件的武器。</p>}{selected && <CatalogDialog item={selected} onClose={() => setSelected(null)} />}
    </section>;
}
export default function ItemCatalog(props) {
    const [tab, setTab] = useState('weapons');
    return <div className="spell-browser-container p-4"><div className="spell-list-panel"><div className="catalog-tabs" role="tablist" aria-label="物品分类">{[['weapons','武器'],['gear','装备'],['magic','魔法物品']].map(([id,title]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{title}</button>)}</div><div className="catalog-scroll" role="tabpanel">{tab === 'gear' ? <GearBrowser {...props} /> : tab === 'weapons' ? <WeaponBrowser {...props} /> : <MagicBrowser {...props} />}</div></div></div>;
}
