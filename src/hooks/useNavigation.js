import React, { useState, useEffect, useRef } from 'react';
import { resolveBookmarkItem } from '../utils/helpers';

const pageAliases = new Map([
    ['dir:["序章：欢迎来到冒险世界"]', 'welcome'],
    ['序章：欢迎来到冒险世界/_序章.htm', 'intro'],
    ['dir:["第二章：创建角色"]', 'ch2'],
    ['第二章：创建角色/创建你的角色/第三步：确定属性值.htm', 'stats'],
    ['第二章：创建角色/创建你的角色/第四步：选择阵营.htm', 'align']
]);

function pageCode(page) {
    let hash = 0xcbf29ce484222325n;
    for (const character of page) {
        hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n);
    }
    return hash.toString(36);
}

function directoryPages(tree) {
    return Object.values(tree).flatMap(node => [
        `dir:${JSON.stringify(node._path)}`,
        ...directoryPages(node._children ?? {})
    ]);
}

export function useNavigation({ categoryTree, spellData, featData, masteryData, invocationData, data }) {
    const sources = { categoryTree, spellData, featData, masteryData, invocationData, data };
    const readRoute = () => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const tab = params.get('tab');
        const codes = params.getAll('p');
        const knownPages = codes.length ? new Map([
            ...directoryPages(categoryTree),
            ...[data, spellData, featData, masteryData, invocationData].flatMap(items => (items ?? []).map(item => item.id))
        ].flatMap(page => {
            const alias = pageAliases.get(page);
            return alias ? [[pageCode(page), page], [alias, page]] : [[pageCode(page), page]];
        })) : new Map();
        const pages = Array.from(params).flatMap(([key, value]) => {
            if (key === 'page') return [value];
            if (key === 'p' && knownPages.has(value)) return [knownPages.get(value)];
            return [];
        });
        const entries = pages.flatMap((page, index) => {
            const id = `url-page-${index}`;
            if (page.startsWith('dir:')) {
                try {
                    const path = JSON.parse(page.slice(4));
                    if (!Array.isArray(path) || !path.length) return [];
                    const node = path.reduce((parent, part) => parent?._children?.[part], { _children: categoryTree });
                    return node?._isDir ? [{ id, type: 'dir', path }] : [];
                } catch {
                    return [];
                }
            }
            const item = resolveBookmarkItem(page, sources);
            return item && !item.isDir ? [{ id, type: 'file', item }] : [];
        });
        return {
            tab: ['browser', 'spells', 'items', 'bookmarks', 'search', 'character'].includes(tab) ? tab : 'browser',
            entries,
            path: entries.find(entry => entry.type === 'dir')?.path ?? [],
            item: entries[0]?.item ?? null
        };
    };
    const [initialRoute] = useState(readRoute);
    const [activeTab, setActiveTab] = useState(initialRoute.tab);
    const [selectedItem, setSelectedItem] = useState(initialRoute.item);
    const [currentPath, setCurrentPath] = useState(initialRoute.path);
    const [detailStack, setDetailStack] = useState(initialRoute.entries);
    const [expandedPaths, setExpandedPaths] = useState({});
    const [shouldReplaceState, setShouldReplaceState] = useState(false);

    const [isExternalBack, setIsExternalBack] = useState(false);
    const internalBackRef = useRef(false);

    const tabPositions = useRef(new Map());
    const restoredEntries = useRef(new Set(initialRoute.entries.map(entry => entry.id)));
    const initializedHistory = useRef(false);

    const switchTab = (tab) => {
        if (tab === activeTab) {
            if (detailStack.at(-1)?.type === 'menu') handleBack();
            return;
        }

        tabPositions.current.set(activeTab, {
            currentPath,
            selectedItem,
            detailStack: detailStack.filter(entry => entry.type !== 'menu')
        });
        const position = tabPositions.current.get(tab);
        const entries = position?.detailStack ?? [];
        restoredEntries.current = new Set(entries.map(entry => entry.id));
        setActiveTab(tab);
        setCurrentPath(position?.currentPath ?? []);
        setSelectedItem(position?.selectedItem ?? null);
        setDetailStack(entries);
    };

    // Sync state to history when important navigation state changes
    useEffect(() => {
        const currentState = {
            activeTab,
            currentPath,
            selectedId: selectedItem?.id || null,
            detailStack
        };

        if (!window._isPopStateNavigating) {
            const historyState = window.history.state;
            const isDifferent = !historyState ||
                historyState.activeTab !== currentState.activeTab ||
                JSON.stringify(historyState.currentPath) !== JSON.stringify(currentState.currentPath) ||
                historyState.selectedId !== currentState.selectedId ||
                JSON.stringify(historyState.detailStack) !== JSON.stringify(currentState.detailStack);

            const url = new URL(window.location.href);
            const params = new URLSearchParams(url.hash.slice(1));
            params.delete('tab');
            params.delete('page');
            params.delete('p');
            if (activeTab !== 'browser') params.set('tab', activeTab);
            for (const entry of detailStack) {
                if (entry.type === 'dir') {
                    const page = `dir:${JSON.stringify(entry.path)}`;
                    params.append('p', pageAliases.get(page) ?? pageCode(page));
                }
                if (entry.type === 'file') {
                    const id = entry.item.id;
                    const indexed = [data, spellData, featData, masteryData, invocationData]
                        .some(items => items?.some(item => item.id === id));
                    if (indexed) params.append('p', pageAliases.get(id) ?? pageCode(id));
                    else params.append('page', id);
                }
            }
            url.hash = params.toString();

            if (isDifferent || url.href !== window.location.href) {
                if (shouldReplaceState || !initializedHistory.current) {
                    window.history.replaceState(currentState, '', url);
                    setShouldReplaceState(false);
                } else {
                    window.history.pushState(currentState, '', url);
                }
            }
        }
        initializedHistory.current = true;
        window._isPopStateNavigating = false;
        // Reset external back flag after navigation stabilizes
        if (isExternalBack) {
            // Small timeout to allow render cycle to pick up the flag before resetting
            const timer = setTimeout(() => setIsExternalBack(false), 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab, currentPath, selectedItem, detailStack, shouldReplaceState, isExternalBack]);

    // Listen for back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state?.activeTab && Array.isArray(event.state.currentPath)) {
                window._isPopStateNavigating = true;

                // If internalBackRef is false, this popstate came from browser/swipe
                if (!internalBackRef.current) {
                    setIsExternalBack(true);
                }
                internalBackRef.current = false; // Reset for next time

                const { activeTab, currentPath, selectedId } = event.state;

                setActiveTab(activeTab);
                setCurrentPath(currentPath);

                if (selectedId) {
                    const item = resolveBookmarkItem(selectedId, { categoryTree, spellData, featData, masteryData, invocationData, data });
                    setSelectedItem(item);
                } else {
                    setSelectedItem(null);
                }

                setDetailStack(event.state.detailStack || []);
            } else {
                const route = readRoute();
                window._isPopStateNavigating = true;
                restoredEntries.current = new Set(route.entries.map(entry => entry.id));
                setActiveTab(route.tab);
                setCurrentPath(route.path);
                setSelectedItem(route.item);
                setDetailStack(route.entries);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [categoryTree, spellData, featData, masteryData, invocationData, data]);

    const toggleExpand = (pathStr) => {
        setExpandedPaths(prev => ({
            ...prev,
            [pathStr]: !prev[pathStr]
        }));
    };

    const navigateTo = (path, shouldExpand = true, push = false) => {
        if (push) {
            setDetailStack(prev => {
                const newEntry = { id: Date.now(), type: 'dir', path };
                if (prev.length > 0 && prev[prev.length - 1].type === 'menu') {
                    // Replace menu with the new directory entry
                    setShouldReplaceState(true);
                    return [...prev.slice(0, -1), newEntry];
                }
                return [...prev, newEntry];
            });
        } else {
            setCurrentPath(path);
            setSelectedItem(null);
            setActiveTab('browser');
            setDetailStack([{ id: Date.now(), type: 'dir', path }]);
        }

        if (shouldExpand) {
            const pathStr = path.join('/');
            setExpandedPaths(prev => ({ ...prev, [pathStr]: true }));
        }
    };

    const handleBack = () => {
        if (restoredEntries.current.has(detailStack.at(-1)?.id)) {
            const entries = detailStack.slice(0, -1);
            const parent = entries.at(-1);
            setDetailStack(entries);
            setCurrentPath(parent?.type === 'dir' ? parent.path : []);
            setSelectedItem(parent?.type === 'file' ? parent.item : null);
            setShouldReplaceState(true);
            return;
        }
        if (window.history.state && (window.history.state.detailStack?.length > 1 || window.history.state.selectedId || (window.history.state.activeTab === 'browser' && window.history.state.currentPath.length > 0))) {
            internalBackRef.current = true;
            window.history.back();
        } else if (detailStack.length > 0 || selectedItem || currentPath.length > 0) {
            internalBackRef.current = true;
            window.history.back();
        }
    };

    const selectItem = (item, push = false) => {
        const isDir = item.isDir;
        const entry = {
            id: Date.now(),
            type: isDir ? 'dir' : 'file',
            [isDir ? 'path' : 'item']: isDir ? item.pathParts : item
        };

        if (push) {
            setDetailStack(prev => {
                if (prev.length > 0 && prev[prev.length - 1].type === 'menu') {
                    // Replace menu with the new item entry
                    setShouldReplaceState(true);
                    return [...prev.slice(0, -1), entry];
                }
                return [...prev, entry];
            });
        } else {
            setSelectedItem(isDir ? null : item);
            setDetailStack([entry]);
        }
    };

    const resetBrowser = () => {
        setActiveTab('browser');
        setCurrentPath([]);
        setSelectedItem(null);
        setDetailStack([]);
    };

    return {
        activeTab, setActiveTab, switchTab,
        selectedItem, setSelectedItem,
        currentPath, setCurrentPath,
        detailStack, setDetailStack,
        expandedPaths, setExpandedPaths,
        toggleExpand,
        navigateTo,
        handleBack,
        selectItem,
        resetBrowser,
        isExternalBack
    };
}
