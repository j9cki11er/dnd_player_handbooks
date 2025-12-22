import React from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Layout, Book, Search, Heart, Sun, Moon } from 'lucide-react';
import { NavItem } from './Common';

const SidebarContent = ({
    categoryTree,
    activeTab,
    setActiveTab,
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
    onNavigate
}) => {
    const handleNavClick = (callback) => {
        callback(!!onNavigate);
    };

    const SidebarItem = ({ name, node, depth = 0 }) => {
        const pathStr = node._path.join('/');
        const isExpanded = expandedPaths[pathStr];
        const isActive = currentPath.join('/') === pathStr && !selectedItem;
        const hasChildren = Object.keys(node._children).length > 0;
        const nonOverviewFiles = node._files.filter(f => !f.isOverview);

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
                        {hasChildren || nonOverviewFiles.length > 0 ? (
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
                {isExpanded && (
                    <div className="sidebar-children border-l border-gold/10 ml-2">
                        {Object.entries(node._children).map(([childName, childNode]) => (
                            <SidebarItem key={childName} name={childName} node={childNode} depth={depth + 1} />
                        ))}
                        {nonOverviewFiles.map(file => {
                            const fileActive = selectedItem?.id === file.id;
                            return (
                                <button
                                    key={file.id}
                                    onClick={() => {
                                        handleNavClick((push) => {
                                            selectItem(file, push);
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
            <br></br>
            <span className="sidebar-page-title gold-text opacity-80">DnD 玩家手册2024</span>

            <nav className="nav-menu">
                <NavItem
                    icon={<Layout size={20} />}
                    label="资料游览"
                    active={activeTab === 'browser'}
                    onClick={() => handleNavClick(() => { setActiveTab('browser'); setCurrentPath([]); setSelectedItem(null); setDetailStack([]); })}
                />
                <NavItem
                    icon={<Book size={20} />}
                    label="法术列表"
                    active={activeTab === 'spells'}
                    onClick={() => handleNavClick(() => { setActiveTab('spells'); setSelectedItem(null); setDetailStack([]); setSearchQuery(''); })}
                />
                <NavItem
                    icon={<Search size={20} />}
                    label="全局搜索"
                    active={activeTab === 'search'}
                    onClick={() => handleNavClick(() => { setActiveTab('search'); setSelectedItem(null); setDetailStack([]); })}
                />
                <NavItem
                    icon={<Heart size={20} />}
                    label="我的收藏"
                    active={activeTab === 'bookmarks'}
                    onClick={() => handleNavClick(() => { setActiveTab('bookmarks'); setSelectedItem(null); setDetailStack([]); })}
                />
            </nav>

            <div className="sidebar-section">
                <h3 className="section-title">分类目录</h3>
                <div className="category-list">
                    {Object.entries(categoryTree).map(([catName, catNode]) => (
                        <SidebarItem key={catName} name={catName} node={catNode} />
                    ))}
                </div>
            </div>

            <div className="theme-toggle-container">
                <button onClick={toggleTheme} className="theme-toggle-btn">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{theme === 'dark' ? '切换浅色模式' : '切换深色模式'}</span>
                </button>
            </div>
        </>
    );
};

export default SidebarContent;
