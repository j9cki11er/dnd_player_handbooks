import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { ItemCard, SpellListItem } from './Common';

export default function SearchPanel({
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedItemId,
    selectItem,
    isBookmarkedAnywhere,
    isMobile,
    openBookmarkDialog
}) {
    const searchInput = useRef(null);

    return (
        <motion.div
            key="search"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="global-search-bar filter-search" role="search" aria-label="全局搜索">
                <label className="spell-search-field">
                    <Search className="search-icon" size={16} aria-hidden="true" />
                    <input
                        ref={searchInput}
                        autoFocus
                        type="text"
                        enterKeyHint="search"
                        aria-label="搜索法术、专长或职业"
                        placeholder="搜索法术、专长、职业…"
                        className="search-input"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </label>
                <button type="button" className="gear-reset" disabled={!searchQuery}
                    onClick={() => {
                        setSearchQuery('');
                        searchInput.current?.focus();
                    }}>
                    重置
                </button>
            </div>

            {searchQuery.trim() ? (
                <div className="global-search-results">
                    {searchResults.categories.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title">分类目录</h3>
                            <div className="item-grid">
                                {searchResults.categories.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => selectItem(item, false)}
                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                        openBookmarkDialog={openBookmarkDialog}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.feats.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title">专长列表</h3>
                            <div className="item-grid">
                                {searchResults.feats.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => selectItem(item, false)}
                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                        openBookmarkDialog={openBookmarkDialog}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.masteries.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title">精通词条</h3>
                            <div className="item-grid">
                                {searchResults.masteries.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => selectItem(item, false)}
                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                        openBookmarkDialog={openBookmarkDialog}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.invocations.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title">魔能祈唤</h3>
                            <div className="item-grid">
                                {searchResults.invocations.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => selectItem(item, false)}
                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                        openBookmarkDialog={openBookmarkDialog}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.spells.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title">法术列表</h3>
                            <div className="spell-grid">
                                {searchResults.spells.map(spell => (
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
                            </div>
                        </div>
                    )}

                    {searchResults.categories.length === 0 && searchResults.spells.length === 0 && searchResults.feats.length === 0 && searchResults.masteries.length === 0 && searchResults.invocations.length === 0 && (
                        <div className="global-search-empty" role="status">没找到匹配的结果</div>
                    )}
                </div>
            ) : (
                <p className="global-search-empty">输入关键词，查找手册分类、法术、专长和规则词条。</p>
            )}
        </motion.div>
    );
}
