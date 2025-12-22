import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SpellListItem } from './Common';

export default function SpellBrowser({
    spellData,
    searchQuery,
    setSearchQuery,
    selectedItemId,
    selectItem,
    isBookmarkedAnywhere,
    isMobile,
    openBookmarkDialog
}) {
    const [spellFilters, setSpellFilters] = useState({ class: '全部', level: '0' });

    const filteredSpells = useMemo(() => {
        return spellData.filter(spell => {
            const classMatch = spellFilters.class === '全部' || spell.classes.includes(spellFilters.class);
            const levelMatch = spellFilters.level === '全部' || spell.levelNumeric === parseInt(spellFilters.level);
            const searchMatch = !searchQuery ||
                spell.title.includes(searchQuery) ||
                spell.titleEn.toLowerCase().includes(searchQuery.toLowerCase());

            return classMatch && levelMatch && searchMatch;
        });
    }, [spellFilters, searchQuery, spellData]);

    return (
        <div className="spell-browser-container p-4">
            <div className="spell-list-panel">
                <div className="view-header mb-4 shrink-0">
                    <div className="unified-filter-bar mb-4 shrink-0">
                        <div className="filter-item">
                            <select
                                value={spellFilters.class}
                                onChange={(e) => setSpellFilters(prev => ({ ...prev, class: e.target.value }))}
                                className="filter-select"
                            >
                                <option value="全部">全部职业</option>
                                {['吟游诗人', '牧师', '德鲁伊', '圣武士', '游侠', '术士', '魔契师', '法师'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-divider"></div>

                        <div className="filter-item">
                            <select
                                value={spellFilters.level}
                                onChange={(e) => setSpellFilters(prev => ({ ...prev, level: e.target.value }))}
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

                        <div className="filter-search flex-grow">
                            <Search size={14} className="search-icon" />
                            <input
                                type="text"
                                placeholder="搜索法术..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0 pr-10 pb-20 custom-scrollbar">
                    <div className="spell-grid">
                        {filteredSpells.slice(0, 100).map(spell => (
                            <SpellListItem
                                key={spell.id}
                                item={spell}
                                isSelected={selectedItemId === spell.id}
                                onClick={() => selectItem(spell, false)}
                                isBookmarked={isBookmarkedAnywhere(spell.id)}
                                isMobile={isMobile}
                                openBookmarkDialog={openBookmarkDialog}
                            />
                        ))}
                        {filteredSpells.length === 0 && <div className="col-span-full text-center text-muted py-10">未找到匹配的法术</div>}
                        {filteredSpells.length > 100 && <div className="col-span-full text-center text-muted py-4 text-xs">显示前 100 个结果</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
