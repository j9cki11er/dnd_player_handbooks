import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import gearData from '../data-gear.json';
import { filterGear, gearPriceLabel, sortGear, gearCurrencyFactor } from '../utils/gear';
import { CatalogCard } from './ItemCatalog';
import { prepareContent } from '../utils/content';

function GearDialog({ item, currency, onClose }) {
    const ref = useRef(null);
    const content = useMemo(() => prepareContent(item.descriptionHtml), [item.descriptionHtml]);
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement;
        dialog.showModal();
        return () => { dialog.close(); previous?.focus(); };
    }, []);
    return createPortal(
        <dialog ref={ref} className="gear-dialog" aria-labelledby="gear-dialog-title"
            onCancel={event => { event.preventDefault(); onClose(); }}
            onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="gear-dialog-surface">
                <header className="gear-dialog-header">
                    <div><h2 id="gear-dialog-title">{item.title}</h2><p>{item.titleEn}</p></div>
                    <button type="button" onClick={onClose} className="gear-close" aria-label="关闭物品说明" autoFocus><X size={20} /></button>
                </header>
                <dl className="gear-dialog-meta"><div><dt>重量</dt><dd>{item.weight}</dd></div><div><dt>价格</dt><dd>{gearPriceLabel(item, currency)}</dd></div></dl>
                <div className="gear-dialog-description dnd-content" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        </dialog>, document.body
    );
}

export default function GearBrowser({ openBookmarkDialog, isBookmarkedAnywhere, initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery);
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');
    const [selected, setSelected] = useState(null);
    const [currency, setCurrency] = useState('GP');
    const [sort, setSort] = useState('name');
    const factor = gearCurrencyFactor(currency);
    const items = useMemo(() => sortGear(filterGear(gearData, { query, min, max }), sort, { min, max }), [query, min, max, sort]);
    const invalid = min !== '' && max !== '' && Number(min) > Number(max);
    const setPreset = value => {
        const [lower, upper] = value.split(':'); setMin(lower); setMax(upper);
    };
    const preset = [':', '0:1', '1:10', '10:50', '50:100', '100:'].includes(`${min}:${max}`) ? `${min}:${max}` : 'custom';
    const inputValue = value => value === '' ? '' : Number((Number(value) / factor).toFixed(2));
    const updatePrice = (value, setter) => setter(value === '' ? '' : String(Number((Number(value) * factor).toFixed(4))));
    return <section className="gear-browser" aria-label="冒险装备列表">
        <header className="gear-browser-header"><h2>冒险装备 <span>Adventuring Gear</span></h2>
            <p>点击卡片查看说明 · 1 GP = 10 SP = 100 CP · 多规格物品按区间内最低价排序。</p>
            {invalid && <p className="gear-error" role="alert">最低价格不能高于最高价格。</p>}
        </header>
        <div className="gear-filters unified-filter-bar">
            <select className="gear-sort" aria-label="装备排序" value={sort} onChange={event => setSort(event.target.value)}><option value="name">名称排序</option><option value="price-asc">价格 ↑</option><option value="price-desc">价格 ↓</option></select>
            <select className="gear-currency" aria-label="价格单位" value={currency} onChange={event => setCurrency(event.target.value)}><option value="GP">GP</option><option value="SP">SP</option><option value="CP">CP</option></select>
            <select className="gear-preset" aria-label="价格区间" value={preset} onChange={event => setPreset(event.target.value)}>
                    <option value=":">全部价格</option>{[['0:1', '≤', 1], ['1:10', '', 10], ['10:50', '', 50], ['50:100', '', 100], ['100:', '≥', 100]].map(([value, sign, upper]) => <option key={value} value={value}>{sign ? `${sign} ${inputValue(upper)}` : `${inputValue(value.split(':')[0])}–${inputValue(upper)}`} {currency}</option>)}<option value="custom" disabled>自定义</option>
                </select>
            {[[min, setMin, '最低'], [max, setMax, '最高']].map(([value, setter, label]) => <label className="gear-price-input" key={label}>
                    <span>{label}</span><input type="number" min="0" step={currency === 'CP' ? '1' : '0.01'} aria-label={`${label}价格 ${currency}`} aria-invalid={invalid} placeholder={label === '最低' ? '0' : '不限'} value={inputValue(value)} onChange={event => updatePrice(event.target.value, setter)} />

                </label>)}
            <label className="gear-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="搜索冒险装备" placeholder="搜索名称 / English" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <button type="button" className="gear-reset" onClick={() => { setQuery(''); setMin(''); setMax(''); setSort('name'); setCurrency('GP'); }}>重置</button>
        </div>
        <p className="gear-count" role="status">显示 {items.length} / {gearData.length} 件装备</p>
        <ul className="gear-grid">{items.map(item => <li key={item.id}><CatalogCard item={item} onClick={() => setSelected(item)} openBookmarkDialog={openBookmarkDialog} isBookmarkedAnywhere={isBookmarkedAnywhere} /></li>)}</ul>
        {!items.length && !invalid && <p className="gear-empty">没有符合条件的装备，请调整价格区间或搜索名称。</p>}
        {selected && <GearDialog item={selected} currency={currency} onClose={() => setSelected(null)} />}
    </section>;
}
