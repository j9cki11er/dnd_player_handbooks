import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Download, Upload, Copy, Check } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, bookmarks, setBookmarks }) {
    const [importText, setImportText] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const exportData = btoa(encodeURIComponent(JSON.stringify(bookmarks)));

    const handleCopy = () => {
        navigator.clipboard.writeText(exportData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = () => {
        try {
            const decoded = decodeURIComponent(atob(importText.trim()));
            const parsed = JSON.parse(decoded);

            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('格式不正确');
            }

            // Simple validation: check if values are arrays
            for (const key in parsed) {
                if (!Array.isArray(parsed[key])) {
                    throw new Error('数据结构无效');
                }
            }

            setBookmarks(parsed);
            onClose();
        } catch (e) {
            setError(e.message === '数据结构无效' || e.message === '格式不正确' ? e.message : '无效的分享代码');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content glass-panel max-w-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-2">
                    <Share2 className="text-gold" size={24} />
                    <h3 className="modal-title gold-text m-0">导入 / 导出收藏</h3>
                </div>
                <p className="modal-subtitle mb-6 text-sm opacity-70">通过分享代码将您的收藏同步到其他设备或分享给好友。</p>

                <div className="share-section mb-6">
                    <label className="block text-xs uppercase tracking-wider opacity-50 mb-2">导出代码</label>
                    <div className="relative">
                        <textarea
                            readOnly
                            className="w-full h-24 bg-black/30 border border-gold/20 rounded p-3 text-xs font-mono break-all focus:outline-none custom-scrollbar"
                            value={exportData}
                        />
                        <button
                            onClick={handleCopy}
                            className={`absolute right-2 bottom-2 p-2 rounded flex items-center gap-1 text-xs transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'bg-gold/10 hover:bg-gold/20 text-gold'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? '已复制' : '复制代码'}
                        </button>
                    </div>
                </div>

                <div className="share-section mb-6">
                    <label className="block text-xs uppercase tracking-wider opacity-50 mb-2">导入代码</label>
                    <textarea
                        placeholder="在此粘贴分享代码..."
                        className={`w-full h-24 bg-black/30 border rounded p-3 text-xs font-mono break-all focus:outline-none custom-scrollbar ${error ? 'border-red-500/50' : 'border-gold/20'}`}
                        value={importText}
                        onChange={(e) => {
                            setImportText(e.target.value);
                            setError('');
                        }}
                    />
                    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                </div>

                <div className="modal-actions gap-3">
                    <button onClick={onClose} className="action-btn-small px-6 py-2 h-auto">取消</button>
                    <button
                        onClick={handleImport}
                        className="gold-button px-6"
                        disabled={!importText.trim()}
                    >
                        <Download size={16} />
                        <span>立即导入</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
