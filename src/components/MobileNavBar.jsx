import React from 'react';
import { Layout, Book, Heart, Sun, Moon, Menu } from 'lucide-react';

export default function MobileNavBar({ activeTab, setActiveTab, currentPath, navigateTo, setSelectedItem, setDetailStack, setCurrentPath, theme, toggleTheme }) {
    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setSelectedItem(null);
        setDetailStack([]);
    };

    return (
        <nav className="mobile-navbar">
            <button
                className={`mobile-nav-item ${activeTab === 'browser' ? 'active' : ''}`}
                onClick={() => {
                    setActiveTab('browser');
                    setCurrentPath([]);
                    setSelectedItem(null);
                    setDetailStack([]);
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
                    setSelectedItem(null);
                    setDetailStack(prev => [...prev, { id: 'mobile-menu', type: 'menu' }]);
                }}
            >
                <Menu size={20} />
                <span>更多</span>
            </button>
        </nav>
    );
}
