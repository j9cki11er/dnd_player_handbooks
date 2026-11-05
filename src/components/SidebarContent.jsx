import SpellStaffIcon from './SpellStaffIcon';
import React from 'react';
import { EXPANSION_TITLES, expansionLabel, expansionSections, isExpansionBook } from '../utils/expansions';
import { Folder, FileText, ChevronRight, ChevronDown, BookOpen, Swords, Search, Heart, Sun, Moon, User, Activity, Zap, TriangleAlert, Shapes } from 'lucide-react';
import { NavItem } from './Common';
import { glossaryName, glossaryTitles, navMascots } from '../utils/handbookNavigation';

const glossaryIcons = [Activity, Zap, TriangleAlert, Shapes];





const SidebarContent = ({
    categoryTree,
    activeTab,
    setActiveTab,
    switchTab,
    setCurrentPath,
    setSelectedItem,
    setDetailStack,
    theme,
    toggleTheme,
    currentPath,
    selectedItem,
    toggleExpand,
    expandedPaths,
    setSearchQuery,
    navigateTo,
    selectItem,
    onNavigate,
    featData,
    showDev,
    showDM
}) => {
    const handleNavClick = (callback) => {
        callback(!!onNavigate);
    };

    const glossaryFiles = categoryTree[glossaryName]?._files ?? [];
    const glossaryActive = !onNavigate && glossaryFiles.some(file =>
        file.id === selectedItem?.id && glossaryTitles.includes(file.title));
    const tabIcon = (id, Icon) => !onNavigate && activeTab === id && navMascots[id] &&
        !(id === 'browser' && glossaryActive)
        ? <img className="sidebar-nav-mascot" src={`/dfdnono/dfdnono${navMascots[id]}.webp`} alt="" />
        : <Icon size={20} />;

    const SidebarItem = ({ name, node, depth = 0 }) => {
        const pathStr = node._path.join('/');
        const isExpanded = expandedPaths[pathStr];
        const isActive = currentPath.join('/') === pathStr && !selectedItem;
        const hasChildren = Object.keys(node._children).length > 0;
        const nonOverviewFiles = node._files.filter(f => !f.isOverview);
        const expansionMenu = depth === 0 && isExpansionBook(node._path[0])
            ? expansionSections(node, featData).filter(([label]) => label !== '内容')
            : null;
        const hasMenu = expansionMenu ? expansionMenu.length > 0 : hasChildren || nonOverviewFiles.length > 0;

        return (
            <div className="sidebar-node" style={{ marginLeft: depth > 0 ? '12px' : '0' }}>
                <div className={`category-item ${isActive ? 'active' : ''}`}>
                    <div
                        className="chevron-wrapper cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(pathStr);
                        }}
                    >
                        {hasMenu ? (
                            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                        ) : <div style={{ width: 18 }} />}
                    </div>
                    <button
                        onClick={() => {
                            handleNavClick((push) => navigateTo(node._path, false, push));
                        }}
                        className="category-item-btn flex items-center gap-2 overflow-hidden flex-1 text-left"
                    >
                        <Folder size={14} className="opacity-50" />
                        <span className="truncate">{name}</span>
                    </button>
                </div>
                {isExpanded && hasMenu && !(node._path[0]?.includes('DMG 2024') && node._path[1] === '物品图鉴') && (
                    <div className="sidebar-children border-l border-gold/10 ml-2">
                        {expansionMenu ? expansionMenu.map(([label]) => (
                                <div key={label} className="sidebar-node expansion-section-link">
                                    <div className="category-item">
                                        <div className="chevron-wrapper" aria-hidden="true" />
                                        <button type="button" className="category-item-btn flex items-center gap-2 overflow-hidden flex-1 text-left"
                                            onClick={() => navigateTo(node._path, false, Boolean(onNavigate), label)}>
                                            <Folder size={14} className="opacity-50" aria-hidden="true" />
                                            <span className="truncate">{label}</span>
                                        </button>
                                    </div>
                                </div>
                            )) : <>
                        {Object.entries(node._children)
                            .filter(([childName]) => {
                                if (node._path[0] !== '附录 B：生物数据卡' && !showDM
                                    && ['CR 2', 'CR 3', 'CR 4', 'CR 5', 'CR 6'].includes(childName)) return false;
                                return true;
                            })
                            .map(([childName, childNode]) => (
                                <SidebarItem key={childName} name={childName} node={childNode} depth={depth + 1} />
                            ))}
                        {nonOverviewFiles
                            .filter(f => {
                                if (showDM) return true;
                                if (f.dmOnly) return false;
                                return true;
                            })



                            .map(file => {

                                const fileActive = selectedItem?.id === file.id;
                                return (
                                    <button
                                        key={file.id}
                                        onClick={() => {
                                            handleNavClick((push) => {
                                                selectItem(file, push);
                                                if (file.pathParts?.[0] === '附录 B：生物数据卡') return;
                                                setCurrentPath(node._path);
                                                setActiveTab('browser');
                                            });
                                        }}
                                        className={`category-item file-item ${fileActive ? 'active' : ''}`}
                                        style={{ marginLeft: '12px' }}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={14} className="opacity-50" />
                                            <span className="truncate text-xs">{file.title}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <a href="/" className="sidebar-header" onClick={(e) => { e.preventDefault(); handleNavClick(() => { setActiveTab('browser'); setCurrentPath([]); setSelectedItem(null); setDetailStack([]); }); }}>
                <img src="/DFD logo-cropped.png" alt="Logo" className="sidebar-logo" />
                <div className="flex flex-col">
                    <span className="logo-text dnd-font gold-text leading-tight">Don't Feed Dragon <br></br>不要喂龙公会</span>
                </div>
            </a>

            <div className="theme-toggle-container">
                <button onClick={toggleTheme} className="theme-toggle-btn">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{theme === 'dark' ? '切换浅色模式' : '切换深色模式'}</span>
                </button>
            </div>

            <span className="sidebar-page-title">DnD 玩家手册2024</span>

            <nav className="nav-menu">
                <NavItem
                    icon={tabIcon('browser', BookOpen)}
                    label="玩家手册"
                    active={activeTab === 'browser' && !glossaryActive}
                    onClick={() => switchTab('browser')}
                />
                <NavItem
                    icon={tabIcon('spells', SpellStaffIcon)}
                    label="法术列表"
                    active={activeTab === 'spells'}
                    onClick={() => switchTab('spells')}
                />
                <NavItem icon={tabIcon('items', Swords)} label="武器装备" active={activeTab === 'items'} onClick={() => switchTab('items')} />
                {showDev && (
                    <NavItem
                        icon={<User size={20} />}
                        label="角色卡"
                        active={activeTab === 'character'}
                        onClick={() => switchTab('character')}
                    />
                )}
                <NavItem
                    icon={tabIcon('search', Search)}
                    label="全局搜索"
                    active={activeTab === 'search'}
                    onClick={() => switchTab('search')}
                />
                <NavItem
                    icon={tabIcon('bookmarks', Heart)}
                    label="我的收藏"
                    active={activeTab === 'bookmarks'}
                    onClick={() => switchTab('bookmarks')}
                />
            </nav>

            {!onNavigate ? (
                <section className="sidebar-section" aria-labelledby="sidebar-glossary-title">
                    <h2 id="sidebar-glossary-title" className="section-title">常用知识</h2>
                    <nav className="nav-menu" aria-label="常用知识">
                        {glossaryTitles.map((title, index) => {
                            const item = glossaryFiles.find(file => file.title === title);
                            if (!item) return null;
                            const Icon = glossaryIcons[index];
                            return <NavItem key={item.id} icon={<Icon size={20} />} label={title}
                                active={selectedItem?.id === item.id}
                                onClick={() => {
                                    if (activeTab !== 'browser') switchTab('browser');
                                    selectItem(item);
                                }} />;
                        })}
                    </nav>
                </section>
            ) : <>
            <details className="sidebar-section sidebar-directory-section">
                <summary className="section-title">分类目录</summary>
                <div className="category-list">
                    {Object.entries(categoryTree)
                        .filter(([catName]) => !isExpansionBook(catName))
                        .sort(([a], [b]) => {
                            const order = [
                                '序章', '第一章', '第二章', '第三章', '第四章', '第五章', '第六章', '第七章', '附录 A', '附录 B', '附录 C'
                            ];
                            const getIndex = (name) => {
                                for (let i = 0; i < order.length; i++) {
                                    if (name.includes(order[i])) return i;
                                }
                                return 999;
                            };
                            return getIndex(a) - getIndex(b);
                        })
                        .map(([catName, catNode]) => (
                            <SidebarItem key={catName} name={catName} node={catNode} />
                        ))}
                </div>
            </details>

            <details className="sidebar-section sidebar-directory-section">
                <summary className="section-title">扩充手册</summary>
                <div className="category-list">
                    {EXPANSION_TITLES.filter(name => categoryTree[name]).map(name => (
                        <SidebarItem key={name} name={expansionLabel(name)} node={categoryTree[name]} />
                    ))}
                </div>
            </details>
            </>}
        </>
    );
};

export default SidebarContent;
