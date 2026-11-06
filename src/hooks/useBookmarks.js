import { useState, useEffect, useRef } from 'react';

const folderOrderKey = 'dnd-bookmark-folder-order';
const expansionKey = 'dnd-bookmark-expansion';
const recentFolderWindow = 5 * 60 * 1000;

function readExpansion() {
    try {
        return JSON.parse(localStorage.getItem(expansionKey)) ?? {};
    } catch {
        return {};
    }
}

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState(() => {
        const saved = localStorage.getItem('dnd-bookmarks');
        if (!saved) return { '默认': [] };
        return Object.fromEntries(Object.entries(JSON.parse(saved)).map(([folder, ids]) => [
            folder, ids.map(id => id.replace('瓦罗怪物指南 (MPMM)', '瓦罗怪物指南 (VGM)'))
        ]));
    });
    const [folderOrder, setFolderOrder] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(folderOrderKey));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    });
    const orderedFolders = [...new Set([...folderOrder, ...Object.keys(bookmarks)])]
        .filter(folder => Object.hasOwn(bookmarks, folder));

    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const recentFolders = useRef(null);
    const [pendingBookmark, setPendingBookmark] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(() => readExpansion().folders ?? {});
    const [expandedCategories, setExpandedCategories] = useState(() => readExpansion().categories ?? {});
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [folderToRename, setFolderToRename] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        localStorage.setItem('dnd-bookmarks', JSON.stringify(bookmarks));
    }, [bookmarks]);

    useEffect(() => {
        localStorage.setItem(folderOrderKey, JSON.stringify(folderOrder));
    }, [folderOrder]);

    useEffect(() => {
        localStorage.setItem(expansionKey, JSON.stringify({
            folders: expandedFolders,
            categories: expandedCategories
        }));
    }, [expandedFolders, expandedCategories]);

    const saveBookmarkFolders = (id, folders) => {
        const selected = new Set(folders.filter(folder => Object.hasOwn(bookmarks, folder)));
        recentFolders.current = { folders: [...selected], savedAt: Date.now() };
        setBookmarks(prev => Object.fromEntries(Object.entries(prev).map(([folder, ids]) => [
            folder,
            selected.has(folder)
                ? (ids.includes(id) ? ids : [...ids, id])
                : ids.filter(itemId => itemId !== id)
        ])));
    };

    const createFolder = (name) => {
        if (!name || bookmarks[name]) return;
        setBookmarks(prev => ({ ...prev, [name]: [] }));
        setFolderOrder([...orderedFolders, name]);
    };

    const renameFolder = (oldName, newName) => {
        if (!newName || newName === oldName || bookmarks[newName]) return;
        setBookmarks(prev => {
            const next = { ...prev };
            next[newName] = next[oldName];
            delete next[oldName];
            return next;
        });
        setFolderOrder(orderedFolders.map(folder => folder === oldName ? newName : folder));
        if (expandedFolders[oldName] !== undefined) {
            setExpandedFolders(prev => {
                const next = { ...prev };
                next[newName] = next[oldName];
                delete next[oldName];
                return next;
            });
        }
    };

    const deleteFolder = (name) => {
        if (name === '默认') return;
        setConfirmConfig({
            title: '删除文件夹',
            compact: true,
            message: `确定要删除文件夹“${name}”吗？其中包含的所有收藏项也将被移除。`,
            confirmText: '确认删除',
            isDanger: true,
            onConfirm: () => {
                setBookmarks(prev => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
                setFolderOrder(orderedFolders.filter(folder => folder !== name));
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
            compact: true,
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
            compact: true,
            message: '确定要清除所有收藏并重置吗？这将清除所有文件夹中的内容。',
            confirmText: '全部清空',
            isDanger: true,
            onConfirm: () => {
                const resetValue = { '默认': [] };
                setBookmarks(resetValue);
                setFolderOrder([]);
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

    const reorderItemsInFolder = (folderName, newItemIds) => {
        setBookmarks(prev => ({
            ...prev,
            [folderName]: newItemIds
        }));
    };

    const openBookmarkDialog = item => {
        const savedFolders = Object.keys(bookmarks).filter(folder => bookmarks[folder].includes(item.id));
        const recent = recentFolders.current;
        const suggestedFolders = !savedFolders.length && recent && Date.now() - recent.savedAt < recentFolderWindow
            ? recent.folders.filter(folder => Object.hasOwn(bookmarks, folder))
            : [];
        setPendingBookmark({ ...item, savedFolders, suggestedFolders });
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
        isRenameModalOpen, setIsRenameModalOpen,
        folderToRename, setFolderToRename,
        newFolderName, setNewFolderName,
        isShareModalOpen, setIsShareModalOpen,
        isImporting, setIsImporting,
        saveBookmarkFolders,
        createFolder,
        renameFolder,
        deleteFolder,
        isBookmarkedAnywhere,
        clearFolder,
        clearAllBookmarks,
        toggleAllFolders,
        openBookmarkDialog,
        orderedFolders,
        reorderFolders: setFolderOrder,
        reorderItemsInFolder
    };
}
