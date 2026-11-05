import React from 'react';
import { ArrowUp, BookOpen, Swords, Heart, User } from 'lucide-react';
import SpellStaffIcon from './SpellStaffIcon';

const navigation = [
    { id: 'browser', label: '玩家手册', Icon: BookOpen, mascot: 3, mascotY: '30%' },
    { id: 'spells', label: '法术列表', Icon: SpellStaffIcon, mascot: 6, mascotY: '35%' },
    { id: 'items', label: '武器装备', Icon: Swords, mascot: 5, mascotY: '30%' },
    { id: 'character', label: '角色卡', Icon: User },
    { id: 'bookmarks', label: '我的收藏', Icon: Heart, mascot: 2, mascotY: '49%' }
];

export default function MobileNavBar({ activeTab, switchTab, showDev, onScrollToTop }) {
    const tabs = navigation.filter(({ id }) => showDev || id !== 'character');
    const activeIndex = tabs.findIndex(({ id }) => id === activeTab);

    return (
        <nav className="mobile-navbar" aria-label="主导航"
            style={{ '--nav-active-x': `${(Math.max(0, activeIndex) + 0.5) * 100 / (tabs.length + 1)}%` }}
            data-has-active={activeIndex >= 0}>
            <span className="mobile-nav-indicator" aria-hidden="true" />
            {tabs.map(({ id, label, Icon, mascot, mascotY }) => (
                <button key={id} type="button"
                    className={`mobile-nav-item ${activeTab === id ? 'active' : ''}`}
                    aria-label={label}
                    aria-current={activeTab === id ? 'page' : undefined}
                    onClick={() => switchTab(id)}>
                    {activeTab === id && mascot ? (
                        <span className="mobile-nav-mascot" aria-hidden="true"
                            style={{ '--mascot-art': `url(/dfdnono/dfdnono${mascot}.webp)`, '--mascot-y': mascotY }} />
                    ) : (
                        <span className="mobile-nav-icon"><Icon size={23} /></span>
                    )}
                </button>
            ))}
            <button type="button" className="mobile-nav-item" aria-label="回到顶部" onClick={onScrollToTop}>
                <span className="mobile-nav-icon"><ArrowUp size={23} /></span>
            </button>
        </nav>
    );
}
