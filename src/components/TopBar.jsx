import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';

export default function TopBar({ activeTab, selectedItem, currentPath, detailStack, handleBack, setActiveTab, setSelectedItem, setDetailStack }) {
    const getTitle = () => {
        if (selectedItem) return selectedItem.title;

        switch (activeTab) {
            case 'browser':
                return '资料浏览';
            case 'spells': return '法术列表';
            case 'search': return '全局搜索';
            case 'bookmarks': return '我的收藏';
            default: return '资料浏览';
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
                {activeTab !== 'search' && (
                    <button onClick={() => { setActiveTab('search'); setSelectedItem(null); setDetailStack([]); }} className="top-bar-search-btn">
                        <Search size={22} />
                    </button>
                )}
            </div>
        </header>
    );
}
