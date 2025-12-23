import React from 'react';
import { Layout, Book, Heart, Sun, Moon, Menu, User } from 'lucide-react';

export default function MobileNavBar({ activeTab, setActiveTab, currentPath, navigateTo, setSelectedItem, setDetailStack, setCurrentPath, theme, toggleTheme, showDev }) {
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
                <span>玩家手册</span>
            </button>

            <button
                className={`mobile-nav-item ${activeTab === 'spells' ? 'active' : ''}`}
                onClick={() => handleTabClick('spells')}
            >
                <Book size={20} />
                <span>法术详述</span>
            </button>

            {showDev && (
                <button
                    className={`mobile-nav-item ${activeTab === 'character' ? 'active' : ''}`}
                    onClick={() => handleTabClick('character')}
                >
                    <User size={20} />
                    <span>角色卡</span>
                </button>
            )}

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
                    setDetailStack(prev => {
                        // Avoid pushing duplicate menu if it's already the top item
                        if (prev.length > 0 && prev[prev.length - 1].type === 'menu') return prev;
                        return [...prev, { id: `menu-${Date.now()}`, type: 'menu' }];
                    });
                }}
            >
                <Menu size={20} />
                <span>更多</span>
            </button>
        </nav>
    );
}
