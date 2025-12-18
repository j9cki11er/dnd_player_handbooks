import React, { useState, useEffect, useMemo } from 'react';
import data from './data.json';
import { Search, Bookmark, Book, Layout, ChevronRight, X, FolderPlus, Trash2, Heart, Plus, Folder, FileText, ChevronDown } from 'lucide-react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('browser'); // browser, bookmarks, search
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
      <aside className="sidebar">
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
            active={activeTab === 'browser' && currentPath.length === 0}
            onClick={() => { setActiveTab('browser'); setCurrentPath([]); setSelectedItem(null); }}
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
      <main className="main-viewport">
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
                        const item = data.find(i => i.id === id);
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

          {selectedItem && (
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

function ItemCard({ item, onClick, isBookmarked }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className="item-card glass-panel"
    >
      <div className="card-top">
        <span className="card-category">{item?.pathParts?.join(' > ') || ''}</span>
        {isBookmarked && <Heart size={14} className="heart-active" fill="currentColor" />}
      </div>
      <h3 className="card-title">{item?.title}</h3>
      {item?.isOverview && <p className="card-subtitle text-gold">概览</p>}
    </motion.div>
  );
}
