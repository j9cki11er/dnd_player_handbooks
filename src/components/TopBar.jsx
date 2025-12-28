import { ArrowLeft, Search, Sun, Moon } from 'lucide-react';

export default function TopBar({ activeTab, selectedItem, currentPath, detailStack, handleBack, setActiveTab, setSelectedItem, setDetailStack, theme, toggleTheme }) {
    const getTitle = () => {
        if (selectedItem) return selectedItem.title;

        switch (activeTab) {
            case 'browser':
                return '玩家手册';
            case 'spells': return '法术列表';
            case 'search': return '全局搜索';
            case 'bookmarks': return '我的收藏';
            default: return '玩家手册';
        }
    };

    const showBackButton = (activeTab === 'browser' && (currentPath.length > 0 || selectedItem || detailStack.length > 0)) ||
        (activeTab !== 'browser' && (selectedItem || detailStack.length > 0));

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
                <button onClick={toggleTheme} className="top-bar-theme-toggle" title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {activeTab !== 'search' && (
                    <button onClick={() => { setActiveTab('search'); setSelectedItem(null); setDetailStack([]); }} className="top-bar-search-btn">
                        <Search size={22} />
                    </button>
                )}
            </div>
        </header>
    );
}
