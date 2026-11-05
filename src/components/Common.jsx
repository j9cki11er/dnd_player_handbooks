import { expansionCode } from '../utils/expansions';
import React from 'react';
import CatalogDialog from './CatalogDialog';
import { spellText, summarizeComponents, summarizeDuration, spellBookLabel } from '../utils/spellSummary';
import { Folder, Heart, Bookmark, ChevronRight, ChevronDown, ChevronUp, Layout, Book, Search, FilterX, Trash2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
                                <th>价格</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weapons.map((weapon, idx) => (
                                <tr key={weapon.id} className={idx % 2 === 0 ? 'even' : 'odd'}>
                                    <td className="weapon-name">
                                        <div className="font-normal">{weapon.title}</div>
                                        <small className="weapon-name-en">{weapon.titleEn}</small>
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

export function ItemCard({ item, onClick, isBookmarked, openBookmarkDialog, lightweight = false, categoryLabel }) {
    const handleBookmarkClick = (e) => {
        e.stopPropagation();
        openBookmarkDialog(item);
    };

    const displayCategory = React.useMemo(() => {
        if (item?.itemType && item?.rarity) return `${item.itemType} · ${item.rarity}${item.requiresAttunement ? ' · 需同调' : ''}`;
        if (item?.path?.startsWith('feats/') && !item.sourceBook) return item.category;
        if (item?.category === '魔能祈唤') return [item.sourceBook, item.category].filter(Boolean).join(' · ');
        if (item?.category === '精通词条') return item.category;

        const pathStr = item?.fullCategory || item?.pathParts?.join(' > ') || '';
        const parts = pathStr.split(' > ').filter(Boolean);
        // Strip "Chapter X:" prefixes like "第三章：角色职业" -> "角色职业"
        const cleanParts = parts.map(p => p.replace(/^第.*?章[:：]\s*/, ''));

        let cat = cleanParts[cleanParts.length - 1] || '';

        // If the category matches the title (redundant), show the parent category instead
        if (cat === item?.title && cleanParts.length > 1) {
            cat = cleanParts[cleanParts.length - 2];
        }

        const book = cleanParts[0] || item?.category;
        const code = expansionCode(book);
        return code ? [code, cat === book ? '' : cat].filter(Boolean).join(' · ') : cat;
    }, [item]);

    const Card = lightweight ? 'div' : motion.div;
    const hover = lightweight ? {} : {
        whileHover: { scale: 1.02, y: -4 },
        transition: { type: "spring", stiffness: 300, damping: 30 }
    };
    return (
        <Card
            {...hover}
            onClick={onClick}
            className="item-card glass-panel group relative"
        >
            <div className="card-top">
                <div className="flex flex-col overflow-hidden mr-8 flex-1 min-w-0">
                    <span className="card-category truncate">{categoryLabel ?? displayCategory}{item?.legacy && <> · Legacy</>}</span>
                </div>
                <div className="item-card-actions">
                    {item?.isDir && <Folder size={14} className="text-gold opacity-50 mr-2" />}
                    <button
                        className={`item-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        onClick={handleBookmarkClick}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <Heart size={18} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
            <h4 className="card-title group-hover:text-gold transition-colors">{item?.title}</h4>
            {(item?.prerequisite || item?.category === '魔能祈唤') && (
                <span className="spell-card-extra truncate text-red-400 font-normal">
                    先决: {item.prerequisite || '无'}
                </span>)}
            {item?.cr && (
                <span className="spell-card-extra truncate">
                    CR {item.cr} • {item.subDivision} • {item.alignment}
                </span>
            )}
        </Card>
    );
}

export function SpellListItem({ item, isSelected, isBookmarked, isMobile, openBookmarkDialog }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const handleBookmarkClick = (e) => {
        e.stopPropagation();
        openBookmarkDialog(item);
    };
    const sourceBook = spellBookLabel(item);
    const components = summarizeComponents(item.components);
    const castingTime = spellText(item.castingTime || '1 动作');
    const duration = spellText(item.duration || '瞬时');
    const concentration = duration.includes('专注');
    const durationSummary = summarizeDuration(item.duration)
        .replace(/^C\s*/, '')
        .replace(/(\d)Min/g, '$1分钟')
        .replace(/(\d)Hr/g, '$1小时');
    return (
        <div
            className={`spell-card-wrapper glass-panel group ${isSelected ? 'selected' : ''}`}
        >
            <div
                onClick={() => setIsOpen(true)}
                className="spell-card-inner"
                role="button"
                tabIndex={0}
                aria-label={`查看${item.title}详情`}
                onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setIsOpen(true); } }}
            >
                <div className="spell-card-body">
                    <div className="spell-card-header">
                        <div className="spell-card-name">
                            <strong className="spell-level-badge">{item.level || '环阶未知'}</strong>
                            <h3 className={`spell-card-title ${isSelected ? 'text-gold' : ''}`}>
                                {item.title}{item.titleEn && <small className="spell-card-title-en" lang="en">{item.titleEn}</small>}
                            </h3>
                        </div>
                        <div className="spell-card-actions">
                            <button
                                aria-label={`收藏${item.title}`}
                                className={`spell-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                                onClick={handleBookmarkClick}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <Heart size={18} fill={isBookmarked ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>

                    <div className="spell-card-footer">
                        <div className="spell-card-meta spell-card-timing">
                            <span className="spell-casting-time" title={castingTime}>施法：{castingTime.split(/[，,]/)[0]}</span>
                            <span className="spell-duration" title={duration}>
                                <span>维持：{durationSummary}</span>
                                {concentration && <strong className="spell-concentration">专注</strong>}
                            </span>
                        </div>
                        <div className="spell-card-components" title={components.summary}>
                            <span>{components.summary.replace(/、(?=[VSM])/g, ', ')}</span>
                            {item.school && <span className="spell-card-school">{item.school}</span>}
                            {sourceBook && <small className="spell-card-source" title={sourceBook}>{item.sourceBook || item.source}</small>}
                        </div>
                    </div>
                </div>

                {!isMobile && !isSelected && (
                    <div className="spell-card-indicator">
                        <ChevronRight size={14} />
                    </div>
                )}
            </div>
            {isOpen && <CatalogDialog item={item} onClose={() => setIsOpen(false)} />}
        </div>
    );
}

export function CollapsibleSection({ title, icon: Icon, children, defaultExpanded = true, headerClassName = "", loading = false }) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <div className="collapsible-section mb-8">
            <button
                disabled={loading}
                aria-busy={loading}
                onClick={() => setIsExpanded(!isExpanded)}
                className={`collapsible-header category-item ${headerClassName}`}
            >
                <div className="chevron-wrapper">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isExpanded ? 'down' : 'right'}
                            initial={{ rotate: isExpanded ? -90 : 0 }}
                            animate={{ rotate: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 overflow-hidden flex-1 text-left py-2">
                    {Icon && <Icon size={16} className="text-gold opacity-70" />}
                    <h1 className="collapsible-title truncate">{title}</h1>
                </div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="collapsible-content overflow-hidden"
                    >
                        <div className="pt-6">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
