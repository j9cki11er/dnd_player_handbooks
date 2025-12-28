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
import CharacterPanel from './components/CharacterPanel';

// Extracted Utilities
import { parseCR, resolveBookmarkItem } from './utils/helpers';

// Extracted Phase 2 Hooks
import { useNavigation } from './hooks/useNavigation';
import { useBookmarks } from './hooks/useBookmarks';
import { useSearch } from './hooks/useSearch';

const CHAPTERS_TO_SHOW = [
  '序章：欢迎来到冒险世界', '第一章：进行游戏', '第二章：创建角色', '第三章：角色职业', '第四章：角色起源', '第五章：专长', '第六章：装备', '第七章：法术', '附录 A：多元宇宙', '附录 B：生物数据卡', '附录 C：术语汇编'
];

const EXPANSIONS_TO_SHOW = [
  '瓦罗怪物指南 (VGM)'
];

// Enrich data with monster metadata
const processedData = rawData.map(item => {
  let updatedItem = { ...item };

  // Consistently rename MPMM to VGM and handle category
  if (updatedItem.category.includes('MPMM')) {
    updatedItem.category = updatedItem.category.replace('MPMM', 'VGM');
  }
  if (updatedItem.pathParts) {
    updatedItem.pathParts = updatedItem.pathParts.map(p => p.replace('MPMM', 'VGM'));
  }

  // Flatten VGM races and handle specific files
  if (updatedItem.id.includes('瓦罗怪物指南 (MPMM)/玩家可用种族/')) {
    updatedItem.category = '瓦罗怪物指南 (VGM)';

    // Move "怪物冒险者" and "身高与体重" to top-level VGM content items
    if (updatedItem.id.includes('怪物冒险者.html') || updatedItem.id.includes('身高与体重.html')) {
      updatedItem.pathParts = ['瓦罗怪物指南 (VGM)'];
    }
    // Flatten the "怪物冒险者" directory races
    else if (updatedItem.id.includes('怪物冒险者/')) {
      updatedItem.pathParts = ['瓦罗怪物指南 (VGM)', '玩家可用种族'];
    }
  }

  // Force category for any item in VGM
  if (updatedItem.pathParts && (updatedItem.pathParts[0].includes('VGM') || updatedItem.pathParts[0].includes('瓦罗怪物指南'))) {
    updatedItem.category = '瓦罗怪物指南 (VGM)';
    updatedItem.fullCategory = '瓦罗怪物指南 (VGM)';
  }

  if (updatedItem.category === '附录 B：生物数据卡' && !updatedItem.isOverview) {
    const monsterMatch = monsterData.find(m => m.path === updatedItem.path || (m.path && updatedItem.path && m.path.replace(/\.htm$/, '.html') === updatedItem.path.replace(/\.htm$/, '.html')));
    if (monsterMatch) {
      updatedItem = { ...updatedItem, cr: monsterMatch.cr, subDivision: monsterMatch.subDivision, alignment: monsterMatch.alignment, titleEn: monsterMatch.titleEn };
    }
  }
  return updatedItem;
});

// Merged data for category tree (sidebar and folder views)
const data = [...processedData, ...masteryData];

// Category tree generation
const categoryTree = (() => {
  const tree = {};
  const norm = (s) => s ? s.replace(/\s+/g, '').toLocaleLowerCase() : '';
  data.forEach(item => {
    // Rename MPMM to VGM in category and pathParts
    const itemCategory = item.category.replace('MPMM', 'VGM');
    const itemPathParts = item.pathParts.map(p => p.replace('MPMM', 'VGM'));

    // Filter out unwanted categories
    if (itemCategory.includes('VGM')) {
      if (itemPathParts.some(p => ['图鉴', '怪物学识', '野兽'].includes(p))) {
        return;
      }
      if (['图鉴', '怪物学识', '野兽'].some(hide => item.title.includes(hide) || item.id.includes(hide))) {
        return;
      }
    }

    let current = tree;
    itemPathParts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = { _isDir: true, _children: {}, _files: [], _path: itemPathParts.slice(0, index + 1), _selfFile: null, _id: `dir:${itemPathParts.slice(0, index + 1).join('/')}`, _title: part };
      }
      current = current[part]._children;
    });
    const parent = itemPathParts.reduce((acc, part) => acc._children[part], { _children: tree });
    parent._files.push({ ...item, category: itemCategory, pathParts: itemPathParts });
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
  const [showDev, setShowDev] = useState(() => localStorage.getItem('dev_mode') === 'true');
  const [showDM, setShowDM] = useState(() => localStorage.getItem('dm_mode') === 'true');

  useEffect(() => {
    if (window.location.pathname === '/dev') {
      const newDevMode = !showDev;
      setShowDev(newDevMode);
      localStorage.setItem('dev_mode', newDevMode.toString());
      window.history.replaceState(null, '', '/');
    }
    if (window.location.pathname === '/dm') {
      const newDMMode = !showDM;
      setShowDM(newDMMode);
      localStorage.setItem('dm_mode', newDMMode.toString());
      window.history.replaceState(null, '', '/');
    }
  }, [showDev, showDM]);

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
    clearAllBookmarks, toggleAllFolders, openBookmarkDialog, reorderFolders, reorderItemsInFolder
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

  // Lock body scroll when any detail overlay is open
  useEffect(() => {
    if (detailStack.length > 0) {
      document.body.classList.add('overlay-open');
    } else {
      document.body.classList.remove('overlay-open');
    }
  }, [detailStack.length]);

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
        theme={theme} toggleTheme={toggleTheme}
      />

      <aside className="sidebar">
        <SidebarContent
          categoryTree={categoryTree} activeTab={activeTab} setActiveTab={setActiveTab} setCurrentPath={setCurrentPath}
          setSelectedItem={setSelectedItem} setDetailStack={setDetailStack} theme={theme} toggleTheme={toggleTheme}
          currentPath={currentPath} selectedItem={selectedItem} toggleExpand={toggleExpand} expandedPaths={expandedPaths}
          setSearchQuery={setSearchQuery} navigateTo={navigateTo} selectItem={selectItem}
          showDev={showDev} showDM={showDM}
        />
      </aside>

      <main className={`main-viewport ${(activeTab === 'spells' || activeTab === 'bookmarks') ? 'wide-view' : ''}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'browser' && <WelcomePanel chapters={CHAPTERS_TO_SHOW} expansions={EXPANSIONS_TO_SHOW} categoryTree={categoryTree} navigateTo={navigateTo} />}
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
              reorderFolders={reorderFolders} reorderItemsInFolder={reorderItemsInFolder}
              {...commonProps}
            />
          )}
          {activeTab === 'character' && showDev && <CharacterPanel />}
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
              isLocked={index < detailStack.length - 1}
              showDM={showDM}
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
        theme={theme} toggleTheme={toggleTheme} showDev={showDev}
      />

      <AnimatePresence>
        {confirmConfig && <ConfirmModal {...confirmConfig} onClose={() => setConfirmConfig(null)} />}
      </AnimatePresence>
    </div >
  );
}
