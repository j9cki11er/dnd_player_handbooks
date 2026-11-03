import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { isHandbookSpell } from '../utils/spellSummary';
import { SpellListItem } from './Common';

const defaultSpellFilters = { class: '全部', level: '全部', school: '', ritual: false };

export default function SpellBrowser({
    spellData,
    searchQuery,
    setSearchQuery,
    selectedItemId,
    isBookmarkedAnywhere,
    isMobile,
    openBookmarkDialog
}) {
    const [spellFilters, setSpellFilters] = useState(defaultSpellFilters);

    const filteredSpells = useMemo(() => {
        return spellData.filter(spell => {
            if (!isHandbookSpell(spell) && spell.source !== 'EFA') return false;
            const classMatch = spellFilters.class === '全部' || spell.classes.includes(spellFilters.class);
            const levelMatch = spellFilters.level === '全部' || spell.levelNumeric === parseInt(spellFilters.level);
            const searchMatch = !searchQuery ||
                spell.title.includes(searchQuery) ||
                spell.titleEn.toLowerCase().includes(searchQuery.toLowerCase());

            const schoolMatch = !spellFilters.school || spell.school === spellFilters.school;
            const ritualMatch = !spellFilters.ritual || spell.castingTime?.includes('仪式');
            return classMatch && levelMatch && searchMatch && schoolMatch && ritualMatch;
        });
    }, [spellFilters, searchQuery, spellData]);

    return (
        <div className="spell-browser-container p-4">
            <div className="spell-list-panel spell-browser-panel">
                <div className="view-header spell-filter-header mb-4 shrink-0">
                    <div className="unified-filter-bar spell-filter-bar shrink-0">
                        <div className="filter-item">
                            <select
                                value={spellFilters.class}
                                onChange={(e) => setSpellFilters(prev => ({ ...prev, class: e.target.value }))}
                                aria-label="筛选职业"
                                className="filter-select"
                            >
                                <option value="全部">全部职业</option>
                                {['吟游诗人', '牧师', '德鲁伊', '圣武士', '游侠', '术士', '魔契师', '法师', '奇械师'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-divider"></div>

                        <div className="filter-item">
                            <select
                                value={spellFilters.level}
                                onChange={(e) => setSpellFilters(prev => ({ ...prev, level: e.target.value }))}
                                aria-label="筛选环阶"
                                className="filter-select"
                            >
                                <option value="全部">全部环阶</option>
                                <option value="0">戏法</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
                                    <option key={l} value={l}>{l}环</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-divider"></div>

                        <select className="filter-select" aria-label="筛选法术学派" value={spellFilters.school}
                            onChange={e => setSpellFilters(prev => ({ ...prev, school: e.target.value }))}>
                            <option value="">全部学派</option>
                            {['防护', '咒法', '预言', '惑控', '塑能', '幻术', '死灵', '变化'].map(school => (
                                <option key={school}>{school}</option>
                            ))}
                        </select>
                        <label className="spell-ritual-filter">
                            <input type="checkbox" checked={spellFilters.ritual}
                                onChange={e => {
                                    const ritual = e.target.checked;
                                    setSpellFilters(prev => ({
                                        ...prev,
                                        ritual,
                                        level: ritual && prev.level === '0' ? '全部' : prev.level
                                    }));
                                }} />
                            仪式
                        </label>

                        <div className="spell-search-controls">
                            <div className="filter-search">
                                <label className="spell-search-field">
                                <Search size={14} className="search-icon" aria-hidden="true" />
                                <input
                                    type="text"
                                    placeholder="搜索法术..."
                                    aria-label="搜索法术"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                </label>
                            </div>
                            <button type="button" className="gear-reset"
                                onClick={() => { setSearchQuery(''); setSpellFilters(defaultSpellFilters); }}>
                                重置
                            </button>
                        </div>
                    </div>
                </div>

                <div className="spell-results">
                    <details className="spell-list-guide">
                        <summary>法术速查 · V, S, M / 专注 / 仪式</summary>
                        <dl>
                            <div><dt>V, S, M</dt><dd>
                                V 是言语，S 是姿势，M 是材料。
                                <p className="spell-dfd-note"><strong>DFD 备注：</strong>未标 GP 价格的材料可以忽略。标有 GP 价格的材料，须先消耗背包里的对应道具，或直接扣除等值 GP，才能施展。</p>
                            </dd></div>
                            <div><dt>专注</dt><dd>同一时间只能维持一个专注效果。受到伤害时，通常需要通过体质豁免来维持专注。</dd></div>
                            <div><dt>仪式</dt><dd>以仪式施放时，施法时间增加 10 分钟，不消耗法术位。</dd></div>
                        </dl>
                    </details>
                    <p className="spell-result-count" role="status">共 {filteredSpells.length} 个法术</p>
                    <div className="spell-grid">
                        {filteredSpells.map(spell => (
                            <SpellListItem
                                key={spell.id}
                                item={spell}
                                isSelected={selectedItemId === spell.id}
                                isBookmarked={isBookmarkedAnywhere(spell.id)}
                                isMobile={isMobile}
                                openBookmarkDialog={openBookmarkDialog}
                            />
                        ))}
                        {filteredSpells.length === 0 && <div className="col-span-full text-center text-muted py-10">未找到匹配的法术</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
