import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';

// Data
import rawData from './data.json';
import spellData from './data-spells.json';
import featData from './data-feats.json';
import masteryData from './data-masteries.json';
import weaponData from './data-weapons.json';
import monsterData from './data-monsters.json';

// Extracted Phase 1 Components
import SidebarContent from './components/SidebarContent';
import TopBar from './components/TopBar';
import DetailScreen from './components/DetailScreen';
import MobileNavBar from './components/MobileNavBar';
import { ConfirmModal } from './components/Common';

// Extracted Phase 2 Components
import WelcomePanel from './components/WelcomePanel';
import SpellBrowser from './components/SpellBrowser';
import SearchPanel from './components/SearchPanel';
import BookmarkPanel from './components/BookmarkPanel';
import FolderModal from './components/FolderModal';
import BookmarkModal from './components/BookmarkModal';
import ShareModal from './components/ShareModal';

// Extracted Utilities
import { parseCR, resolveBookmarkItem } from './utils/helpers';

// Extracted Phase 2 Hooks
import { useNavigation } from './hooks/useNavigation';
import { useBookmarks } from './hooks/useBookmarks';
import { useSearch } from './hooks/useSearch';

const CHAPTERS_TO_SHOW = [
  '第一章：进行游戏', '第二章：创建角色', '第三章：角色职业', '第四章：角色起源', '第五章：专长', '第六章：装备', '第七章：法术', '附录 A：多元宇宙', '附录 B：生物数据卡', '附录 C：术语汇编'
];

// Enrich data with monster metadata
const data = rawData.map(item => {
  if (item.category === '附录 B：生物数据卡' && !item.isOverview) {
    const monsterMatch = monsterData.find(m => m.path === item.path || (m.path && item.path && m.path.replace(/\.htm$/, '.html') === item.path.replace(/\.htm$/, '.html')));
    if (monsterMatch) {
      return { ...item, cr: monsterMatch.cr, subDivision: monsterMatch.subDivision, alignment: monsterMatch.alignment, titleEn: monsterMatch.titleEn };
    }
  }
  return item;
});

// Category tree generation
const categoryTree = (() => {
  const tree = {};
  const norm = (s) => s ? s.replace(/\s+/g, '').toLocaleLowerCase() : '';
  data.forEach(item => {
    let current = tree;
    item.pathParts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = { _isDir: true, _children: {}, _files: [], _path: item.pathParts.slice(0, index + 1), _selfFile: null, _id: `dir:${item.pathParts.slice(0, index + 1).join('/')}`, _title: part };
      }
      current = current[part]._children;
    });
    const parent = item.pathParts.reduce((acc, part) => acc._children[part], { _children: tree });
    parent._files.push(item);
  });
  const visit = (node, parentNode = null) => {
    Object.entries(node).forEach(([name, d]) => {
      if (d._isDir) {
        const normalizedName = norm(name);
        let overview = d._files.find(f => f.isOverview);
        if (!overview && parentNode) {
          overview = parentNode._files.find(f => {
            const fname = f.id.split('/').pop().replace(/\.[^/.]+$/, "");
            return norm(f.title) === normalizedName || norm(fname) === normalizedName;
          });
        }
        if (overview) d._selfFile = overview;
        visit(d._children, d);
      }
    });
  };
  visit(tree);
  return tree;
})();

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    activeTab, setActiveTab, selectedItem, setSelectedItem, currentPath, setCurrentPath,
    detailStack, setDetailStack, expandedPaths, toggleExpand, navigateTo, handleBack, selectItem
  } = useNavigation({ categoryTree, spellData, featData, masteryData, data });

  const {
    bookmarks, setBookmarks, isBookmarkModalOpen, setIsBookmarkModalOpen, pendingBookmark, expandedFolders, setExpandedFolders,
    expandedCategories, setExpandedCategories, confirmConfig, setConfirmConfig, isAddingFolder, setIsAddingFolder,
    isRenameModalOpen, setIsRenameModalOpen, folderToRename, setFolderToRename,
    newFolderName, setNewFolderName, isShareModalOpen, setIsShareModalOpen, isImporting, setIsImporting,
    toggleBookmark, createFolder, renameFolder, deleteFolder, isBookmarkedAnywhere, clearFolder,
    clearAllBookmarks, toggleAllFolders, openBookmarkDialog
  } = useBookmarks();

  const { searchResults } = useSearch({ data, spellData, featData, masteryData, searchQuery });

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset scroll to top when tab changes on mobile
  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0);
    }
  }, [activeTab, isMobile]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const resolveItem = (id) => resolveBookmarkItem(id, { categoryTree, spellData, featData, masteryData, data });

  const commonProps = {
    searchQuery, setSearchQuery, selectedItemId: selectedItem?.id, selectItem,
    isBookmarkedAnywhere, isMobile, openBookmarkDialog
  };

  return (
    <div className="app-container">
      <TopBar
        activeTab={activeTab} selectedItem={selectedItem} currentPath={currentPath} detailStack={detailStack}
        handleBack={handleBack} setActiveTab={setActiveTab} setSelectedItem={setSelectedItem} setDetailStack={setDetailStack}
      />

      <aside className="sidebar">
        <SidebarContent
          categoryTree={categoryTree} activeTab={activeTab} setActiveTab={setActiveTab} setCurrentPath={setCurrentPath}
          setSelectedItem={setSelectedItem} setDetailStack={setDetailStack} theme={theme} toggleTheme={toggleTheme}
          currentPath={currentPath} selectedItem={selectedItem} toggleExpand={toggleExpand} expandedPaths={expandedPaths}
          setSearchQuery={setSearchQuery} navigateTo={navigateTo} selectItem={selectItem}
        />
      </aside>

      <main className={`main-viewport ${(activeTab === 'spells' || activeTab === 'bookmarks') ? 'wide-view' : ''}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'browser' && <WelcomePanel chapters={CHAPTERS_TO_SHOW} categoryTree={categoryTree} navigateTo={navigateTo} />}
          {activeTab === 'spells' && <SpellBrowser spellData={spellData} {...commonProps} />}
          {activeTab === 'search' && <SearchPanel searchResults={searchResults} {...commonProps} />}
          {activeTab === 'bookmarks' && (
            <BookmarkPanel
              bookmarks={bookmarks} toggleAllFolders={toggleAllFolders} clearAllBookmarks={clearAllBookmarks}
              setIsAddingFolder={setIsAddingFolder} setNewFolderName={setNewFolderName} expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders} clearFolder={clearFolder} deleteFolder={deleteFolder}
              resolveItem={resolveItem} expandedCategories={expandedCategories} setExpandedCategories={setExpandedCategories}
              setIsShareModalOpen={setIsShareModalOpen} setIsImporting={setIsImporting}
              setIsRenameModalOpen={setIsRenameModalOpen} setFolderToRename={setFolderToRename}
              {...commonProps}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {detailStack.map((entry, index) => (
            <DetailScreen
              key={entry.id} entry={entry} index={index} onBack={handleBack} onNavigate={(path) => navigateTo(path, true, true)}
              onSelectItem={(item) => selectItem(item, true)} openBookmarkDialog={openBookmarkDialog}
              isBookmarkedAnywhere={isBookmarkedAnywhere} categoryTree={categoryTree} isMobile={isMobile}
              SidebarContent={SidebarContent} activeTab={activeTab} setActiveTab={setActiveTab}
              setCurrentPath={setCurrentPath} setSelectedItem={setSelectedItem} setDetailStack={setDetailStack}
              theme={theme} toggleTheme={toggleTheme} currentPath={currentPath} selectedItem={selectedItem}
              toggleExpand={toggleExpand} expandedPaths={expandedPaths} setSearchQuery={setSearchQuery}
              navigateTo={navigateTo} selectItem={selectItem} parseCR={parseCR} featData={featData}
              masteryData={masteryData} weaponData={weaponData}
            />
          ))}
        </AnimatePresence>
      </main>

      <FolderModal
        isOpen={isAddingFolder} onClose={() => setIsAddingFolder(false)} newFolderName={newFolderName}
        setNewFolderName={setNewFolderName} onCreate={createFolder}
      />

      <FolderModal
        isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} newFolderName={newFolderName}
        setNewFolderName={setNewFolderName} onCreate={(name) => renameFolder(folderToRename, name)}
        title="重命名文件夹" buttonText="保存"
      />

      <BookmarkModal
        isOpen={isBookmarkModalOpen} onClose={() => setIsBookmarkModalOpen(false)} pendingBookmark={pendingBookmark}
        bookmarks={bookmarks} toggleBookmark={toggleBookmark} isBookmarkedAnywhere={isBookmarkedAnywhere}
      />

      <ShareModal
        isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)}
        bookmarks={bookmarks} setBookmarks={setBookmarks}
      />

      <MobileNavBar
        activeTab={activeTab} setActiveTab={setActiveTab} currentPath={currentPath} navigateTo={navigateTo}
        setSelectedItem={setSelectedItem} setDetailStack={setDetailStack} setCurrentPath={setCurrentPath}
        theme={theme} toggleTheme={toggleTheme}
      />

      <AnimatePresence>
        {confirmConfig && <ConfirmModal {...confirmConfig} onClose={() => setConfirmConfig(null)} />}
      </AnimatePresence>
    </div >
  );
}
