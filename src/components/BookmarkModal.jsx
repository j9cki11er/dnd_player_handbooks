import React from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Heart } from 'lucide-react';

export default function BookmarkModal({
    isOpen,
    onClose,
    pendingBookmark,
    bookmarks,
    toggleBookmark,
    isBookmarkedAnywhere
}) {
    if (!isOpen || !pendingBookmark) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content glass-panel"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="modal-title gold-text">选择收藏文件夹</h3>
                <p className="modal-subtitle">点击文件夹以添加/移除 <strong>{pendingBookmark?.title}</strong></p>

                <div className="folder-selection-list">
                    {Object.keys(bookmarks).map(folder => (
                        <button
                            key={folder}
                            onClick={() => toggleBookmark(pendingBookmark.id, folder)}
                            className={`folder-select-item ${bookmarks[folder].includes(pendingBookmark.id) ? 'selected' : ''}`}
                        >
                            <div className="folder-name-row">
                                <Bookmark size={18} />
                                <span>{folder}</span>
                            </div>
                            {bookmarks[folder].includes(pendingBookmark.id) && <Heart size={14} fill="currentColor" className="text-red-500" />}
                        </button>
                    ))}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="gold-button">完成</button>
                </div>
            </motion.div>
        </div>
    );
}
