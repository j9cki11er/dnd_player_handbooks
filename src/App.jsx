import React, { useState, useEffect, useMemo } from 'react';
import data from './data.json';
import spellData from './data-spells.json';
import { Search, Bookmark, Book, Layout, ChevronRight, X, FolderPlus, Trash2, Heart, Plus, Folder, FileText, ChevronDown, Menu } from 'lucide-react';
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
  const [activePopover, setActivePopover] = useState(null); // Track which spell card has the bookmark popover open

  // New State for Spell Browser
  const [spellFilters, setSpellFilters] = useState({ class: '全部', level: '0' });

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
    setBookmarks(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const isBookmarkedAnywhere = (id) => {
    return Object.values(bookmarks).some(folder => folder.includes(id));
  };

  const openBookmarkDialog = (item) => {
    setPendingBookmark(item);
    setIsBookmarkModalOpen(true);
  };

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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/DFD logo-01.png" alt="Logo" className="sidebar-logo" />
          <div className="flex flex-col">
            <span className="logo-text dnd-font gold-text leading-tight">不要喂龙公会</span>
            <span className="text-xs gold-text opacity-80">DnD 玩家手册</span>
          </div>
        </div>

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
      </aside>

      {/* Main Content */}
      <main className={`main-viewport ${activeTab === 'spells' ? 'wide-view' : ''}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'browser' && !selectedItem && (
            <motion.div
              key="browser"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="breadcrumb">
                <span onClick={() => navigateTo([])} className="breadcrumb-item">首页</span>
                {currentPath.map((part, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight size={14} className="mx-1 text-muted" />
                    <span onClick={() => navigateTo(currentPath.slice(0, i + 1))} className="breadcrumb-item">
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {currentCategoryData ? (
                <div className="directory-view">
                  {/* Overview content if exists */}
                  {overviewLoading ? (
                    <div className="overview-section glass-panel mb-8 p-12 flex justify-center">
                      <div className="animate-pulse text-gold">正在加载概览...</div>
                    </div>
                  ) : loadedOverview ? (
                    <div className="overview-section glass-panel mb-8 p-6">
                      <div className="detail-header mb-4">
                        <h2 className="detail-title gold-text">{loadedOverview.title}</h2>
                        <button
                          onClick={() => openBookmarkDialog(loadedOverview.item)}
                          className={`bookmark-btn ${isBookmarkedAnywhere(loadedOverview.item.id) ? 'active' : ''}`}
                        >
                          <Heart fill={isBookmarkedAnywhere(loadedOverview.item.id) ? "currentColor" : "none"} size={20} />
                        </button>
                      </div>
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
                            toggleBookmark={toggleBookmark}
                            bookmarks={bookmarks}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
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
                            toggleBookmark={toggleBookmark}
                            bookmarks={bookmarks}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
                          />
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-panel welcome-panel">
                  <img src="/DFD logo-01.png" alt="Welcome Logo" className="welcome-logo" />
                  <h3 className="welcome-title text-2xl mb-2">开始您的冒险</h3>
                  <p className="welcome-desc mb-6">从左侧选择一个分类，或者使用全局搜索寻找您需要的规则、法术或职业信息。</p>
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
                    <h3 className="section-title text-center mb-6">快速访问</h3>
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
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'spells' && (
            <div className="spell-browser-container glass-panel p-4">
              {/* Left Panel: List & Filters */}
              <div className="spell-list-panel">
                <div className="view-header mb-4 shrink-0">
                  <h2 className="view-title gold-text">法术列表</h2>
                </div>

                {/* Unified Spell Filters */}
                <div className="unified-filter-bar glass-panel mb-4 shrink-0">
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

                {/* Spell List */}
                {/* Spell List */}
                <div className="overflow-y-auto flex-1 min-h-0 pr-2 pb-20 custom-scrollbar">
                  <div className="spell-grid">
                    {filteredSpells.slice(0, 100).map(spell => (
                      <SpellListItem
                        key={spell.id}
                        item={spell}
                        isSelected={selectedItem?.id === spell.id}
                        onClick={() => setSelectedItem(selectedItem?.id === spell.id ? null : spell)}
                        isBookmarked={isBookmarkedAnywhere(spell.id)}
                        isMobile={isMobile}
                        content={selectedItem?.id === spell.id ? loadedContent : null}
                        loading={contentLoading}
                        onBookmark={() => openBookmarkDialog(spell)}
                        activePopover={activePopover}
                        setActivePopover={setActivePopover}
                        bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark}
                      />
                    ))}
                    {filteredSpells.length === 0 && <div className="col-span-full text-center text-gray-500 py-10">未找到匹配的法术</div>}
                    {filteredSpells.length > 100 && <div className="col-span-full text-center text-gray-500 py-4 text-xs">显示前 100 个结果</div>}
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

          {activeTab === 'search' && !selectedItem && (
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
                            toggleBookmark={toggleBookmark}
                            bookmarks={bookmarks}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
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
                            content={selectedItem?.id === spell.id ? loadedContent : null}
                            loading={contentLoading}
                            onBookmark={() => openBookmarkDialog(spell)}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
                            bookmarks={bookmarks}
                            toggleBookmark={toggleBookmark}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.categories.length === 0 && searchResults.spells.length === 0 && (
                    <div className="no-results py-20 text-center text-gray-500">没找到匹配的结果</div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bookmarks' && !selectedItem && (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="view-header">
                <h2 className="view-title gold-text">我的收藏</h2>
                <button
                  onClick={() => {
                    const name = prompt('输入新的分类文件夹名称:');
                    if (name) createFolder(name);
                  }}
                  className="gold-button"
                >
                  <FolderPlus size={18} />
                  新建文件夹
                </button>
              </div>

              {Object.keys(bookmarks).map(folder => (
                <div key={folder} className="bookmark-section">
                  <div className="folder-header group">
                    <div className="folder-info">
                      <h3 className="folder-name">{folder}</h3>
                      <span className="count-badge">{bookmarks[folder].length} 项</span>
                    </div>
                    {folder !== '默认' && (
                      <button onClick={() => deleteFolder(folder)} className="delete-folder-btn">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {bookmarks[folder].length > 0 ? (
                    <div className="flex flex-col gap-8">
                      {/* Set 1: 职业 背景 专长 */}
                      {(() => {
                        const items = bookmarks[folder].map(id => data.find(i => i.id === id)).filter(item => {
                          if (!item) return false;
                          const path = item.pathParts.join(' ');
                          return path.includes('角色职业') || path.includes('角色起源') || path.includes('专长');
                        });
                        if (items.length === 0) return null;
                        return (
                          <div className="bookmark-group">
                            <h4 className="section-title mb-4">职业 背景 专长</h4>
                            <div className="item-grid">
                              {items.map(item => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onClick={() => setSelectedItem(item)}
                                  isBookmarked={true}
                                  toggleBookmark={toggleBookmark}
                                  bookmarks={bookmarks}
                                  activePopover={activePopover}
                                  setActivePopover={setActivePopover}
                                />

                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Set 2: 法术 */}
                      {(() => {
                        const items = bookmarks[folder].map(id => spellData.find(s => s.id === id) || data.find(i => i.id === id && i.pathParts.join(' ').includes('法术'))).filter(Boolean);
                        if (items.length === 0) return null;
                        return (
                          <div className="bookmark-group">
                            <h4 className="section-title mb-4">法术列表</h4>
                            <div className="spell-grid">
                              {items.map(spell => (
                                <SpellListItem
                                  key={spell.id}
                                  item={spell}
                                  isSelected={selectedItem?.id === spell.id}
                                  onClick={() => setSelectedItem(selectedItem?.id === spell.id ? null : spell)}
                                  isBookmarked={true}
                                  isMobile={isMobile}
                                  content={selectedItem?.id === spell.id ? loadedContent : null}
                                  loading={contentLoading}
                                  onBookmark={() => openBookmarkDialog(spell)}
                                  activePopover={activePopover}
                                  setActivePopover={setActivePopover}
                                  bookmarks={bookmarks}
                                  toggleBookmark={toggleBookmark}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Set 3: 装备 道具 */}
                      {(() => {
                        const items = bookmarks[folder].map(id => data.find(i => i.id === id)).filter(item => {
                          if (!item) return false;
                          const path = item.pathParts.join(' ');
                          return (path.includes('装备') || path.includes('道具')) && !path.includes('法术');
                        });
                        if (items.length === 0) return null;
                        return (
                          <div className="bookmark-group">
                            <h4 className="section-title mb-4">装备 道具</h4>
                            <div className="item-grid">
                              {items.map(item => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onClick={() => setSelectedItem(item)}
                                  isBookmarked={true}
                                  toggleBookmark={toggleBookmark}
                                  bookmarks={bookmarks}
                                  activePopover={activePopover}
                                  setActivePopover={setActivePopover}
                                />

                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Other Items */}
                      {(() => {
                        const items = bookmarks[folder].map(id => data.find(i => i.id === id)).filter(item => {
                          if (!item) return false;
                          const path = item.pathParts.join(' ');
                          const isSpecial = path.includes('角色职业') || path.includes('角色起源') || path.includes('专长') || path.includes('法术') || path.includes('装备') || path.includes('道具');
                          return !isSpecial;
                        });
                        if (items.length === 0) return null;
                        return (
                          <div className="bookmark-group">
                            <h4 className="section-title mb-4">其他</h4>
                            <div className="item-grid">
                              {items.map(item => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onClick={() => setSelectedItem(item)}
                                  isBookmarked={true}
                                  toggleBookmark={toggleBookmark}
                                  bookmarks={bookmarks}
                                  activePopover={activePopover}
                                  setActivePopover={setActivePopover}
                                />

                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="empty-folder">此文件夹为空</div>
                  )}
                </div>
              ))}
              {Object.keys(bookmarks).length === 0 && (
                <div className="text-center py-20 text-gray-500">您还没有任何收藏</div>
              )}
            </motion.div>
          )}

          {selectedItem && activeTab !== 'spells' && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="back-btn"
              >
                <X size={20} /> 返回列表
              </button>
              <div className="glass-panel content-view relative">
                <div className="detail-header">
                  <h1 className="detail-title gold-text">{selectedItem.title}</h1>
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

      {/* Bookmark Dialog */}
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
        toggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
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

function MobileNavBar({ activeTab, setActiveTab, activePath, navigateTo, toggleMenu }) {
  return (
    <nav className="mobile-navbar glass-panel">
      <button
        className={`mobile-nav-item ${activeTab === 'browser' ? 'active' : ''}`}
        onClick={() => {
          setActiveTab('browser');
        }}
      >
        <Layout size={24} />
        <span>资料游览</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'spells' ? 'active' : ''}`}
        onClick={() => setActiveTab('spells')}
      >
        <Book size={24} />
        <span>法术详述</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => setActiveTab('search')}
      >
        <Search size={24} />
        <span>全局搜索</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`}
        onClick={() => setActiveTab('bookmarks')}
      >
        <Heart size={24} />
        <span>我的收藏</span>
      </button>

      <button
        className="mobile-nav-item"
        onClick={toggleMenu}
      >
        <Menu size={24} />
        <span>分类目录</span>
      </button>
    </nav>
  );
}

function ItemCard({ item, onClick, isBookmarked, toggleBookmark, bookmarks, activePopover, setActivePopover }) {
  const isPopoverOpen = activePopover === item.id;

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    const isInDefault = bookmarks['默认']?.includes(item.id);
    if (!isInDefault) {
      toggleBookmark(item.id, '默认');
    }
    setActivePopover(isPopoverOpen ? null : item.id);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className={`item-card glass-panel group relative ${isPopoverOpen ? 'z-10' : ''}`}
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


          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bookmark-popover glass-panel"
                onClick={(e) => e.stopPropagation()}
                style={{ top: '100%', right: '0' }}
              >
                <div className="popover-header">添加到收藏</div>
                <div className="popover-list">
                  {Object.keys(bookmarks).map(folder => (
                    <button
                      key={folder}
                      className={`popover-item ${bookmarks[folder].includes(item.id) ? 'active' : ''}`}
                      onClick={() => toggleBookmark(item.id, folder)}
                    >
                      <span className="truncate">{folder}</span>
                      {bookmarks[folder].includes(item.id) && <Heart size={10} fill="currentColor" />}
                    </button>
                  ))}
                </div>
                <div className="popover-arrow"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <h3 className="card-title group-hover:text-gold transition-colors">{item?.title}</h3>
      {item?.isOverview && <p className="card-subtitle text-gold">概览</p>}
    </motion.div>
  );
}


function SpellListItem({ item, onClick, isSelected, isBookmarked, isMobile, content, loading, onBookmark, activePopover, setActivePopover, bookmarks, toggleBookmark }) {
  const isPopoverOpen = activePopover === item.id;

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    // 默认的会自动被点击: Toggle bookmark in "默认" folder
    const isInDefault = bookmarks['默认']?.includes(item.id);
    if (!isInDefault) {
      toggleBookmark(item.id, '默认');
    }
    // Show popover
    setActivePopover(isPopoverOpen ? null : item.id);
  };
  return (
    <div className={`spell-card-wrapper glass-panel group ${isSelected ? 'selected' : ''} ${isMobile && isSelected ? 'mobile-expanded' : ''}`}>
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

              <AnimatePresence>
                {isPopoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bookmark-popover glass-panel"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="popover-header">添加到收藏</div>
                    <div className="popover-list">
                      {Object.keys(bookmarks).map(folder => (
                        <button
                          key={folder}
                          className={`popover-item ${bookmarks[folder].includes(item.id) ? 'active' : ''}`}
                          onClick={() => toggleBookmark(item.id, folder)}
                        >
                          <span className="truncate">{folder}</span>
                          {bookmarks[folder].includes(item.id) && <Heart size={10} fill="currentColor" />}
                        </button>
                      ))}
                    </div>
                    <div className="popover-arrow"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="spell-card-meta">
            <span className="meta-item">{item.level || '环阶未知'}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{item.castingTime || '1 动作'}</span>
          </div>

          <div className="spell-card-extra">
            <div className="extra-item">
              <span className="label">时间:</span>
              <span className="value">{item.duration || '瞬时'}</span>
              <span className="label">| 成分:</span>
              <span className="value">{item.components || 'V, S'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Indicator */}
        {isMobile && !isSelected && (
          <div className="spell-card-indicator">
            <ChevronDown size={14} />
          </div>
        )}
      </div>

      {/* Mobile Accordion Content */}
      <AnimatePresence>
        {isMobile && isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="spell-card-accordion"
          >
            <div className="p-3 relative">
              <button
                onClick={(e) => { e.stopPropagation(); onBookmark(); }}
                className="spell-card-float-heart"
              >
                <Heart size={18} fill={isBookmarked ? "currentColor" : "none"} className={isBookmarked ? "text-red-500" : ""} />
              </button>
              {loading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold"></div>
                </div>
              ) : (
                <div className="dnd-content text-sm" dangerouslySetInnerHTML={{ __html: content }} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
