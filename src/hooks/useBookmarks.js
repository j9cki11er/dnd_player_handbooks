import { useState, useEffect } from 'react';

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState(() => {
        const saved = localStorage.getItem('dnd-bookmarks');
        return saved ? JSON.parse(saved) : { '默认': [] };
    });
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [pendingBookmark, setPendingBookmark] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        localStorage.setItem('dnd-bookmarks', JSON.stringify(bookmarks));
    }, [bookmarks]);

    const toggleBookmark = (id, folder) => {
        setBookmarks(prev => {
            const folderItems = prev[folder] || [];
            const isAlreadyInThisFolder = folderItems.includes(id);
            if (isAlreadyInThisFolder) {
                return { ...prev, [folder]: folderItems.filter(i => i !== id) };
            } else {
                return { ...prev, [folder]: [...folderItems, id] };
            }
        });
    };

    const createFolder = (name) => {
        if (!name || bookmarks[name]) return;
        setBookmarks(prev => ({ ...prev, [name]: [] }));
    };

    const deleteFolder = (name) => {
        if (name === '默认') return;
        setConfirmConfig({
            title: '删除文件夹',
            message: `确定要删除文件夹“${name}”吗？其中包含的所有收藏项也将被移除。`,
            confirmText: '确认删除',
            isDanger: true,
            onConfirm: () => {
                setBookmarks(prev => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
                setConfirmConfig(null);
            }
        });
    };

    const isBookmarkedAnywhere = (id) => {
        return Object.values(bookmarks).some(folder => folder.includes(id));
    };

    const clearFolder = (folderName) => {
        setConfirmConfig({
            title: '清空文件夹',
            message: `确定要清空“${folderName}”中的所有收藏吗？`,
            onConfirm: () => {
                setBookmarks(prev => ({
                    ...prev,
                    [folderName]: []
                }));
                setConfirmConfig(null);
            }
        });
    };

    const clearAllBookmarks = () => {
        setConfirmConfig({
            title: '全局清空',
            message: '确定要清除所有收藏并重置吗？这将清除所有文件夹中的内容。',
            confirmText: '全部清空',
            isDanger: true,
            onConfirm: () => {
                const resetValue = { '默认': [] };
                setBookmarks(resetValue);
                localStorage.setItem('dnd-bookmarks', JSON.stringify(resetValue));
                setConfirmConfig(null);
            }
        });
    };

    const toggleAllFolders = (expand) => {
        const newState = {};
        Object.keys(bookmarks).forEach(f => {
            newState[f] = expand;
        });
        setExpandedFolders(newState);
    };

    const openBookmarkDialog = (item) => {
        setPendingBookmark(item);
        setIsBookmarkModalOpen(true);
    };

    return {
        bookmarks, setBookmarks,
        isBookmarkModalOpen, setIsBookmarkModalOpen,
        pendingBookmark, setPendingBookmark,
        expandedFolders, setExpandedFolders,
        expandedCategories, setExpandedCategories,
        confirmConfig, setConfirmConfig,
        isAddingFolder, setIsAddingFolder,
        newFolderName, setNewFolderName,
        toggleBookmark,
        createFolder,
        deleteFolder,
        isBookmarkedAnywhere,
        clearFolder,
        clearAllBookmarks,
        toggleAllFolders,
        openBookmarkDialog
    };
}
