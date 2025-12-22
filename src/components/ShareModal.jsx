import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Share2, Download, Upload, Copy, Check } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, bookmarks, setBookmarks }) {
    const [importText, setImportText] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [selectedFolders, setSelectedFolders] = useState(() => {
        const folders = Object.keys(bookmarks);
        const state = {};
        folders.forEach(f => state[f] = true);
        return state;
    });

    if (!isOpen) return null;

    const getExportData = () => {
        const filteredBookmarks = {};
        Object.keys(bookmarks).forEach(folder => {
            if (selectedFolders[folder]) {
                filteredBookmarks[folder] = bookmarks[folder];
            }
        });
        return btoa(encodeURIComponent(JSON.stringify(filteredBookmarks)));
    };

    const exportData = getExportData();

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

            setBookmarks(prev => {
                const newBookmarks = { ...prev };

                Object.keys(parsed).forEach(folderName => {
                    let finalName = folderName;
                    let counter = 2;

                    // Collision resolution: keep original, rename incoming
                    while (newBookmarks[finalName]) {
                        finalName = `${folderName}_${counter++}`;
                    }

                    newBookmarks[finalName] = parsed[folderName];
                });

                return newBookmarks;
            });
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
                    <h3 className="modal-title gold-text m-0 font-bold uppercase tracking-wide">导入 / 导出收藏</h3>
                </div>
                <p className="modal-subtitle mb-8 text-sm opacity-60 italic">通过分享代码将您的收藏同步到其他设备或分享给好友。</p>

                <div className="share-section mb-8">
                    <label className="text-xs uppercase tracking-widest opacity-80 mb-4 block">
                        <Download size={14} className="text-gold" />
                        选择导出文件夹
                    </label>
                    <div className="folder-selection-list max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {Object.keys(bookmarks).map(folder => (
                            <div
                                key={folder}
                                onClick={() => setSelectedFolders(prev => ({
                                    ...prev,
                                    [folder]: !prev[folder]
                                }))}
                                className={`folder-select-item ${selectedFolders[folder] ? 'active' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Bookmark size={16} className={selectedFolders[folder] ? 'text-gold' : 'text-muted'} />
                                    <span className="text-sm">{folder}</span>
                                    <span className="opacity-40 text-[10px]">[{bookmarks[folder]?.length || 0} 项]</span>
                                </div>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFolders[folder] ? 'bg-gold border-gold text-black' : 'border-white/20'}`}>
                                    {selectedFolders[folder] && <Check size={14} strokeWidth={3} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="share-section mb-8">
                    <label className="text-xs uppercase tracking-widest opacity-80 mb-3 block">
                        <Copy size={14} className="text-gold" />
                        导出代码 (点击代码以复制)
                    </label>
                    <div className="relative share-code-area group">
                        <textarea
                            onClick={handleCopy}
                            readOnly
                            className="w-full h-28 bg-transparent border-none rounded text-xs font-mono break-all focus:outline-none custom-scrollbar text-gold/80 cursor-copy"
                            value={copied ? '已复制' : exportData}

                        />
                        {/* <button
                            onClick={handleCopy}
                            className={`absolute right-3 bottom-3 px-3 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? '已复制' : '复制代码'}
                        </button> */}
                    </div>
                </div>

                <div className="share-section mb-8">
                    <label className="text-xs uppercase tracking-widest opacity-80 mb-3 block">
                        <Upload size={14} className="text-gold" />
                        导入代码
                    </label>
                    <div className={`share-code-area ${error ? 'border-red-500/50' : ''}`}>
                        <textarea
                            placeholder="在此粘贴分享代码..."
                            className="w-full h-28 bg-transparent border-none rounded p-4 text-xs font-mono break-all focus:outline-none custom-scrollbar"
                            value={importText}
                            onChange={(e) => {
                                setImportText(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                    {error && <p className="text-red-400 text-[11px] mt-2 font-medium flex items-center gap-1">⚠ {error}</p>}
                </div>

                <div className="modal-actions gap-4">
                    <button onClick={onClose} className="action-btn-small px-8 py-2.5 h-auto opacity-70 hover:opacity-100 transition-opacity">取消</button>
                    <button
                        onClick={handleImport}
                        className="gold-button px-8 py-2.5 h-auto text-sm font-bold shadow-lg shadow-gold/10"
                        disabled={!importText.trim()}
                    >
                        <Download size={18} />
                        <span>确认导入</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
