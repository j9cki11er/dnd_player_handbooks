import { useState, useEffect } from 'react';
import { resolveBookmarkItem } from '../utils/helpers';

export function useNavigation({ categoryTree, spellData, featData, masteryData, data }) {
    const [activeTab, setActiveTab] = useState('browser');
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentPath, setCurrentPath] = useState([]);
    const [detailStack, setDetailStack] = useState([]);
    const [expandedPaths, setExpandedPaths] = useState({});
    const [shouldReplaceState, setShouldReplaceState] = useState(false);

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

            if (isDifferent) {
                if (shouldReplaceState) {
                    window.history.replaceState(currentState, '', '');
                    setShouldReplaceState(false);
                } else {
                    window.history.pushState(currentState, '', '');
                }
            }
        }
        window._isPopStateNavigating = false;
    }, [activeTab, currentPath, selectedItem, detailStack, shouldReplaceState]);

    // Listen for back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state) {
                window._isPopStateNavigating = true;
                const { activeTab, currentPath, selectedId } = event.state;

                setActiveTab(activeTab);
                setCurrentPath(currentPath);

                if (selectedId) {
                    const item = resolveBookmarkItem(selectedId, { categoryTree, spellData, featData, masteryData, data });
                    setSelectedItem(item);
                } else {
                    setSelectedItem(null);
                }

                setDetailStack(event.state.detailStack || []);
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.history.replaceState({
            activeTab,
            currentPath,
            selectedId: selectedItem?.id || null,
            detailStack: []
        }, '', '');

        return () => window.removeEventListener('popstate', handlePopState);
    }, [categoryTree, spellData, featData, masteryData, data]);

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
        if (window.history.state && (window.history.state.detailStack?.length > 1 || window.history.state.selectedId || (window.history.state.activeTab === 'browser' && window.history.state.currentPath.length > 0))) {
            window.history.back();
        } else if (detailStack.length > 0 || selectedItem || currentPath.length > 0) {
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
        activeTab, setActiveTab,
        selectedItem, setSelectedItem,
        currentPath, setCurrentPath,
        detailStack, setDetailStack,
        expandedPaths, setExpandedPaths,
        toggleExpand,
        navigateTo,
        handleBack,
        selectItem,
        resetBrowser
    };
}
