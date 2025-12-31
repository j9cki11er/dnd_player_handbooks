import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Folder, Moon, Sun } from 'lucide-react';
import { ItemCard, WeaponTable, CollapsibleSection } from './Common';

export default function DetailScreen({
    entry, index, onBack, onNavigate, onSelectItem, openBookmarkDialog, isBookmarkedAnywhere, categoryTree, isMobile,
    SidebarContent, activeTab, setActiveTab, setCurrentPath, setSelectedItem, setDetailStack, theme, toggleTheme,
    currentPath: globalPath, selectedItem: globalItem, toggleExpand, expandedPaths, setSearchQuery, navigateTo, selectItem,
    parseCR, featData, masteryData, weaponData, isLocked, showDev, showDM,
    isExternalBack
}) {
    const sidebarProps = {
        categoryTree, activeTab, setActiveTab, setCurrentPath, setSelectedItem, setDetailStack,
        theme, toggleTheme, currentPath: globalPath, selectedItem: globalItem, toggleExpand, expandedPaths, setSearchQuery,
        navigateTo, selectItem, showDev, showDM
    };
    const [loadedContent, setLoadedContent] = useState('');
    const [contentLoading, setContentLoading] = useState(false);
    const [loadedOverview, setLoadedOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const scrollRef = useRef(null);

    // Ensure new pages start at the top
    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [entry.id]);

    // Fetch item content
    useEffect(() => {
        if (entry.type === 'file' && entry.item && entry.item.path) {
            setContentLoading(true);
            fetch(`/content/${entry.item.path}`)
                .then(res => res.text())
                .then(html => {
                    setLoadedContent(html);
                    setContentLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load content:', err);
                    setLoadedContent('<p class="text-red-500">内容加载失败。</p>');
                    setContentLoading(false);
                });
        } else {
            setLoadedContent('');
        }
    }, [entry]);

    // Fetch overview content
    useEffect(() => {
        if (entry.type === 'dir' && entry.path) {
            const getCategoryData = () => {
                let current = { _children: categoryTree };
                for (const part of entry.path) {
                    if (current._children && current._children[part]) {
                        current = current._children[part];
                    } else {
                        return null;
                    }
                }
                return current;
            };

            const categoryData = getCategoryData();
            if (categoryData && categoryData._selfFile) {
                setOverviewLoading(true);
                fetch(`/content/${categoryData._selfFile.path}`)
                    .then(res => res.text())
                    .then(html => {
                        // Extract first H1 or H2 as bilingual title
                        const match = html.match(/<(h[123])>(.*?)<\/\1>/i);
                        const displayTitle = match ? match[2].replace(/<[^>]+>/g, '').trim() : categoryData._selfFile.title;

                        setLoadedOverview({
                            html,
                            title: categoryData._selfFile.title,
                            displayTitle,
                            item: categoryData._selfFile
                        });
                        setOverviewLoading(false);
                    })
                    .catch(err => {
                        console.error('Failed to load overview:', err);
                        setLoadedOverview(null);
                        setOverviewLoading(false);
                    });
            } else {
                setLoadedOverview(null);
            }
        } else {
            setLoadedOverview(null);
        }
    }, [entry, categoryTree]);

    const currentCategoryData = useMemo(() => {
        if (entry.type !== 'dir' || !entry.path) return null;
        let current = { _children: categoryTree };
        for (const part of entry.path) {
            if (current._children && current._children[part]) {
                current = current._children[part];
            } else {
                return null;
            }
        }
        return current;
    }, [entry, categoryTree]);

    const selectedItem = entry.type === 'file' ? entry.item : null;
    const currentPath = entry.type === 'dir' ? entry.path : [];

    const isFeatCategory = useMemo(() => {
        return selectedItem && (
            selectedItem.id === '第五章：专长/起源专长.htm' ||
            selectedItem.id === '第五章：专长/通用专长.htm' ||
            selectedItem.id === '第五章：专长/战斗风格专长.htm' ||
            selectedItem.id === '第五章：专长/传奇恩惠专长.htm'
        );
    }, [selectedItem]);

    const isMasteryCategory = useMemo(() => {
        return selectedItem && selectedItem.id === '第六章：装备/精通词条/精通词条.htm';
    }, [selectedItem]);

    const featsInCategory = useMemo(() => {
        if (!isFeatCategory) return [];
        const catName = selectedItem.title;
        return featData.filter(f => f.category === catName);
    }, [isFeatCategory, selectedItem, featData]);

    const isMasteryDirectory = useMemo(() => {
        return entry.type === 'dir' && entry.path && entry.path.join('/') === '第六章：装备/精通词条';
    }, [entry]);

    const masteriesInCategory = useMemo(() => {
        if (!isMasteryCategory && !isMasteryDirectory) return [];
        return masteryData;
    }, [isMasteryCategory, isMasteryDirectory, masteryData]);

    const associatedWeapons = useMemo(() => {
        if (!selectedItem || selectedItem.category !== '精通词条') return [];
        return weaponData.filter(w => w.mastery === selectedItem.title);
    }, [selectedItem, weaponData]);

    const vgmRaces = useMemo(() => {
        if (!categoryTree) return [];
        // Find VGM directory
        const vgmKey = Object.keys(categoryTree).find(k => k.includes('VGM') || k.includes('瓦罗怪物指南'));
        if (!vgmKey) return [];

        const vgmNode = categoryTree[vgmKey];
        const raceNode = vgmNode._children['玩家可用种族'];
        if (!raceNode) return [];

        const races = [];
        // Direct races
        raceNode._files.forEach(f => {
            if (!f.isOverview && !f.title.includes('身高与体重')) {
                races.push(f);
            }
        });

        // Note: 怪物冒险者 files are now moved to raceNode._files by App.jsx data remapping
        const order = ["兽人", "地精", "大地精", "熊地精", "狗头人", "纯血原体蛇人", "天狗", "斑猫人", "梭螺鱼人", "歌利亚", "蜥蜴人", "费尔伯格人", "阿斯莫"];
        return races.sort((a, b) => {
            let titleA = a.title.replace('.html', '').replace('.htm', '').trim();
            let titleB = b.title.replace('.html', '').replace('.htm', '').trim();
            let idxA = order.indexOf(titleA);
            let idxB = order.indexOf(titleB);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
    }, [categoryTree]);

    const isVgmMain = useMemo(() => {
        return entry.type === 'dir' && entry.path && entry.path.length === 1 && (entry.path[0].includes('VGM') || entry.path[0].includes('瓦罗怪物指南'));
    }, [entry]);

    const isIPhone = useMemo(() => /iPhone/i.test(navigator.userAgent), []);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: isIPhone ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="detail-overlay"
            style={{ zIndex: 1500 + index }}
        >
            <header className="sticky-top-bar overlay-top-bar">
                <div className="top-bar-left">
                    <button onClick={onBack} className="top-bar-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="top-bar-title truncate max-w-[200px] sm:max-w-md">
                        {entry.type === 'menu' ? '目录' : (selectedItem ? selectedItem.title : (currentPath[currentPath.length - 1] || '目录'))}
                    </h1>
                </div>
                <div className="top-bar-actions">
                    <button onClick={toggleTheme} className="top-bar-theme-toggle" title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {(() => {
                        const bookmarkItem = selectedItem || loadedOverview?.item || (currentCategoryData ? {
                            id: currentCategoryData._id,
                            title: currentCategoryData._title,
                            pathParts: currentCategoryData._path,
                            isDir: true
                        } : null);

                        if (!bookmarkItem) return null;

                        return (
                            <button
                                onClick={() => openBookmarkDialog(bookmarkItem)}
                                className={`top-bar-search-btn ${isBookmarkedAnywhere(bookmarkItem.id) ? 'active' : ''}`}
                            >
                                <Heart fill={isBookmarkedAnywhere(bookmarkItem.id) ? "currentColor" : "none"} size={22} />
                            </button>
                        );
                    })()}
                </div>
            </header>

            <div className={`detail-overlay-content custom-scrollbar ${isLocked ? 'locked' : ''}`} ref={scrollRef}>
                {entry.type === 'menu' ? (
                    <div className="mobile-sidebar-overlay">
                        <SidebarContent
                            {...sidebarProps}
                            onNavigate={onBack}
                        />
                    </div>
                ) : (
                    <div className="p-6">
                        {selectedItem ? (
                            <>
                                {isFeatCategory ? (
                                    <div className="directory-view">
                                        <h3 className="section-title mb-4">专长列表</h3>
                                        <div className="item-grid">
                                            {featsInCategory.map(feat => (
                                                <ItemCard
                                                    key={feat.id}
                                                    item={feat}
                                                    onClick={() => onSelectItem(feat)}
                                                    isBookmarked={isBookmarkedAnywhere(feat.id)}
                                                    openBookmarkDialog={openBookmarkDialog}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : isMasteryCategory ? (
                                    <div className="directory-view">
                                        <h3 className="section-title mb-4">精通词条</h3>
                                        <div className="item-grid">
                                            {masteriesInCategory.map(mastery => (
                                                <ItemCard
                                                    key={mastery.id}
                                                    item={mastery}
                                                    onClick={() => onSelectItem(mastery)}
                                                    isBookmarked={isBookmarkedAnywhere(mastery.id)}
                                                    openBookmarkDialog={openBookmarkDialog}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : contentLoading ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                                        <p className="text-gold opacity-60">加载中...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedContent }} />
                                        {selectedItem.category === '精通词条' && (
                                            <WeaponTable weapons={associatedWeapons} />
                                        )}
                                    </>
                                )}
                            </>
                        ) : currentCategoryData ? (
                            <div className="directory-view">
                                {overviewLoading ? (
                                    <div className="overview-section mb-8 p-12 flex justify-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
                                    </div>
                                ) : loadedOverview ? (
                                    (() => {
                                        const hasItemsBelow = isMasteryDirectory ||
                                            Object.keys(currentCategoryData._children).length > 0 ||
                                            currentCategoryData._files.filter(f => !f.isOverview).length > 0;

                                        const overviewContent = (
                                            <div className="overview-section mb-8">
                                                <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedOverview.html }} />
                                            </div>
                                        );

                                        if (hasItemsBelow) {
                                            return (
                                                <CollapsibleSection title={loadedOverview.displayTitle || loadedOverview.title} icon={Folder} defaultExpanded={false}>
                                                    {overviewContent}
                                                </CollapsibleSection>
                                            );
                                        }
                                        return overviewContent;
                                    })()
                                ) : null}



                                {Object.keys(currentCategoryData._children).length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="section-title mb-4">子目录</h3>
                                        <div className="item-grid">
                                            {Object.entries(currentCategoryData._children)
                                                .filter(([name]) => {
                                                    if (name === '怪物冒险者' || name === '玩家可用种族') return false;
                                                    if (!showDM && ['CR 2', 'CR 3', 'CR 4', 'CR 5', 'CR 6'].includes(name)) return false;
                                                    return true;
                                                })
                                                .map(([name, node]) => (
                                                    <ItemCard
                                                        key={node._id}
                                                        item={{
                                                            id: node._id,
                                                            title: node._title,
                                                            pathParts: node._path,
                                                            isDir: true
                                                        }}
                                                        onClick={() => onNavigate(node._path)}
                                                        isBookmarked={isBookmarkedAnywhere(node._id)}
                                                        openBookmarkDialog={openBookmarkDialog}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const files = currentCategoryData._files.filter(f => !f.isOverview);
                                    const isAppendixB = entry.path && entry.path.some(p => p.includes('附录 B'));
                                    const sortedFiles = isAppendixB
                                        ? [...files].sort((a, b) => {
                                            const crA = parseCR(a.cr);
                                            const crB = parseCR(b.cr);
                                            if (crA !== crB) return crA - crB;
                                            return a.title.localeCompare(b.title, 'zh-CN');
                                        })
                                        : files;

                                    if (sortedFiles.length === 0) return null;

                                    return (
                                        <div>
                                            <h3 className="section-title mb-4">{isMasteryDirectory ? '精通词条' : '内容条目'}</h3>
                                            <div className="item-grid">
                                                {sortedFiles.map(item => (
                                                    <ItemCard
                                                        key={item.id}
                                                        item={item}
                                                        onClick={() => onSelectItem(item)}
                                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                                        openBookmarkDialog={openBookmarkDialog}
                                                    />
                                                ))}
                                            </div>

                                            {isVgmMain && vgmRaces.length > 0 && (
                                                <div className="mt-8">
                                                    <h3 className="section-title mb-4">玩家可用种族</h3>
                                                    <div className="item-grid">
                                                        {vgmRaces.map(race => (
                                                            <ItemCard
                                                                key={race.id}
                                                                item={race}
                                                                onClick={() => onSelectItem(race)}
                                                                isBookmarked={isBookmarkedAnywhere(race.id)}
                                                                openBookmarkDialog={openBookmarkDialog}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
