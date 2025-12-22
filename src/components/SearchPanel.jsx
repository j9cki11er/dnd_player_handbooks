import React from 'react';
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
    return (
        <motion.div
            key="search"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="search-container">
                <Search className="search-icon" size={24} />
                <input
                    autoFocus
                    type="text"
                    placeholder="搜索法术、专长、职业..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {searchQuery && (
                <div className="flex flex-col gap-10 pb-20">
                    {searchResults.categories.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title mb-4">分类目录</h3>
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
                            <h3 className="section-title mb-4">专长列表</h3>
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
                            <h3 className="section-title mb-4">精通词条</h3>
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

                    {searchResults.spells.length > 0 && (
                        <div className="search-section">
                            <h3 className="section-title mb-4">法术列表</h3>
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

                    {searchResults.categories.length === 0 && searchResults.spells.length === 0 && searchResults.feats.length === 0 && searchResults.masteries.length === 0 && (
                        <div className="no-results py-20 text-center text-muted">没找到匹配的结果</div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
