import React from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Trash2, FolderPlus, FilterX, Bookmark, Heart, Edit2, Share2 } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { ItemCard, SpellListItem } from './Common';

export default function BookmarkPanel({
    bookmarks,
    toggleAllFolders,
    clearAllBookmarks,
    setIsAddingFolder,
    setNewFolderName,
    expandedFolders,
    setExpandedFolders,
    clearFolder,
    deleteFolder,
    resolveItem,
    expandedCategories,
    setExpandedCategories,
    selectedItemId,
    selectItem,
    openBookmarkDialog,
    isMobile,
    setIsShareModalOpen,
    setIsImporting,
    setIsRenameModalOpen,
    setFolderToRename,
    reorderFolders,
    reorderItemsInFolder
}) {
    const [draggingId, setDraggingId] = React.useState(null);
    const lastReorderTime = React.useRef(0);
    const handleReorderItems = (folder, categoryType, newCategoryItems) => {
        // newCategoryItems is an array of items (objects)
        const newItemIds = newCategoryItems.map(item => item.id);

        const currentFolderItems = bookmarks[folder];

        // Categorize all items in the folder to preserve order of other categories
        const classesIds = [];
        const spellsIds = [];
        const othersIds = [];

        currentFolderItems.forEach(itemId => {
            const item = resolveItem(itemId);
            if (!item) return;
            const isSpell = !!item.castingTime;
            const path = item.pathParts?.join(' ') || '';
            const isSpecial = path.includes('角色职业') || path.includes('角色起源') || path.includes('专长') || path.includes('精通词条');

            if (isSpecial) classesIds.push(item.id);
            else if (isSpell) spellsIds.push(item.id);
            else othersIds.push(item.id);
        });

        let updatedFullList = [];
        if (categoryType === 'classes') {
            updatedFullList = [...newItemIds, ...othersIds, ...spellsIds];
        } else if (categoryType === 'others') {
            updatedFullList = [...classesIds, ...newItemIds, ...spellsIds];
        } else if (categoryType === 'spells') {
            updatedFullList = [...classesIds, ...othersIds, ...newItemIds];
        }

        reorderItemsInFolder(folder, updatedFullList);
    };

    const handleDragMove = (e, info, item, items, folder, categoryType) => {
        // Simple throttle to avoid too many state updates
        const now = Date.now();
        if (now - lastReorderTime.current < 50) return;

        const target = document.elementFromPoint(info.point.x, info.point.y);
        const card = target?.closest('.reorderable-item');

        if (card && card.dataset.id !== item.id) {
            const targetId = card.dataset.id;
            const currentIndex = items.findIndex(i => i.id === item.id);
            const targetIndex = items.findIndex(i => i.id === targetId);

            if (currentIndex !== -1 && targetIndex !== -1) {
                lastReorderTime.current = now;
                const newItems = [...items];
                const [movedItem] = newItems.splice(currentIndex, 1);
                newItems.splice(targetIndex, 0, movedItem);
                handleReorderItems(folder, categoryType, newItems);
            }
        }
    };

    return (
        <div className="spell-browser-container p-4">
            <div className="spell-list-panel">
                <div className="view-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <span className="collection-info text-muted">我的收藏”会保存在您目前使用的装置中，更换手机或浏览器后将不会保留。</span>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => toggleAllFolders(true)} className="action-btn-small" title="全部展开">
                            <ChevronDown size={16} /> <span>全部展开</span>
                        </button>
                        <button onClick={() => toggleAllFolders(false)} className="action-btn-small" title="全部折叠">
                            <ChevronUp size={16} /> <span>全部折叠</span>
                        </button>
                        <button onClick={clearAllBookmarks} className="action-btn-small text-red-400" title="清空所有 (Cookies)">
                            <Trash2 size={16} /> <span>全局清空</span>
                        </button>
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="action-btn-small"
                            title="导入/导出"
                        >
                            <Share2 size={16} /> <span>导入 / 导出</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsAddingFolder(true);
                                setNewFolderName('');
                            }}
                            className="gold-button py-2 px-4 h-auto"
                        >
                            <FolderPlus size={18} />
                            <span>新建文件夹</span>
                        </button>
                    </div>
                </div>

                <Reorder.Group
                    axis="y"
                    values={Object.keys(bookmarks)}
                    onReorder={reorderFolders}
                    className="overflow-y-auto flex-1 min-h-0 pr-10 pb-20 custom-scrollbar"
                >
                    {Object.keys(bookmarks).map(folder => {
                        const isFolderExpanded = expandedFolders[folder] !== false;
                        const folderItems = bookmarks[folder];

                        return (
                            <Reorder.Item
                                key={folder}
                                value={folder}
                                layout
                                className={`bookmark-section mb-6 ${!isFolderExpanded ? 'collapsed' : ''}`}
                            >
                                <div
                                    className="folder-header group cursor-pointer flex items-center justify-between p-3 glass-panel mb-2"
                                    onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !isFolderExpanded }))}
                                >
                                    <div className="flex items-center gap-3">
                                        {isFolderExpanded ? <ChevronDown size={18} className="text-gold" /> : <ChevronRight size={18} className="text-gold" />}
                                        <h3 className="folder-name text-lg gold-text m-0">{folder}</h3>
                                        <span className="count-badge opacity-60 text-xs bg-gold/10 px-2 py-0.5 rounded-full">{folderItems.length} 项</span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFolderToRename(folder);
                                                setNewFolderName(folder);
                                                setIsRenameModalOpen(true);
                                            }}
                                            className="action-icon-btn text-muted hover:text-gold"
                                            title="重命名文件夹"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); clearFolder(folder); }}
                                            className="action-icon-btn text-muted hover:text-red-400"
                                            title="清空文件夹"
                                        >
                                            <FilterX size={16} />
                                        </button>
                                        {folder !== '默认' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
                                                className="action-icon-btn text-muted hover:text-red-400"
                                                title="删除文件夹"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {isFolderExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                            className="folder-content pl-2 md:pl-4 border-l border-gold/10 ml-[1.15rem] py-2"
                                        >
                                            {folderItems.length > 0 ? (
                                                <div className="flex flex-col gap-6">
                                                    {(() => {
                                                        const catId = `${folder}-classes`;
                                                        const isCatExpanded = expandedCategories[catId] !== false;
                                                        const items = folderItems.map(resolveItem).filter(item => {
                                                            if (!item) return false;
                                                            const path = item.pathParts?.join(' ') || '';
                                                            return path.includes('角色职业') || path.includes('角色起源') || path.includes('专长') || path.includes('精通词条');
                                                        });
                                                        if (items.length === 0) return null;
                                                        return (
                                                            <div className="bookmark-group">
                                                                <div
                                                                    className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                                                    onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                                                >
                                                                    {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                    <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold uppercase tracking-wider font-semibold">职业 背景 专长 精通词条</h4>
                                                                </div>
                                                                <AnimatePresence initial={false}>
                                                                    {isCatExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                                                                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                        >
                                                                            <div className="item-grid">
                                                                                {items.map(item => (
                                                                                    <motion.div
                                                                                        key={item.id}
                                                                                        layout
                                                                                        drag
                                                                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                                                        dragElastic={1}
                                                                                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                                                                                        onDragStart={() => setDraggingId(item.id)}
                                                                                        onDragEnd={() => setDraggingId(null)}
                                                                                        onDrag={(e, info) => handleDragMove(e, info, item, items, folder, 'classes')}
                                                                                        className={`reorderable-item ${draggingId === item.id ? 'is-dragging' : ''}`}
                                                                                        data-id={item.id}
                                                                                        style={{ touchAction: 'none' }}
                                                                                    >
                                                                                        <ItemCard
                                                                                            item={item}
                                                                                            onClick={() => selectItem(item, false)}
                                                                                            isBookmarked={true}
                                                                                            openBookmarkDialog={openBookmarkDialog}
                                                                                        />
                                                                                    </motion.div>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })()}

                                                    {(() => {
                                                        const catId = `${folder}-others`;
                                                        const isCatExpanded = expandedCategories[catId] !== false;
                                                        const items = folderItems.map(resolveItem).filter(item => {
                                                            if (!item) return false;
                                                            const isSpell = !!item.castingTime;
                                                            const path = item.pathParts?.join(' ') || '';
                                                            const isSpecial = path.includes('角色职业') || path.includes('角色起源') || path.includes('专长') || path.includes('精通词条');
                                                            return !isSpecial && !isSpell;
                                                        });
                                                        if (items.length === 0) return null;
                                                        return (
                                                            <div className="bookmark-group">
                                                                <div
                                                                    className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                                                    onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                                                >
                                                                    {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                    <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold uppercase tracking-wider font-semibold">装备 道具 其他</h4>
                                                                </div>
                                                                <AnimatePresence initial={false}>
                                                                    {isCatExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                                                                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                        >
                                                                            <div className="item-grid">
                                                                                {items.map(item => (
                                                                                    <motion.div
                                                                                        key={item.id}
                                                                                        layout
                                                                                        drag
                                                                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                                                        dragElastic={1}
                                                                                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                                                                                        onDragStart={() => setDraggingId(item.id)}
                                                                                        onDragEnd={() => setDraggingId(null)}
                                                                                        onDrag={(e, info) => handleDragMove(e, info, item, items, folder, 'others')}
                                                                                        className={`reorderable-item ${draggingId === item.id ? 'is-dragging' : ''}`}
                                                                                        data-id={item.id}
                                                                                        style={{ touchAction: 'none' }}
                                                                                    >
                                                                                        <ItemCard
                                                                                            item={item}
                                                                                            onClick={() => selectItem(item, false)}
                                                                                            isBookmarked={true}
                                                                                            openBookmarkDialog={openBookmarkDialog}
                                                                                        />
                                                                                    </motion.div>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })()}

                                                    {(() => {
                                                        const catId = `${folder}-spells`;
                                                        const isCatExpanded = expandedCategories[catId] !== false;
                                                        const items = folderItems.map(resolveItem).filter(item => {
                                                            if (!item) return false;
                                                            return !!item.castingTime;
                                                        });
                                                        if (items.length === 0) return null;
                                                        return (
                                                            <div className="bookmark-group">
                                                                <div
                                                                    className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                                                    onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                                                >
                                                                    {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                    <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold uppercase tracking-wider font-semibold">法术列表</h4>
                                                                </div>
                                                                <AnimatePresence initial={false}>
                                                                    {isCatExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                                                                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                        >
                                                                            <div className="spell-grid">
                                                                                {items.map(spell => (
                                                                                    <motion.div
                                                                                        key={spell.id}
                                                                                        layout
                                                                                        drag
                                                                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                                                        dragElastic={1}
                                                                                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                                                                                        onDragStart={() => setDraggingId(spell.id)}
                                                                                        onDragEnd={() => setDraggingId(null)}
                                                                                        onDrag={(e, info) => handleDragMove(e, info, spell, items, folder, 'spells')}
                                                                                        className={`reorderable-item ${draggingId === spell.id ? 'is-dragging' : ''}`}
                                                                                        data-id={spell.id}
                                                                                        style={{ touchAction: 'none' }}
                                                                                    >
                                                                                        <SpellListItem
                                                                                            item={spell}
                                                                                            isSelected={selectedItemId === spell.id}
                                                                                            onClick={() => selectItem(spell, false)}
                                                                                            isBookmarked={true}
                                                                                            isMobile={isMobile}
                                                                                            openBookmarkDialog={openBookmarkDialog}
                                                                                        />
                                                                                    </motion.div>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="empty-folder py-4 text-center opacity-40 text-sm italic">此文件夹为空</div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Reorder.Item>
                        );
                    })}
                    {Object.keys(bookmarks).length === 0 && (
                        <div className="text-center py-20 text-muted">您还没有任何收藏</div>
                    )}
                </Reorder.Group>
            </div>
        </div>
    );
}
