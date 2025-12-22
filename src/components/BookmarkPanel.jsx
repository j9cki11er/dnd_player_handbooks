import React from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Trash2, FolderPlus, FilterX, Bookmark, Heart, Edit2, Share2 } from 'lucide-react';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import { ItemCard, SpellListItem } from './Common';

// Helper hook for hold-to-drag
const useHoldToDrag = (onStart) => {
    const controls = useDragControls();
    const timerRef = React.useRef(null);
    const startPosRef = React.useRef({ x: 0, y: 0 });
    const [isHolding, setIsHolding] = React.useState(false);

    const onPointerDown = (e) => {
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const y = e.clientY || (e.touches && e.touches[0].clientY);
        startPosRef.current = { x, y };
        setIsHolding(false); // Temporarily disabled

        /* 
        timerRef.current = setTimeout(() => {
            onStart?.();
            controls.start(e);
            setIsHolding(false);
        }, 300);
        */
    };

    const onPointerMove = (e) => {
        if (!timerRef.current) return;
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const y = e.clientY || (e.touches && e.touches[0].clientY);

        const dx = Math.abs(x - startPosRef.current.x);
        const dy = Math.abs(y - startPosRef.current.y);

        if (dx > 5 || dy > 5) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            setIsHolding(false);
        }
    };

    const onPointerUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsHolding(false);
    };

    return { controls, onPointerDown, onPointerMove, onPointerUp, isHolding };
};

const DraggableBookmarkItem = ({ item, items, folder, categoryType, draggingId, handleDragMove, setDraggingId, selectItem, openBookmarkDialog, isMobile, selectedItemId }) => {
    const { controls, onPointerDown, onPointerMove, onPointerUp, isHolding } = useHoldToDrag(() => setDraggingId(item.id));
    const isSpell = !!item.castingTime;

    return (
        <motion.div
            layout
            drag={false}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            onDragEnd={() => setDraggingId(null)}
            onDrag={(e, info) => handleDragMove(e, info, item, items, folder, categoryType)}
            className={`reorderable-item ${draggingId === item.id ? 'is-dragging' : ''} ${isHolding ? 'is-holding' : ''}`}
            data-id={item.id}
        >
            {isSpell ? (
                <SpellListItem
                    item={item}
                    isSelected={selectedItemId === item.id}
                    onClick={() => selectItem(item, false)}
                    isBookmarked={true}
                    isMobile={isMobile}
                    openBookmarkDialog={openBookmarkDialog}
                />
            ) : (
                <ItemCard
                    item={item}
                    onClick={() => selectItem(item, false)}
                    isBookmarked={true}
                    openBookmarkDialog={openBookmarkDialog}
                />
            )}
        </motion.div>
    );
};

const DraggableFolder = ({
    folder,
    isFolderExpanded,
    folderItems,
    setExpandedFolders,
    setFolderToRename,
    setNewFolderName,
    setIsRenameModalOpen,
    clearFolder,
    deleteFolder,
    expandedCategories,
    setExpandedCategories,
    resolveItem,
    draggingId,
    setDraggingId,
    handleDragMove,
    selectItem,
    openBookmarkDialog,
    isMobile,
    selectedItemId
}) => {
    const { controls, onPointerDown, onPointerMove, onPointerUp, isHolding } = useHoldToDrag();

    return (
        <motion.div
            layout
            className={`bookmark-section mb-6 ${!isFolderExpanded ? 'collapsed' : ''} ${isHolding ? 'is-holding' : ''}`}
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
                        onPointerDown={e => e.stopPropagation()}
                        className="action-icon-btn text-muted hover:text-gold"
                        title="重命名文件夹"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); clearFolder(folder); }}
                        onPointerDown={e => e.stopPropagation()}
                        className="action-icon-btn text-muted hover:text-red-400"
                        title="清空文件夹"
                    >
                        <FilterX size={16} />
                    </button>
                    {folder !== '默认' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
                            onPointerDown={e => e.stopPropagation()}
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
                                {['rules', 'creatures', 'spells'].map(categoryType => {
                                    const catId = `${folder}-${categoryType}`;
                                    const isCatExpanded = expandedCategories[catId] !== false;
                                    const items = folderItems.map(resolveItem).filter(item => {
                                        if (!item) return false;
                                        const isSpell = !!item.castingTime;
                                        const isCreature = item.pathParts?.some(p => p.includes('附录 B') || p.includes('生物数据卡'));

                                        if (categoryType === 'rules') return !isSpell && !isCreature;
                                        if (categoryType === 'creatures') return isCreature;
                                        if (categoryType === 'spells') return isSpell;
                                        return false;
                                    });

                                    if (items.length === 0) return null;

                                    const titleMap = {
                                        rules: '资料与规则',
                                        creatures: '生物和魔宠数据卡',
                                        spells: '法术列表'
                                    };

                                    return (
                                        <div key={categoryType} className="bookmark-group">
                                            <div
                                                className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                                onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                            >
                                                {isCatExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold uppercase tracking-wider font-semibold">{titleMap[categoryType]}</h4>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {isCatExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                        animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                                                        exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    >
                                                        <div className={categoryType === 'spells' ? 'spell-grid' : 'item-grid'}>
                                                            {items.map(item => (
                                                                <DraggableBookmarkItem
                                                                    key={item.id}
                                                                    item={item}
                                                                    items={items}
                                                                    folder={folder}
                                                                    categoryType={categoryType}
                                                                    draggingId={draggingId}
                                                                    handleDragMove={handleDragMove}
                                                                    setDraggingId={setDraggingId}
                                                                    selectItem={selectItem}
                                                                    openBookmarkDialog={openBookmarkDialog}
                                                                    isMobile={isMobile}
                                                                    selectedItemId={selectedItemId}
                                                                />
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-folder py-4 text-center opacity-40 text-sm italic">此文件夹为空</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

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
        const newItemIds = newCategoryItems.map(item => item.id);
        const currentFolderItems = bookmarks[folder];

        const rulesIds = [];
        const creaturesIds = [];
        const spellsIds = [];

        currentFolderItems.forEach(itemId => {
            const item = resolveItem(itemId);
            if (!item) return;
            const isSpell = !!item.castingTime;
            const isCreature = item.pathParts?.some(p => p.includes('附录 B') || p.includes('生物数据卡'));

            if (isSpell) spellsIds.push(item.id);
            else if (isCreature) creaturesIds.push(item.id);
            else rulesIds.push(item.id);
        });

        let updatedFullList = [];
        if (categoryType === 'rules') {
            updatedFullList = [...newItemIds, ...creaturesIds, ...spellsIds];
        } else if (categoryType === 'creatures') {
            updatedFullList = [...rulesIds, ...newItemIds, ...spellsIds];
        } else if (categoryType === 'spells') {
            updatedFullList = [...rulesIds, ...creaturesIds, ...newItemIds];
        }

        reorderItemsInFolder(folder, updatedFullList);
    };

    const handleDragMove = (e, info, item, items, folder, categoryType) => {
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

                <div
                    className="overflow-y-auto flex-1 min-h-0 pr-10 pb-20 custom-scrollbar"
                >
                    {Object.keys(bookmarks).map(folder => (
                        <DraggableFolder
                            key={folder}
                            folder={folder}
                            isFolderExpanded={expandedFolders[folder] !== false}
                            folderItems={bookmarks[folder]}
                            setExpandedFolders={setExpandedFolders}
                            setFolderToRename={setFolderToRename}
                            setNewFolderName={setNewFolderName}
                            setIsRenameModalOpen={setIsRenameModalOpen}
                            clearFolder={clearFolder}
                            deleteFolder={deleteFolder}
                            expandedCategories={expandedCategories}
                            setExpandedCategories={setExpandedCategories}
                            resolveItem={resolveItem}
                            draggingId={draggingId}
                            setDraggingId={setDraggingId}
                            handleDragMove={handleDragMove}
                            selectItem={selectItem}
                            openBookmarkDialog={openBookmarkDialog}
                            isMobile={isMobile}
                            selectedItemId={selectedItemId}
                        />
                    ))}
                    {Object.keys(bookmarks).length === 0 && (
                        <div className="text-center py-20 text-muted">您还没有任何收藏</div>
                    )}
                </div>
            </div>
        </div>
    );
}
