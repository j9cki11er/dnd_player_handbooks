import React, { useState, useEffect, useMemo } from 'react';
import data from './data.json';
import spellData from './data-spells.json';
import { Search, Bookmark, Book, Layout, ChevronRight, ChevronUp, X, FolderPlus, Trash2, Heart, Plus, Folder, FileText, ChevronDown, Menu, FilterX, Sun, Moon, ArrowLeft } from 'lucide-react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';

const CHAPTERS_TO_SHOW = [
  '第一章：进行游戏',
  '第二章：创建角色',
  '第三章：角色职业',
  '第四章：角色起源',
  '第五章：专长',
  '第六章：装备',
  '第七章：法术',
  '附录 A：多元宇宙',
  '附录 B：生物数据卡',
  '附录 C：术语汇编'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('browser'); // browser, bookmarks, search, spells
  const [selectedItem, setSelectedItem] = useState(null); // The actual content item to show (file)
  const [currentPath, setCurrentPath] = useState([]); // Array of strings represent current directory path
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('dnd-bookmarks');
    return saved ? JSON.parse(saved) : { '默认': [] };
  });
  const [expandedPaths, setExpandedPaths] = useState({}); // Track expanded folders in sidebar
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({}); // { folderName: boolean }
  const [expandedCategories, setExpandedCategories] = useState({}); // { "folderName-catName": boolean }
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // New State for Spell Browser
  const [spellFilters, setSpellFilters] = useState({ class: '全部', level: '0' });

  // New State for Folder Management
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Content loading states
  const [loadedContent, setLoadedContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [loadedOverview, setLoadedOverview] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('dnd-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // --- START BACK BUTTON SUPPORT ---
  // Sync state to history when important navigation state changes
  useEffect(() => {
    const currentState = {
      activeTab,
      currentPath,
      selectedId: selectedItem?.id || null
    };

    // Replace state if it's the initial load or a minor change we don't want to push
    // For now, let's push for all major transitions.
    // To prevent infinite loops with popstate, we'll check a flag.
    if (!window._isPopStateNavigating) {
      // Check if the state is actually different from current history state to avoid duplicates
      const historyState = window.history.state;
      const isDifferent = !historyState ||
        historyState.activeTab !== currentState.activeTab ||
        JSON.stringify(historyState.currentPath) !== JSON.stringify(currentState.currentPath) ||
        historyState.selectedId !== currentState.selectedId;

      if (isDifferent) {
        window.history.pushState(currentState, '', '');
      }
    }
    window._isPopStateNavigating = false;
  }, [activeTab, currentPath, selectedItem]);

  // Listen for back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) {
        window._isPopStateNavigating = true;
        const { activeTab, currentPath, selectedId } = event.state;

        setActiveTab(activeTab);
        setCurrentPath(currentPath);

        if (selectedId) {
          // Find the item object from our data
          const item = resolveBookmarkItem(selectedId);
          setSelectedItem(item);
        } else {
          setSelectedItem(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    // Initialize history state on first load
    window.history.replaceState({
      activeTab,
      currentPath,
      selectedId: selectedItem?.id || null
    }, '', '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // --- END BACK BUTTON SUPPORT ---

  const fuse = useMemo(() => new Fuse(data, {
    keys: ['title', 'category', 'pathParts'],
    threshold: 0.3
  }), []);

  const spellFuse = useMemo(() => new Fuse(spellData, {
    keys: ['title', 'titleEn'],
    threshold: 0.3
  }), []);

  const searchResults = useMemo(() => {
    if (!searchQuery) return { categories: [], spells: [] };
    return {
      categories: fuse.search(searchQuery).map(r => r.item),
      spells: spellFuse.search(searchQuery).map(r => r.item)
    };
  }, [searchQuery, fuse, spellFuse]);

  // Memoize filtered spells
  const filteredSpells = useMemo(() => {
    return spellData.filter(spell => {
      const classMatch = spellFilters.class === '全部' || spell.classes.includes(spellFilters.class);
      // spell.levelNumeric is number, spellFilters.level is '全部' or number/string '0'
      const levelMatch = spellFilters.level === '全部' || spell.levelNumeric === parseInt(spellFilters.level);
      const searchMatch = !searchQuery ||
        spell.title.includes(searchQuery) ||
        spell.titleEn.toLowerCase().includes(searchQuery.toLowerCase());

      return classMatch && levelMatch && searchMatch;
    });
  }, [spellFilters, searchQuery]);

  // Build tree structure for the sidebar
  const categoryTree = useMemo(() => {
    const tree = {};
    const norm = (s) => s ? s.replace(/\s+/g, '').toLocaleLowerCase() : '';

    data.forEach(item => {
      let current = tree;
      item.pathParts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            _isDir: true,
            _children: {},
            _files: [],
            _path: item.pathParts.slice(0, index + 1),
            _selfFile: null,
            _id: `dir:${item.pathParts.slice(0, index + 1).join('/')}`,
            _title: part
          };

        }
        current = current[part]._children;
      });

      const parent = item.pathParts.reduce((acc, part) => acc._children[part], { _children: tree });
      parent._files.push(item);
    });

    const visit = (node, parentNode = null) => {
      Object.entries(node).forEach(([name, data]) => {
        if (data._isDir) {
          const normalizedName = norm(name);

          // 1. Check for internal overview (_概述.htm or Folder/Folder.htm)
          let overview = data._files.find(f => f.isOverview);

          // 2. Check for "Sibling" overview in parent folder (e.g. D20检定.htm for D20 检定/ folder)
          if (!overview && parentNode) {
            overview = parentNode._files.find(f => {
              const fname = f.id.split('/').pop().replace(/\.[^/.]+$/, "");
              return norm(f.title) === normalizedName || norm(fname) === normalizedName;
            });
          }

          if (overview) {
            data._selfFile = overview;
          }

          visit(data._children, data);
        }
      });
    };

    visit(tree);
    return tree;
  }, []);

  const currentCategoryData = useMemo(() => {
    if (currentPath.length === 0) return null;
    let current = { _children: categoryTree };
    for (const part of currentPath) {
      if (current._children && current._children[part]) {
        current = current._children[part];
      } else {
        return null;
      }
    }
    return current;
  }, [currentPath, categoryTree]);

  // Fetch item content
  useEffect(() => {
    if (selectedItem && selectedItem.path) {
      setContentLoading(true);
      fetch(`/content/${selectedItem.path}`)
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
  }, [selectedItem]);

  // Fetch overview content
  useEffect(() => {
    if (activeTab === 'browser' && !selectedItem && currentCategoryData) {
      const overview = currentCategoryData._selfFile;
      if (overview) {
        setOverviewLoading(true);
        fetch(`/content/${overview.path}`)
          .then(res => res.text())
          .then(html => {
            setLoadedOverview({ html, title: overview.title, item: overview });
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
    } else if (activeTab === 'browser' && !selectedItem && !currentCategoryData) {
      // Clear overview when returning to home screen
      setLoadedOverview(null);
    }
  }, [currentCategoryData, selectedItem, activeTab]);


  const toggleExpand = (pathStr) => {
    setExpandedPaths(prev => ({
      ...prev,
      [pathStr]: !prev[pathStr]
    }));
  };

  const navigateTo = (path, shouldExpand = true) => {
    setCurrentPath(path);
    setSelectedItem(null);
    setActiveTab('browser');

    // Auto expand parent
    if (shouldExpand) {
      const pathStr = path.join('/');
      setExpandedPaths(prev => ({ ...prev, [pathStr]: true }));
    }
    setIsMobileMenuOpen(false);
  };

  const toggleBookmark = (id, folder) => {
    setBookmarks(prev => {
      const folderItems = prev[folder] || [];
      const isAlreadyInThisFolder = folderItems.includes(id);
      if (isAlreadyInThisFolder) {
        return { ...prev, [folder]: folderItems.filter(i => i !== id) };
      } else {
        return { ...prev, [folder]: [...folderItems, id] };
      }
    });
  };

  const createFolder = (name) => {
    if (!name || bookmarks[name]) return;
    setBookmarks(prev => ({ ...prev, [name]: [] }));
  };

  const deleteFolder = (name) => {
    if (name === '默认') return;
    setConfirmConfig({
      title: '删除文件夹',
      message: `确定要删除文件夹“${name}”吗？其中包含的所有收藏项也将被移除。`,
      confirmText: '确认删除',
      isDanger: true,
      onConfirm: () => {
        setBookmarks(prev => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
        setConfirmConfig(null);
      }
    });
  };

  const isBookmarkedAnywhere = (id) => {
    return Object.values(bookmarks).some(folder => folder.includes(id));
  };

  const clearFolder = (folderName) => {
    setConfirmConfig({
      title: '清空文件夹',
      message: `确定要清空“${folderName}”中的所有收藏吗？`,
      onConfirm: () => {
        setBookmarks(prev => ({
          ...prev,
          [folderName]: []
        }));
        setConfirmConfig(null);
      }
    });
  };

  const clearAllBookmarks = () => {
    setConfirmConfig({
      title: '全局清空',
      message: '确定要清除所有收藏并重置吗？这将清除所有文件夹中的内容。',
      confirmText: '全部清空',
      isDanger: true,
      onConfirm: () => {
        setBookmarks({ '默认': [] });
        localStorage.setItem('dnd-bookmarks', JSON.stringify({ '默认': [] }));
        setConfirmConfig(null);
      }
    });
  };

  const toggleAllFolders = (expand) => {
    const newState = {};
    Object.keys(bookmarks).forEach(f => {
      newState[f] = expand;
    });
    setExpandedFolders(newState);
  };

  const openBookmarkDialog = (item) => {
    setPendingBookmark(item);
    setIsBookmarkModalOpen(true);
  };

  const resolveBookmarkItem = (id) => {
    if (id.startsWith('dir:')) {
      const pathStr = id.replace('dir:', '');
      const parts = pathStr.split('/');
      let current = categoryTree;
      let node = null;
      for (const part of parts) {
        if (current && current[part]) {
          node = current[part];
          current = current[part]._children;
        } else {
          return null;
        }
      }
      if (!node) return null;
      return {
        id: node._id,
        title: node._title,
        pathParts: node._path,
        isDir: true,
        path: node._selfFile?.path // Include path for overview if available
      };
    }
    // Check if it's a spell first for better matching
    const spell = spellData.find(s => s.id === id);
    if (spell) {
      return {
        ...spell,
        pathParts: spell.pathParts || ['法术']
      };
    }
    // Then check files
    const file = data.find(i => i.id === id);
    if (file) return file;
    return null;
  };

  const isSelectedSpell = useMemo(() => {
    if (!selectedItem) return false;
    const item = resolveBookmarkItem(selectedItem.id) || selectedItem;
    return item.castingTime || (item.pathParts && item.pathParts.join(' ').includes('法术'));
  }, [selectedItem, resolveBookmarkItem]);

  const showGlobalDetail = useMemo(() => {
    if (!selectedItem) return false;
    // On mobile, all items should open the global detail view
    if (isMobile) return true;

    // Desktop behavior remains unchanged:
    // Spells tab handles its own detail view (split pane)
    if (activeTab === 'spells') return false;
    // Bookmarks handles its own detail view on desktop (split pane)
    if (activeTab === 'bookmarks') return false;

    // Browser and Search use the global detail view
    return true;
  }, [selectedItem, activeTab, isMobile]);


  // Sidebar Recursive Component
  const SidebarItem = ({ name, node, depth = 0 }) => {
    const pathStr = node._path.join('/');
    const isExpanded = expandedPaths[pathStr];
    const isActive = currentPath.join('/') === pathStr && !selectedItem;
    const hasChildren = Object.keys(node._children).length > 0;
    const nonOverviewFiles = node._files.filter(f => !f.isOverview);

    return (
      <div className="sidebar-node" style={{ marginLeft: depth > 0 ? '12px' : '0' }}>
        <button
          onClick={() => {
            toggleExpand(pathStr);
            navigateTo(node._path, false);
          }}
          className={`category-item ${isActive ? 'active' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {hasChildren || nonOverviewFiles.length > 0 ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : <div style={{ width: 14 }} />}
            <Folder size={14} className="opacity-50" />
            <span className="truncate">{name}</span>
          </div>
        </button>
        {isExpanded && (
          <div className="sidebar-children border-l border-gold/10 ml-2">
            {/* Sub-folders */}
            {Object.entries(node._children).map(([childName, childNode]) => (
              <SidebarItem key={childName} name={childName} node={childNode} depth={depth + 1} />
            ))}
            {/* Files directly under this folder */}
            {nonOverviewFiles.map(file => {
              const fileActive = selectedItem?.id === file.id;
              return (
                <button
                  key={file.id}
                  onClick={() => {
                    setSelectedItem(file);
                    setCurrentPath(node._path);
                    setActiveTab('browser');
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

  const TopBar = () => {
    const getTitle = () => {
      if (selectedItem) return selectedItem.title;

      switch (activeTab) {
        case 'browser':
          if (loadedOverview) return loadedOverview.title;
          return '资料浏览';
        case 'spells': return '法术列表';
        case 'search': return '全局搜索';
        case 'bookmarks': return '我的收藏';
        default: return '资料浏览';
      }
    };

    const handleBack = () => {
      if (selectedItem) {
        setSelectedItem(null);
      } else if (currentPath.length > 0) {
        // Go up one level
        const newPath = currentPath.slice(0, currentPath.length - 1);
        setCurrentPath(newPath);
      }
    };

    const showBackButton = (activeTab === 'browser' && (currentPath.length > 0 || selectedItem)) ||
      (activeTab !== 'browser' && selectedItem);

    return (
      <header className="sticky-top-bar">
        <div className="top-bar-left">
          {showBackButton && (
            <button onClick={handleBack} className="top-bar-back-btn">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="top-bar-title">{getTitle()}</h1>
        </div>
        <div className="top-bar-actions">
          {activeTab !== 'search' && (
            <button onClick={() => { setActiveTab('search'); setSelectedItem(null); }} className="top-bar-search-btn">
              <Search size={22} />
            </button>
          )}
        </div>
      </header>
    );
  };

  return (
    <div className="app-container">
      <TopBar />
      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <a href="/" className="sidebar-header">
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
            onClick={() => { setActiveTab('browser'); setCurrentPath([]); setSelectedItem(null); }}
          />
          <NavItem
            icon={<Book size={20} />}
            label="法术列表"
            active={activeTab === 'spells'}
            onClick={() => { setActiveTab('spells'); setSelectedItem(null); setSearchQuery(''); }}
          />
          <NavItem
            icon={<Search size={20} />}
            label="全局搜索"
            active={activeTab === 'search'}
            onClick={() => { setActiveTab('search'); setSelectedItem(null); }}
          />
          <NavItem
            icon={<Heart size={20} />}
            label="我的收藏"
            active={activeTab === 'bookmarks'}
            onClick={() => { setActiveTab('bookmarks'); setSelectedItem(null); }}
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
      </aside>

      {/* Main Content */}
      <main className={`main-viewport ${(activeTab === 'spells' || activeTab === 'bookmarks') ? 'wide-view' : ''}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'browser' && !showGlobalDetail && (
            <motion.div
              key="browser"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >


              {currentCategoryData ? (
                <div className="directory-view">
                  {/* Overview content if exists */}
                  {overviewLoading ? (
                    <div className="overview-section mb-8 p-12 flex justify-center">
                      <div className="animate-pulse text-gold">正在加载概览...</div>
                    </div>
                  ) : loadedOverview ? (
                    <div className="overview-section mb-8">
                      <div className="detail-header">
                        {/* <h2 className="detail-title gold-text">{loadedOverview.title}</h2> */}
                        {loadedOverview.item && (
                          <button
                            onClick={() => openBookmarkDialog(loadedOverview.item)}
                            className={`bookmark-btn ${isBookmarkedAnywhere(loadedOverview.item.id) ? 'active' : ''}`}
                          >
                            <Heart fill={isBookmarkedAnywhere(loadedOverview.item.id) ? "currentColor" : "none"} size={20} />
                          </button>
                        )}
                      </div>
                      {/* <div className="breadcrumb">
                        <span onClick={() => navigateTo([])} className="breadcrumb-item">首页</span>
                        {currentPath.map((part, i) => (
                          <React.Fragment key={i}>
                            <ChevronRight size={14} className="mx-1 text-muted" />
                            <span onClick={() => navigateTo(currentPath.slice(0, i + 1))} className="breadcrumb-item">
                              {part}
                            </span>
                          </React.Fragment>
                        ))}
                      </div> */}

                      <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedOverview.html }} />
                    </div>
                  ) : (
                    <h2 className="view-title gold-text mb-6">{currentPath[currentPath.length - 1]}</h2>
                  )}

                  {/* Subdirectories */}
                  {Object.keys(currentCategoryData._children).length > 0 && (
                    <div className="mb-8">
                      <h3 className="section-title mb-4">子目录</h3>
                      <div className="item-grid">
                        {Object.entries(currentCategoryData._children).map(([name, node]) => (
                          <ItemCard
                            key={node._id}
                            item={{
                              id: node._id,
                              title: node._title,
                              pathParts: node._path,
                              isDir: true
                            }}
                            onClick={() => navigateTo(node._path)}
                            isBookmarked={isBookmarkedAnywhere(node._id)}
                            openBookmarkDialog={openBookmarkDialog}
                          />
                        ))}

                      </div>
                    </div>
                  )}

                  {/* Files (excluding overview which is shown above) */}
                  {currentCategoryData._files.filter(f => !f.isOverview).length > 0 && (
                    <div>
                      <h3 className="section-title mb-4">内容条目</h3>
                      <div className="item-grid">
                        {currentCategoryData._files.filter(f => !f.isOverview).map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onClick={() => setSelectedItem(item)}
                            isBookmarked={isBookmarkedAnywhere(item.id)}
                            openBookmarkDialog={openBookmarkDialog}
                          />
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <div className="welcome-panel">
                  <img src="/DFD logo-cropped.png" alt="Welcome Logo" className="welcome-logo" />
                  <h3 className="welcome-logo-text dnd-font gold-text text-2xl mb-2">不要喂龙公会</h3>
                  <h2 className="welcome-title text-2xl mb-2">DnD 玩家手册2024</h2>
                  <p className="welcome-desc mb-6">从目录选择分类，或使用全局搜索，快速查找规则、法术与职业内容。常用资料可 ❤️ 收藏至文件夹，让你在冒险途中随时查阅。</p>
                  <div className="disclaimer-box mb-8">
                    <p className="text-gold opacity-90 text-sm leading-relaxed whitespace-pre-line">
                      <strong>冒险者须知 · Beta 测试</strong><br></br>
                      {"\n"}
                      此玩家手册仍在锻造之中（Beta 测试阶段）。<br></br>
                      {"\n"}
                      若你在冒险途中发现任何异常、错误，或有改进建议，<br></br>
                      {"\n"}
                      请透过 WhatsApp 将情报送达：<br></br>
                      {"\n"}
                      <a
                        href="https://wa.me/60175815819"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-link text-lg block my-1"
                      >
                        +60 17-581 5819
                      </a>
                      {"\n"}<br></br>
                      你的反馈，将决定下一次升级的命运。
                    </p>
                  </div>

                  <div className="welcome-directory mt-12">
                    {/* <h3 className="section-title text-center mb-6">分类目录</h3> */}
                    <div className="item-grid">
                      {CHAPTERS_TO_SHOW.map(name => {
                        const node = categoryTree[name];
                        if (!node) return null;
                        return (
                          <motion.div
                            key={name}
                            whileHover={{ scale: 1.02, y: -4 }}
                            onClick={() => navigateTo(node._path)}
                            className="item-card glass-panel flex flex-col items-center justify-center py-6"
                          >
                            <Folder size={32} className="text-gold opacity-60 mb-2" />
                            <h4 className="card-title text-center text-sm">{name}</h4>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <footer className="welcome-footer mt-16 pt-8 border-t border-gold/10 text-center">
                    <p className="footer-text text-xs opacity-60 leading-relaxed">
                      Provided by Don't Feed Dragon 不要喂龙公会 <br></br> Powered by <a href="https://elifestyles.biz" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">eLifeStyles.biz</a>
                    </p>
                    <p className="footer-link text-xs opacity-60 mt-1">
                      查看更多玩家手册在: <a href="https://5echm.kagangtuya.top/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">https://5echm.kagangtuya.top/</a>
                    </p>
                  </footer>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'spells' && !showGlobalDetail && (
            <div className="spell-browser-container p-4">
              {/* Left Panel: List & Filters */}
              <div className="spell-list-panel">
                <div className="view-header mb-4 shrink-0">
                  {/* <h2 className="view-title gold-text">法术列表</h2> */}

                  {/* Unified Spell Filters */}
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


                {/* Spell List */}
                {/* Spell List */}
                <div className="overflow-y-auto flex-1 min-h-0 pr-10 pb-20 custom-scrollbar">
                  <div className="spell-grid">
                    {filteredSpells.slice(0, 100).map(spell => (
                      <SpellListItem
                        key={spell.id}
                        item={spell}
                        isSelected={selectedItem?.id === spell.id}
                        onClick={() => setSelectedItem(selectedItem?.id === spell.id ? null : spell)}
                        isBookmarked={isBookmarkedAnywhere(spell.id)}
                        isMobile={isMobile}
                        loading={contentLoading}
                        openBookmarkDialog={openBookmarkDialog}
                      />
                    ))}
                    {filteredSpells.length === 0 && <div className="col-span-full text-center text-muted py-10">未找到匹配的法术</div>}
                    {filteredSpells.length > 100 && <div className="col-span-full text-center text-muted py-4 text-xs">显示前 100 个结果</div>}
                  </div>
                </div>
              </div>

              {/* Right Panel: Desktop Details */}
              {!isMobile && (
                <div className={`spell-detail-panel ${selectedItem ? 'active' : ''}`}>
                  {selectedItem && (
                    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                      <div className="detail-header">
                        <h1 className="detail-title gold-text">{selectedItem.title}</h1>
                        <button
                          onClick={() => openBookmarkDialog(selectedItem)}
                          className={`bookmark-btn ${isBookmarkedAnywhere(selectedItem.id) ? 'active' : ''}`}
                        >
                          <Heart fill={isBookmarkedAnywhere(selectedItem.id) ? "currentColor" : "none"} size={20} />
                        </button>
                      </div>

                      {contentLoading ? (
                        <div className="flex justify-center py-20">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
                        </div>
                      ) : (
                        <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedContent }} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && !showGlobalDetail && (
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
                            onClick={() => setSelectedItem(item)}
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
                            isSelected={selectedItem?.id === spell.id}
                            onClick={() => setSelectedItem(selectedItem?.id === spell.id ? null : spell)}
                            isBookmarked={isBookmarkedAnywhere(spell.id)}
                            isMobile={isMobile}
                            loading={contentLoading}
                            openBookmarkDialog={openBookmarkDialog}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.categories.length === 0 && searchResults.spells.length === 0 && (
                    <div className="no-results py-20 text-center text-muted">没找到匹配的结果</div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bookmarks' && !showGlobalDetail && (
            <div className={`spell-browser-container p-4 ${selectedItem ? 'has-detail' : ''}`}>
              <div className="spell-list-panel">
                <div className="view-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  {/* <h2 className="view-title gold-text m-0">我的收藏</h2> */}
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

                <div className="overflow-y-auto flex-1 min-h-0 pr-10 pb-20 custom-scrollbar">
                  {Object.keys(bookmarks).map(folder => {
                    const isFolderExpanded = expandedFolders[folder] !== false; // Default expanded
                    const folderItems = bookmarks[folder];

                    return (
                      <div key={folder} className={`bookmark-section mb-6 ${!isFolderExpanded ? 'collapsed' : ''}`}>
                        <div
                          className="folder-header group cursor-pointer flex items-center justify-between p-3 glass-panel mb-2"
                          onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !isFolderExpanded }))}
                        >
                          <div className="flex items-center gap-3">
                            {isFolderExpanded ? <ChevronDown size={18} className="text-gold" /> : <ChevronRight size={18} className="text-gold" />}
                            <h3 className="folder-name text-lg gold-text">{folder}</h3>
                            <span className="count-badge opacity-60 text-xs bg-gold/10 px-2 py-0.5 rounded-full">{folderItems.length} 项</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                        {isFolderExpanded && (
                          <div className="folder-content pl-4 border-l border-gold/10 ml-2 py-2">
                            {folderItems.length > 0 ? (
                              <div className="flex flex-col gap-4">
                                {/* Group 1: 职业 背景 专长 */}
                                {(() => {
                                  const catId = `${folder}-classes`;
                                  const isCatExpanded = expandedCategories[catId] !== false;
                                  const items = folderItems.map(resolveBookmarkItem).filter(item => {
                                    if (!item || item.isDir) return false;
                                    const path = item.pathParts?.join(' ') || '';
                                    return path.includes('角色职业') || path.includes('角色起源') || path.includes('专长');
                                  });
                                  if (items.length === 0) return null;
                                  return (
                                    <div className="bookmark-group">
                                      <div
                                        className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                        onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                      >
                                        {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold">职业 背景 专长</h4>
                                      </div>
                                      {isCatExpanded && (
                                        <div className="item-grid">
                                          {items.map(item => (
                                            <ItemCard
                                              key={item.id}
                                              item={item}
                                              onClick={() => setSelectedItem(item)}
                                              isBookmarked={true}
                                              openBookmarkDialog={openBookmarkDialog}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Group 2: 装备 道具 其他 */}
                                {(() => {
                                  const catId = `${folder}-others`;
                                  const isCatExpanded = expandedCategories[catId] !== false;
                                  const items = folderItems.map(resolveBookmarkItem).filter(item => {
                                    if (!item) return false;
                                    // Not a class/origin/feat and not a spell
                                    const isSpell = item.castingTime || (item.pathParts && item.pathParts.join(' ').includes('法术'));
                                    const path = item.pathParts?.join(' ') || '';
                                    const isSpecial = path.includes('角色职业') || path.includes('角色起源') || path.includes('专长');
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
                                        <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold">装备 道具 其他</h4>
                                      </div>
                                      {isCatExpanded && (
                                        <div className="item-grid">
                                          {items.map(item => (
                                            <ItemCard
                                              key={item.id}
                                              item={item}
                                              onClick={() => setSelectedItem(item)}
                                              isBookmarked={true}
                                              openBookmarkDialog={openBookmarkDialog}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Group 3: 法术 (Bottom) */}
                                {(() => {
                                  const catId = `${folder}-spells`;
                                  const isCatExpanded = expandedCategories[catId] !== false;
                                  const items = folderItems.map(resolveBookmarkItem).filter(item => {
                                    if (!item) return false;
                                    return item.castingTime || (item.pathParts && item.pathParts.join(' ').includes('法术'));
                                  });
                                  if (items.length === 0) return null;
                                  return (
                                    <div className="bookmark-group">
                                      <div
                                        className="flex items-center gap-2 mb-3 cursor-pointer group/cat"
                                        onClick={() => setExpandedCategories(prev => ({ ...prev, [catId]: !isCatExpanded }))}
                                      >
                                        {isCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        <h4 className="section-title m-0 text-sm opacity-80 group-hover/cat:text-gold">法术列表</h4>
                                      </div>
                                      {isCatExpanded && (
                                        <div className="spell-grid">
                                          {items.map(spell => (
                                            <SpellListItem
                                              key={spell.id}
                                              item={spell}
                                              isSelected={selectedItem?.id === spell.id}
                                              onClick={() => setSelectedItem(selectedItem?.id === spell.id ? null : spell)}
                                              isBookmarked={true}
                                              isMobile={isMobile}
                                              loading={contentLoading}
                                              openBookmarkDialog={openBookmarkDialog}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="empty-folder py-4 text-center opacity-40 text-sm italic">此文件夹为空</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(bookmarks).length === 0 && (
                    <div className="text-center py-20 text-muted">您还没有任何收藏</div>
                  )}
                </div>
              </div>

              {/* Right Panel: Desktop Details for Bookmarks too */}
              {!isMobile && (
                <div className={`spell-detail-panel ${selectedItem && activeTab === 'bookmarks' ? 'active' : ''}`}>
                  {selectedItem && activeTab === 'bookmarks' && (
                    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                      <div className="detail-header">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gold/60 uppercase tracking-widest">{selectedItem.pathParts?.join(' > ') || '收藏条目'}</span>
                          <h1 className="detail-title gold-text">{selectedItem.title}</h1>
                        </div>
                        <button
                          onClick={() => openBookmarkDialog(selectedItem)}
                          className={`bookmark-btn ${isBookmarkedAnywhere(selectedItem.id) ? 'active' : ''}`}
                        >
                          <Heart fill={isBookmarkedAnywhere(selectedItem.id) ? "currentColor" : "none"} size={20} />
                        </button>
                      </div>

                      {contentLoading ? (
                        <div className="flex justify-center py-20">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
                        </div>
                      ) : (
                        <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedContent }} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showGlobalDetail && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="content-view relative">
                <div className="detail-header">
                  {/* <h1 className="detail-title gold-text">{selectedItem.title}</h1> */}
                  <button
                    onClick={() => openBookmarkDialog(selectedItem)}
                    className={`bookmark-btn ${isBookmarkedAnywhere(selectedItem.id) ? 'active' : ''}`}
                  >
                    <Heart fill={isBookmarkedAnywhere(selectedItem.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                {contentLoading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                    <p className="text-gold opacity-60">加载中...</p>
                  </div>
                ) : (
                  <div className="dnd-content" dangerouslySetInnerHTML={{ __html: loadedContent }} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Popover Overlay for closing on outside click (No longer needed) */}

      {/* Bookmark Dialog */}

      <AnimatePresence>
        {isAddingFolder && (
          <div className="modal-overlay" onClick={() => setIsAddingFolder(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content glass-panel"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="modal-title gold-text">新建收藏文件夹</h3>
              <p className="modal-subtitle">请输入新的文件夹名称</p>

              <div className="new-folder-modal-body mb-6">
                <div className="relative">
                  <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gold opacity-50" size={18} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="例如：我的常用规则..."
                    className="new-folder-input w-full pl-10 pr-4 py-2"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        createFolder(newFolderName);
                        setIsAddingFolder(false);
                      } else if (e.key === 'Escape') {
                        setIsAddingFolder(false);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="modal-actions gap-3">
                <button
                  onClick={() => setIsAddingFolder(false)}
                  className="action-btn-small px-6 py-2 h-auto"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    createFolder(newFolderName);
                    setIsAddingFolder(false);
                  }}
                  className="gold-button px-6"
                  disabled={!newFolderName.trim()}
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBookmarkModalOpen && (
          <div className="modal-overlay" onClick={() => setIsBookmarkModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content glass-panel"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="modal-title gold-text">选择收藏文件夹</h3>
              <p className="modal-subtitle">点击文件夹以添加/移除 <strong>{pendingBookmark?.title}</strong></p>

              <div className="folder-selection-list">
                {Object.keys(bookmarks).map(folder => (
                  <button
                    key={folder}
                    onClick={() => toggleBookmark(pendingBookmark.id, folder)}
                    className={`folder-select-item ${isBookmarkedAnywhere(pendingBookmark.id) && bookmarks[folder].includes(pendingBookmark.id) ? 'selected' : ''}`}
                  >
                    <div className="folder-name-row">
                      <Bookmark size={18} />
                      <span>{folder}</span>
                    </div>
                    {bookmarks[folder].includes(pendingBookmark.id) && <Heart size={14} fill="currentColor" className="text-red-500" />}
                  </button>
                ))}
              </div>

              <div className="modal-actions">
                <button onClick={() => setIsBookmarkModalOpen(false)} className="gold-button">完成</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Bar */}
      <MobileNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePath={currentPath}
        navigateTo={navigateTo}
        setSelectedItem={setSelectedItem}
        setCurrentPath={setCurrentPath}
        toggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig && (
          <ConfirmModal
            {...confirmConfig}
            onClose={() => setConfirmConfig(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      <span className="nav-label">{label}</span>
    </button>
  );
}

function MobileNavBar({ activeTab, setActiveTab, activePath, navigateTo, setSelectedItem, setCurrentPath, toggleMenu, theme, toggleTheme }) {
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  return (
    <nav className="mobile-navbar">
      <button
        className={`mobile-nav-item ${activeTab === 'browser' ? 'active' : ''}`}
        onClick={() => {
          setActiveTab('browser');
          setCurrentPath([]);
          setSelectedItem(null);
        }}
      >
        <Layout size={20} />
        <span>资料游览</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'spells' ? 'active' : ''}`}
        onClick={() => handleTabClick('spells')}
      >
        <Book size={20} />
        <span>法术详述</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`}
        onClick={() => handleTabClick('bookmarks')}
      >
        <Heart size={20} />
        <span>我的收藏</span>
      </button>

      <button
        className="mobile-nav-item"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
      </button>

      <button
        className="mobile-nav-item"
        onClick={() => {
          toggleMenu();
          setSelectedItem(null);
        }}
      >
        <Menu size={20} />
        <span>更多</span>
      </button>
    </nav>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose, confirmText = '确认', cancelText = '取消', isDanger = false }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content glass-panel confirm-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title gold-text">{title}</h3>
        </div>
        <div className="modal-body my-4">
          <p className="text-secondary">{message}</p>
        </div>
        <div className="modal-actions gap-3 mt-6">
          <button onClick={onClose} className="action-btn-small px-6 py-2">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`gold-button py-2 px-6 h-auto ${isDanger ? 'red-button' : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ItemCard({ item, onClick, isBookmarked, openBookmarkDialog }) {
  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    openBookmarkDialog(item);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className="item-card glass-panel group relative"
    >

      <div className="card-top">
        <span className="card-category truncate mr-8">{item?.pathParts?.join(' > ') || ''}</span>
        <div className="item-card-actions">
          {item?.isDir && <Folder size={14} className="text-gold opacity-50 mr-2" />}
          <button
            className={`item-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmarkClick}
          >
            <Heart size={14} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      <h4 className="card-title group-hover:text-gold transition-colors">{item?.title}</h4>
    </motion.div >
  );
}


function SpellListItem({ item, onClick, isSelected, isBookmarked, isMobile, content, loading, openBookmarkDialog }) {
  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    openBookmarkDialog(item);
  };
  return (
    <div className={`spell-card-wrapper glass-panel group ${isSelected ? 'selected' : ''}`}>
      <div
        onClick={onClick}
        className="spell-card-inner"
      >
        {/* Card Body */}
        <div className="spell-card-body">
          <div className="spell-card-classes" title={item.classes?.join('、') || ''}>
            {item.classes?.join('、') || ''}
          </div>

          <div className="spell-card-header">
            <h3 className={`spell-card-title ${isSelected ? 'text-gold' : ''}`}>
              {item.title}
            </h3>
            <div className="spell-card-actions">
              <button
                className={`spell-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                onClick={handleBookmarkClick}
              >
                <Heart size={14} fill={isBookmarked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="spell-card-footer">
            <div className="spell-card-meta">
              <span className="meta-item">{item.level || '环阶未知'}</span>
              <span className="meta-divider">•</span>
              <span className="meta-item">{item.castingTime || '1 动作'}</span>
            </div>

            <div className="spell-card-extra">
              <div className="extra-item">
                <span className="label">时间:</span>
                <span className="value">{item.duration || '瞬时'}</span>
                <span className="meta-divider">•</span>
                <span className="label">成分:</span>
                <span className="value">{item.components || 'V, S'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Indicator (optional, but keep it consistent for now) */}
        {!isMobile && !isSelected && (
          <div className="spell-card-indicator">
            <ChevronRight size={14} />
          </div>
        )}
      </div>

      {/* Mobile Accordion Content removed - now uses global detail view */}
    </div>
  );
}
