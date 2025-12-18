import React, { useState, useEffect, useMemo } from 'react';
import data from './data.json';
import spellData from './data-spells.json';
import { Search, Bookmark, Book, Layout, ChevronRight, X, FolderPlus, Trash2, Heart, Plus, Folder, FileText, ChevronDown, Menu } from 'lucide-react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';

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

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return fuse.search(searchQuery).map(r => r.item);
  }, [searchQuery, fuse]);

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
            _selfFile: null // For merging file with same name as folder
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
            setLoadedOverview({ html, title: overview.title });
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
          <div className="logo-icon bg-gold-gradient">
            <Book className="icon-black" size={24} />
          </div>
          <span className="logo-text dnd-font gold-text">D&D 2024 PHB</span>
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
            icon={<Bookmark size={20} />}
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
                      <h2 className="detail-title gold-text mb-4">{loadedOverview.title}</h2>
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
                          <motion.div
                            key={name}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => navigateTo(node._path)}
                            className="item-card glass-panel flex flex-col items-center justify-center py-8"
                          >
                            <Folder size={40} className="text-gold opacity-60 mb-3" />
                            <h4 className="card-title text-center">{name}</h4>
                          </motion.div>
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
                          <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} isBookmarked={isBookmarkedAnywhere(item.id)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-panel welcome-panel">
                  <Book size={64} className="welcome-icon" />
                  <h3 className="welcome-title">开始您的冒险</h3>
                  <p className="welcome-desc">从左侧选择一个分类，或者使用全局搜索寻找您需要的规则、法术或职业信息。</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'spells' && (
            <div className="spell-browser-container">
              {/* Left Panel: List & Filters */}
              <div className="spell-list-panel">
                <div className="view-header mb-4 shrink-0">
                  <h2 className="view-title gold-text">法术列表</h2>
                </div>

                {/* Spell Filters */}
                <div className="glass-panel p-4 mb-4 flex flex-wrap gap-2 items-center shrink-0">
                  <div className="filter-group">
                    <select
                      value={spellFilters.class}
                      onChange={(e) => setSpellFilters(prev => ({ ...prev, class: e.target.value }))}
                      className="bg-black/40 border border-gold/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
                    >
                      <option value="全部">全部职业</option>
                      {['吟游诗人', '牧师', '德鲁伊', '圣武士', '游侠', '术士', '魔契师', '法师'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <select
                      value={spellFilters.level}
                      onChange={(e) => setSpellFilters(prev => ({ ...prev, level: e.target.value }))}
                      className="bg-black/40 border border-gold/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
                    >
                      <option value="全部">全部环阶</option>
                      <option value="0">戏法</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
                        <option key={l} value={l}>{l}环</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group flex-grow min-w-[100px]">
                    <div className="relative">
                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-gold/30 rounded pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                </div>

                {/* Spell List */}
                {/* Spell List */}
                <div className="overflow-y-auto min-h-0 pr-2 pb-20 custom-scrollbar">
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
                      <div className="flex justify-between items-start mb-6 border-b border-gold/20 pb-4">
                        <h1 className="text-2xl font-bold text-gold">{selectedItem.title}</h1>
                        <button
                          onClick={() => openBookmarkDialog(selectedItem)}
                          className={`p-2 rounded hover:bg-gold/10 transition-colors ${isBookmarkedAnywhere(selectedItem.id) ? 'text-red-500' : 'text-gray-400'}`}
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
              <div className="item-grid">
                {searchResults.map(item => (
                  <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} isBookmarked={isBookmarkedAnywhere(item.id)} />
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <div className="no-results">没找到匹配的结果</div>
                )}
              </div>
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
                    <div className="item-grid">
                      {bookmarks[folder].map(id => {
                        const item = data.find(i => i.id === id) || spellData.find(s => s.id === id); // Updated to look in both
                        if (!item) return null;
                        return <ItemCard key={id} item={item} onClick={() => setSelectedItem(item)} isBookmarked={true} />;
                      })}
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
        <span>法术</span>
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
        <Bookmark size={24} />
        <span>我的收藏</span>
      </button>

      <button
        className="mobile-nav-item"
        onClick={toggleMenu}
      >
        <Menu size={24} />
        <span>Menu</span>
      </button>
    </nav>
  );
}

function ItemCard({ item, onClick, isBookmarked }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className="item-card glass-panel group relative"
    >
      <div className="card-top">
        <span className="card-category">{item?.pathParts?.join(' > ') || ''}</span>
        {isBookmarked && <Heart size={14} className="heart-active" fill="currentColor" />}
      </div>
      <h3 className="card-title group-hover:text-gold transition-colors">{item?.title}</h3>
      {item?.isOverview && <p className="card-subtitle text-gold">概览</p>}
    </motion.div>
  );
}

function SpellListItem({ item, onClick, isSelected, isBookmarked, isMobile, content, loading, onBookmark }) {
  return (
    <div className={`spell-card-wrapper ${isSelected ? 'selected' : ''} ${isMobile && isSelected ? 'mobile-expanded' : ''}`}>
      <div
        onClick={onClick}
        className="spell-card-inner"
      >
        {/* Card Header */}
        <div className="spell-card-header">
          <h3 className={`spell-card-title ${isSelected ? 'text-gold' : ''}`}>
            {item.title}
          </h3>
          {isBookmarked && <Heart size={14} className="spell-card-heart" fill="currentColor" />}
        </div>

        {/* Card Body */}
        <div className="spell-card-body">
          <div className="spell-card-meta">
            {item.school} <span>•</span> {item.level}
          </div>

          <div className="spell-card-classes" title={item.classes.join('、')}>
            {item.classes.join('、')}
          </div>

          <div className="spell-card-time">
            <span>⏱ 1 动作</span>
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
            <div className="p-4 relative">
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
