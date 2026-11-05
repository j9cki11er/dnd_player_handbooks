import DisplaySettings from './DisplaySettings';
import { expansionLabel, expansionSections, isExpansionBook } from '../utils/expansions';
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Heart, Folder } from 'lucide-react';
import { MagicBrowser } from './ItemCatalog';
import { loadContent } from '../utils/content';
import { formatCreatureBlocks } from '../utils/spellSummary';
import { ItemCard, WeaponTable, CollapsibleSection } from './Common';





function showConditionDialog(card) {
    const dialog = card.closest('.dnd-content').querySelector('.condition-dialog');
    dialog.querySelector('h3').replaceChildren(...card.querySelector('h3').cloneNode(true).childNodes);
    const art = card.querySelector('.condition-art-frame')?.cloneNode(true);
    if (art) art.querySelector('img').loading = 'eager';
    dialog.querySelector('.condition-dialog-art').replaceChildren(...(art ? [art] : []));
    const rules = card.querySelector('.condition-card-body').cloneNode(true);
    dialog.querySelector('.condition-dialog-rules').replaceChildren(...rules.childNodes);
    dialog.showModal();
    dialog.scrollTop = 0;
}

function scrollToContentAnchor(event) {
    const toggle = event.target.closest('.condition-card-toggle');
    if (toggle) {
        showConditionDialog(toggle.closest('.condition-card'));
        return;
    }
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = Array.from(event.currentTarget.querySelectorAll('[id]')).find(node => node.id === id);
    if (!target) return;
    event.preventDefault();
    const conditionToggle = target.closest('.condition-card')?.querySelector('.condition-card-toggle');
    if (conditionToggle?.getClientRects().length) {
        showConditionDialog(conditionToggle.closest('.condition-card'));
        return;
    }
    (target.closest('.condition-card-header') || target).scrollIntoView({ block: 'start' });
}

export default function DetailScreen({
    entry, index, onBack, onNavigate, onSelectItem, openBookmarkDialog, isBookmarkedAnywhere, categoryTree, isMobile,
    SidebarContent, activeTab, setActiveTab, switchTab, setCurrentPath, setSelectedItem, setDetailStack, theme, toggleTheme,
    currentPath: globalPath, selectedItem: globalItem, toggleExpand, expandedPaths, setSearchQuery, navigateTo, selectItem,
    parseCR, featData, masteryData, weaponData, invocationData, isLocked, showDev, showDM,
    isExternalBack
}) {
    const sidebarProps = {
        categoryTree, activeTab, setActiveTab, switchTab, setCurrentPath, setSelectedItem, setDetailStack,
        theme, toggleTheme, currentPath: globalPath, selectedItem: globalItem, toggleExpand, expandedPaths, setSearchQuery,
        navigateTo, selectItem, featData, showDev, showDM
    };
    const [loadedContent, setLoadedContent] = useState('');
    const [contentLoading, setContentLoading] = useState(() => entry.type === 'file' && Boolean(entry.item?.path));
    const [loadedOverview, setLoadedOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const scrollRef = useRef(null);

    // Ensure new pages start at the top
    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [entry.id]);

    // Fetch item content
    useEffect(() => {
        const controller = new AbortController();
        setLoadedContent('');
        setContentLoading(false);
        if (entry.type === 'file' && entry.item && entry.item.path) {
            setContentLoading(true);
            loadContent(entry.item.path, controller.signal)
                .then(html => {
                    setLoadedContent(formatCreatureBlocks(html).html);
                    setContentLoading(false);
                })
                .catch(err => {
                    if (controller.signal.aborted) return;
                    console.error('Failed to load content:', err);
                    setLoadedContent('<p class="text-red-500">内容加载失败。</p>');
                    setContentLoading(false);
                });
        } else {
            setLoadedContent('');
        }
        return () => controller.abort();
    }, [entry.id, entry.type, entry.item]);

    // Fetch overview content
    useEffect(() => {
        const controller = new AbortController();
        setLoadedOverview(null);
        setOverviewLoading(false);
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
                loadContent(categoryData._selfFile.path, controller.signal)
                    .then(html => {
                        // Extract first H1 or H2 as bilingual title
                        const match = html.match(/<(h[123])>(.*?)<\/\1>/i);
                        const displayTitle = match ? match[2].replace(/<[^>]+>/g, '').trim() : categoryData._selfFile.title;

                        setLoadedOverview({
                            html: formatCreatureBlocks(html).html,
                            title: categoryData._selfFile.title,
                            displayTitle,
                            item: categoryData._selfFile
                        });
                        setOverviewLoading(false);
                    })
                    .catch(err => {
                        if (controller.signal.aborted) return;
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
        return () => controller.abort();
    }, [entry.id, entry.type, entry.path, categoryTree]);

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
            Boolean(selectedItem.featCategory) ||
            selectedItem.id === '第五章：专长/起源专长.htm' ||
            selectedItem.id === '第五章：专长/通用专长.htm' ||
            selectedItem.id === '第五章：专长/战斗风格专长.htm' ||
            selectedItem.id === '第五章：专长/传奇恩惠专长.htm'
        );
    }, [selectedItem]);

    const isMasteryCategory = useMemo(() => {
        return selectedItem && selectedItem.id === '第六章：装备/精通词条/精通词条.htm';
    }, [selectedItem]);

    const isInvocationCategory = useMemo(() => {
        return selectedItem?.id === '第三章：角色职业/魔契师/魔能祈唤选项.htm' ||
            selectedItem?.id === '珊娜萨的万事指南 (XGE)/角色选项/魔契师/魔能祈唤.htm';
    }, [selectedItem]);

    const invocationsByLevel = useMemo(() => {
        if (!isInvocationCategory) return {};
        const groups = {
            0: [], 2: [], 5: [], 7: [], 9: [], 12: [], 15: []
        };
        const sourceBook = selectedItem?.sourceBook;
        invocationData.filter(inv => inv.sourceBook === sourceBook).forEach(inv => {
            const level = inv.reqLevel || 0;
            if (!groups[level]) groups[level] = [];
            groups[level].push(inv);
        });
        return groups;
    }, [isInvocationCategory, invocationData, selectedItem?.sourceBook]);

    const levelLabels = {
        0: '先决：无',
        2: '魔契师等级 2+',
        5: '魔契师等级 5+',
        7: '魔契师等级 7+',
        9: '魔契师等级 9+',
        12: '魔契师等级 12+',
        15: '魔契师等级 15+'
    };

    const featsInCategory = useMemo(() => {
        if (!isFeatCategory) return [];
        const catName = selectedItem.featCategory || selectedItem.title;
        return featData.filter(f => f.category === catName && f.sourceBook === selectedItem.sourceBook);
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

    const bookSections = entry.type === 'dir' && entry.path?.length === 1 &&
        currentCategoryData && isExpansionBook(entry.path[0])
        ? expansionSections(currentCategoryData, featData)
        : null;

    useLayoutEffect(() => {
        if (!entry.section) return;
        const target = Array.from(scrollRef.current?.querySelectorAll('[data-expansion-section]') || [])
            .find(section => section.dataset.expansionSection === entry.section);
        if (target) {
            const scroller = scrollRef.current;
            scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        }
    }, [entry.section]);

    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={reduceMotion ? false : { x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion || isExternalBack ? { transition: { duration: 0 } } : { x: 16, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="detail-overlay"
            style={{ zIndex: 1500 + index }}
        >
            <header className="sticky-top-bar overlay-top-bar">
                <div className="top-bar-left">
                    <button onClick={onBack} className="top-bar-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="top-bar-title truncate max-w-[200px] sm:max-w-md">
                        {entry.type === 'menu' ? '目录' : (selectedItem ? selectedItem.title : expansionLabel(currentPath.at(-1) || '目录'))}
                    </h1>
                </div>
                <div className="top-bar-actions">
                    <DisplaySettings theme={theme} toggleTheme={toggleTheme} />
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
                                        <div className="item-grid reference-card-grid">
                                            {featsInCategory.map(feat => (
                                                <ItemCard
                                                    lightweight
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
                                        <div className="item-grid reference-card-grid">
                                            {masteriesInCategory.map(mastery => (
                                                <ItemCard
                                                    lightweight
                                                    key={mastery.id}
                                                    item={mastery}
                                                    onClick={() => onSelectItem(mastery)}
                                                    isBookmarked={isBookmarkedAnywhere(mastery.id)}
                                                    openBookmarkDialog={openBookmarkDialog}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : isInvocationCategory ? (
                                    <div className="directory-view">
                                        <h3 className="section-title mb-4">{selectedItem.title}</h3>
                                        <div className="flex flex-col gap-8">
                                            {Object.keys(invocationsByLevel).sort((a, b) => Number(a) - Number(b)).map(level => {
                                                const group = invocationsByLevel[level];
                                                if (group.length === 0) return null;
                                                return (
                                                    <div key={level} className="invocation-group">
                                                        <h4 className="text-gold opacity-80 mb-3 px-1 border-l-2 border-gold/30 pl-3">
                                                            {levelLabels[level] || `魔契师等级 ${level}+`}
                                                        </h4>
                                                        <div className="item-grid reference-card-grid">
                                                            {group.map(inv => (
                                                                <ItemCard
                                                                    lightweight
                                                                    key={inv.id}
                                                                    item={inv}
                                                                    onClick={() => onSelectItem(inv)}
                                                                    isBookmarked={isBookmarkedAnywhere(inv.id)}
                                                                    openBookmarkDialog={openBookmarkDialog}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : contentLoading ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                                        <p className="text-gold opacity-60">加载中...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dnd-content" onClick={scrollToContentAnchor} dangerouslySetInnerHTML={{ __html: loadedContent }} />
                                        {selectedItem.category === '精通词条' && (
                                            <WeaponTable weapons={associatedWeapons} />
                                        )}
                                    </>
                                )}
                            </>
                        ) : currentPath[0]?.includes('DMG 2024') && currentPath[1] === '物品图鉴' ? (
                            <MagicBrowser key={currentPath.join('/')} initialType={currentPath[2] || ''} initialRarity={currentPath[3] || '普通'} {...{openBookmarkDialog, isBookmarkedAnywhere}} />
                        ) : currentCategoryData ? (
                            <div className="directory-view">
                                {overviewLoading && currentCategoryData._selfFile ? (
                                    <CollapsibleSection
                                        title="正在加载概述"
                                        icon={Folder}
                                        defaultExpanded={false}
                                        loading
                                        headerClassName="overview-skeleton"
                                    />
                                ) : loadedOverview ? (
                                    (() => {
                                        const hasItemsBelow = Boolean(bookSections?.length) || isMasteryDirectory ||
                                            Object.keys(currentCategoryData._children).length > 0 ||
                                            currentCategoryData._files.filter(f => !f.isOverview).length > 0;

                                        const overviewContent = (
                                            <div className="overview-section mb-8">
                                                <div className="dnd-content" onClick={scrollToContentAnchor} dangerouslySetInnerHTML={{ __html: loadedOverview.html }} />
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



                                {bookSections ? bookSections.map(([label, items]) => {
                                    const cards = (
                                        <div className="item-grid reference-card-grid">
                                            {items.map(item => (
                                                <ItemCard
                                                    lightweight
                                                    key={item.id}
                                                    item={item}
                                                    onClick={() => item.isDir ? onNavigate(item.pathParts) : onSelectItem(item)}
                                                    isBookmarked={isBookmarkedAnywhere(item.id)}
                                                    openBookmarkDialog={openBookmarkDialog}
                                                />
                                            ))}
                                        </div>
                                    );
                                    return label === '内容' ? (
                                        <section key={label} className="mb-8">
                                            <h3 className="section-title mb-4">内容</h3>
                                            {cards}
                                        </section>
                                    ) : (
                                        <details key={label} data-expansion-section={label}
                                            className="expansion-content mb-8" open={entry.section === label}>
                                            <summary className="section-title mb-4">{label}</summary>
                                            {cards}
                                        </details>
                                    );
                                }) : <>
                                {Object.keys(currentCategoryData._children).length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="section-title mb-4">分类</h3>
                                        <div className="item-grid reference-card-grid">
                                            {Object.entries(currentCategoryData._children)
                                                .filter(([name]) => {
                                                    if (name === '怪物冒险者' || name === '玩家可用种族') return false;
                                                    if (entry.path?.[0] !== '附录 B：生物数据卡' && !showDM
                                                        && ['CR 2', 'CR 3', 'CR 4', 'CR 5', 'CR 6'].includes(name)) return false;
                                                    return true;
                                                })
                                                .map(([name, node]) => (
                                                    <ItemCard
                                                        lightweight
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

                                    const filteredFiles = sortedFiles;

                                    if (filteredFiles.length === 0) return null;

                                    return (
                                        <div>
                                            <h3 className="section-title mb-4">{isMasteryDirectory ? '精通词条' : '内容'}</h3>
                                            <div className="item-grid reference-card-grid">
                                                {filteredFiles.map(item => (
                                                    <ItemCard
                                                        lightweight
                                                        key={item.id}
                                                        item={item}
                                                        onClick={() => onSelectItem(item)}
                                                        isBookmarked={isBookmarkedAnywhere(item.id)}
                                                        openBookmarkDialog={openBookmarkDialog}
                                                    />
                                                ))}
                                            </div>


                                        </div>
                                    );
                                })()}
                                </>}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
