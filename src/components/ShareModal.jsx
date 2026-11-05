import { createBookmarkLink, bookmarkCodeFromInput } from '../utils/bookmarkLink';
import BookmarkQr from './BookmarkQr';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Share2, Download, Upload, Copy, Check } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, bookmarks, setBookmarks, initialImport = '' }) {
    const [importText, setImportText] = useState(initialImport);
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
            if (selectedFolders[folder] !== false) {
                filteredBookmarks[folder] = bookmarks[folder];
            }
        });
        return btoa(encodeURIComponent(JSON.stringify(filteredBookmarks)));
    };

    const exportData = getExportData();

    const shareLink = createBookmarkLink(exportData, window.location.href);
    let preview = null;
    try {
        const incoming = JSON.parse(decodeURIComponent(atob(bookmarkCodeFromInput(importText))));
        if (incoming && typeof incoming === 'object' && !Array.isArray(incoming) && Object.values(incoming).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string'))) preview = Object.entries(incoming);
    } catch { /* Preview appears once the link is complete. */ }

    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(shareLink); } catch { setError('复制失败，请长按链接手动复制。'); return; }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = () => {
        try {
            const decoded = decodeURIComponent(atob(bookmarkCodeFromInput(importText)));
            const parsed = JSON.parse(decoded);

            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error('格式不正确');
            }

            // Simple validation: check if values are arrays
            for (const key in parsed) {
                if (!Array.isArray(parsed[key]) || !parsed[key].every(id => typeof id === 'string')) {
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

                    Object.defineProperty(newBookmarks, finalName, { value: [...new Set(parsed[folderName].map(id => id.replace('瓦罗怪物指南 (MPMM)', '瓦罗怪物指南 (VGM)')))], enumerable: true, configurable: true, writable: true });
                });

                return newBookmarks;
            });
            onClose();
        } catch (e) {
            setError(e.message === '数据结构无效' || e.message === '格式不正确' ? e.message : '无效的分享代码');
        }
    };

    return (
        <div className="modal-overlay share-overlay" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content glass-panel share-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-2">
                    <Share2 className="text-gold" size={24} />
                    <h3 className="modal-title gold-text m-0 font-normal uppercase tracking-wide">导入 / 导出收藏</h3>
                </div>
                <p className="modal-subtitle mb-8 text-sm opacity-60 italic">分享链接给好友，对方打开后确认导入；现有收藏会保留。</p>

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
                                    [folder]: prev[folder] === false
                                }))}
                                className={`folder-select-item ${selectedFolders[folder] !== false ? 'active' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Bookmark size={16} className={selectedFolders[folder] !== false ? 'text-gold' : 'text-muted'} />
                                    <span className="text-sm">{folder}</span>
                                    <span className="opacity-40 text-[10px]">[{bookmarks[folder]?.length || 0} 项]</span>
                                </div>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFolders[folder] !== false ? 'bg-gold border-gold text-black' : 'border-white/20'}`}>
                                    {selectedFolders[folder] !== false && <Check size={14} strokeWidth={3} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="share-section mb-8">
                    <label className="text-xs uppercase tracking-widest opacity-80 mb-3 block">
                        <Copy size={14} className="text-gold" />
                        分享链接（点击复制）
                    </label>
                    <div className="relative share-code-area group">
                        <textarea
                            onClick={handleCopy}
                            readOnly
                            className="w-full h-28 bg-transparent border-none rounded text-xs font-mono break-all focus:outline-none custom-scrollbar text-gold/80 cursor-copy"
                            value={copied ? '已复制链接' : shareLink}

                        />
                        {/* <button
                            onClick={handleCopy}
                            className={`absolute right-3 bottom-3 px-3 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-normal transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? '已复制' : '复制代码'}
                        </button> */}
                    </div>
                </div>

                <BookmarkQr exportData={exportData} shareLink={shareLink} onImportCode={code => { setImportText(code); setError(''); }} />
                <div className="share-section mb-8">
                    <label className="text-xs uppercase tracking-widest opacity-80 mb-3 block">
                        <Upload size={14} className="text-gold" />
                        导入链接
                    </label>
                    <div className={`share-code-area ${error ? 'border-red-500/50' : ''}`}>
                        <textarea
                            placeholder="粘贴分享链接（也兼容旧分享代码）"
                            className="w-full h-28 bg-transparent border-none rounded p-4 text-xs font-mono break-all focus:outline-none custom-scrollbar"
                            value={importText}
                            onChange={(e) => {
                                setImportText(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                    {preview && <div className="share-import-preview"><p>将新增 {preview.length} 个文件夹，共 {preview.reduce((sum, [, ids]) => sum + ids.length, 0)} 项收藏：</p><ul>{preview.map(([name, ids]) => <li key={name}>{name} · {ids.length} 项</li>)}</ul><p>同名文件夹会自动改名，现有收藏不会被覆盖。</p></div>}
                    {error && <p className="text-red-400 text-[11px] mt-2 font-normal flex items-center gap-1">⚠ {error}</p>}
                </div>

                <div className="modal-actions gap-4">
                    <button onClick={onClose} className="action-btn-small px-8 py-2.5 h-auto opacity-70 hover:opacity-100 transition-opacity">取消</button>
                    <button
                        onClick={handleImport}
                        className="gold-button px-8 py-2.5 h-auto text-sm font-normal shadow-lg shadow-gold/10"
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
