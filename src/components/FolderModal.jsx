import React from 'react';
import { motion } from 'framer-motion';
import { FolderPlus } from 'lucide-react';

export default function FolderModal({ isOpen, onClose, newFolderName, setNewFolderName, onCreate }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content glass-panel"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="modal-title gold-text">新建收藏文件夹</h3>
                <p className="modal-subtitle">请输入新的文件夹名称</p>

                <div className="new-folder-modal-body mb-6">
                    <div className="relative">
                        <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gold opacity-50" size={18} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="例如：我的常用规则..."
                            className="new-folder-input w-full pl-10 pr-4 py-2"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newFolderName.trim()) {
                                    onCreate(newFolderName);
                                    onClose();
                                } else if (e.key === 'Escape') {
                                    onClose();
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="modal-actions gap-3">
                    <button
                        onClick={onClose}
                        className="action-btn-small px-6 py-2 h-auto"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => {
                            onCreate(newFolderName);
                            onClose();
                        }}
                        className="gold-button px-6"
                        disabled={!newFolderName.trim()}
                    >
                        确认
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
