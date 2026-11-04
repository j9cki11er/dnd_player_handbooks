import React from 'react';
import { BookOpen, Wand, Swords, Heart, User } from 'lucide-react';

export default function MobileNavBar({ activeTab, switchTab, showDev }) {
    return (
        <nav className="mobile-navbar">
            <button
                className={`mobile-nav-item ${activeTab === 'browser' ? 'active' : ''}`}
                onClick={() => switchTab('browser')}
            >
                <BookOpen size={20} />
                <span>玩家手册</span>
            </button>

            <button
                className={`mobile-nav-item ${activeTab === 'spells' ? 'active' : ''}`}
                onClick={() => switchTab('spells')}
            >
                <Wand size={20} />
                <span>法术列表</span>
            </button>

            <button className={`mobile-nav-item ${activeTab === 'items' ? 'active' : ''}`} onClick={() => switchTab('items')}><Swords size={20} /><span>武器装备</span></button>
            {showDev && (
                <button
                    className={`mobile-nav-item ${activeTab === 'character' ? 'active' : ''}`}
                    onClick={() => switchTab('character')}
                >
                    <User size={20} />
                    <span>角色卡</span>
                </button>
            )}

            <button
                className={`mobile-nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`}
                onClick={() => switchTab('bookmarks')}
            >
                <Heart size={20} />
                <span>我的收藏</span>
            </button>
        </nav>
    );
}
