import React from 'react';
import { BookOpen, Swords, Heart, User } from 'lucide-react';
import SpellStaffIcon from './SpellStaffIcon';

const navigation = [
    { id: 'browser', label: '玩家手册', Icon: BookOpen },
    { id: 'spells', label: '法术列表', Icon: SpellStaffIcon },
    { id: 'items', label: '武器装备', Icon: Swords },
    { id: 'character', label: '角色卡', Icon: User },
    { id: 'bookmarks', label: '我的收藏', Icon: Heart }
];

export default function MobileNavBar({ activeTab, switchTab, showDev }) {
    const tabs = navigation.filter(({ id }) => showDev || id !== 'character');
    const activeIndex = tabs.findIndex(({ id }) => id === activeTab);

    const ActiveIcon = tabs[activeIndex]?.Icon;

    return (
        <nav className="mobile-navbar" aria-label="主导航"
            style={{ '--nav-notch-x': `${(activeIndex + 0.5) * 100 / tabs.length}%` }}
            data-has-active={activeIndex >= 0}>
            <span className="mobile-nav-indicator" aria-hidden="true">
                {ActiveIcon && <ActiveIcon key={activeTab} size={20} />}
            </span>
            {tabs.map(({ id, label, Icon }) => (
                <button key={id} type="button"
                    className={`mobile-nav-item ${activeTab === id ? 'active' : ''}`}
                    aria-label={label}
                    aria-current={activeTab === id ? 'page' : undefined}
                    onClick={() => switchTab(id)}>
                    <span className="mobile-nav-icon"><Icon size={20} /></span>
                </button>
            ))}
        </nav>
    );
}
