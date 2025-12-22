import React from 'react';
import { Folder, Heart, Bookmark, ChevronRight, ChevronDown, ChevronUp, Layout, Book, Search, FilterX, Trash2, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

export function NavItem({ icon, label, active, onClick }) {
    return (
        <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
            {icon}
            <span className="nav-label">{label}</span>
        </button>
    );
}

export function WeaponTable({ weapons }) {
    if (!weapons || weapons.length === 0) return null;

    return (
        <div className="weapon-table-container mt-6">
            <h3 className="section-title mb-4">关联武器</h3>
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="weapon-details-table">
                        <thead>
                            <tr>
                                <th>武器名称</th>
                                <th>分类</th>
                                <th>伤害</th>
                                <th>属性</th>
                                <th>分类 & 价格</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weapons.map((weapon, idx) => (
                                <tr key={weapon.id} className={idx % 2 === 0 ? 'even' : 'odd'}>
                                    <td className="weapon-name">
                                        <div className="font-bold">{weapon.title}</div>
                                    </td>
                                    <td className="weapon-category">{weapon.category}</td>
                                    <td className="weapon-damage">{weapon.damage}</td>
                                    <td className="weapon-properties">{weapon.properties}</td>
                                    <td className="weapon-cost">{weapon.cost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function ConfirmModal({ title, message, onConfirm, onClose, confirmText = '确认', cancelText = '取消', isDanger = false }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content glass-panel confirm-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className="modal-title gold-text">{title}</h3>
                </div>
                <div className="modal-body my-4">
                    <p className="text-secondary">{message}</p>
                </div>
                <div className="modal-actions gap-3 mt-6">
                    <button onClick={onClose} className="action-btn-small px-6 py-2">
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`gold-button py-2 px-6 h-auto ${isDanger ? 'red-button' : ''}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export function ItemCard({ item, onClick, isBookmarked, openBookmarkDialog }) {
    const handleBookmarkClick = (e) => {
        e.stopPropagation();
        openBookmarkDialog(item);
    };

    const displayCategory = React.useMemo(() => {
        if (item?.prerequisite || item?.category === '精通词条') return item.category;

        const pathStr = item?.fullCategory || item?.pathParts?.join(' > ') || '';
        const parts = pathStr.split(' > ').filter(Boolean);
        // Strip "Chapter X:" prefixes like "第三章：角色职业" -> "角色职业"
        const cleanParts = parts.map(p => p.replace(/^第.*?章[:：]\s*/, ''));

        let cat = cleanParts[cleanParts.length - 1] || '';

        // If the category matches the title (redundant), show the parent category instead
        if (cat === item?.title && cleanParts.length > 1) {
            cat = cleanParts[cleanParts.length - 2];
        }

        return cat;
    }, [item]);

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={onClick}
            className="item-card glass-panel group relative"
        >
            <div className="card-top">
                <div className="flex flex-col overflow-hidden mr-8 flex-1 min-w-0">
                    <span className="card-category truncate">{displayCategory}</span>
                </div>
                <div className="item-card-actions">
                    {item?.isDir && <Folder size={14} className="text-gold opacity-50 mr-2" />}
                    <button
                        className={`item-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        onClick={handleBookmarkClick}
                    >
                        <Heart size={14} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
            <h4 className="card-title group-hover:text-gold transition-colors">{item?.title}</h4>
            {item?.prerequisite && (
                <span className="spell-card-extra truncate">
                    {item.prerequisite}
                </span>)}
            {item?.cr && (
                <span className="spell-card-extra truncate">
                    CR {item.cr} • {item.subDivision} • {item.alignment}
                </span>
            )}
        </motion.div >
    );
}

export function SpellListItem({ item, onClick, isSelected, isBookmarked, isMobile, openBookmarkDialog }) {
    const handleBookmarkClick = (e) => {
        e.stopPropagation();
        openBookmarkDialog(item);
    };
    return (
        <div className={`spell-card-wrapper glass-panel group ${isSelected ? 'selected' : ''}`}>
            <div
                onClick={onClick}
                className="spell-card-inner"
            >
                <div className="spell-card-body">
                    <div className="spell-card-classes" title={item.classes?.join('、') || ''}>
                        {item.classes?.join('、') || ''}
                    </div>

                    <div className="spell-card-header">
                        <h3 className={`spell-card-title ${isSelected ? 'text-gold' : ''}`}>
                            {item.title}
                        </h3>
                        <div className="spell-card-actions">
                            <button
                                className={`spell-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                                onClick={handleBookmarkClick}
                            >
                                <Heart size={14} fill={isBookmarked ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>

                    <div className="spell-card-footer">
                        <div className="spell-card-meta">
                            <span className="meta-item">{item.level || '环阶未知'}</span>
                            <span className="meta-divider">•</span>
                            <span className="meta-item">{item.castingTime || '1 动作'}</span>
                        </div>

                        <div className="spell-card-extra">
                            <div className="extra-item">
                                <span className="label">时间:</span>
                                <span className="value">{item.duration || '瞬时'}</span>
                                <span className="meta-divider">•</span>
                                <span className="label">成分:</span>
                                <span className="value">{item.components || 'V, S'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!isMobile && !isSelected && (
                    <div className="spell-card-indicator">
                        <ChevronRight size={14} />
                    </div>
                )}
            </div>
        </div>
    );
}
