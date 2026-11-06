import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Heart } from 'lucide-react';
import { isDialogBackdropClick } from '../utils/dialog';

export default function BookmarkModal({ isOpen, pendingBookmark, ...props }) {
    if (!isOpen || !pendingBookmark) return null;
    return <FolderPicker key={pendingBookmark.id} pendingBookmark={pendingBookmark} {...props} />;
}

function FolderPicker({ onClose, pendingBookmark, orderedFolders: folders, saveBookmarkFolders }) {
    const dialog = useRef(null);
    const [selectedFolders, setSelectedFolders] = useState(
        () => new Set([...pendingBookmark.savedFolders, ...pendingBookmark.suggestedFolders])
    );

    function toggleFolder(folder) {
        setSelectedFolders(previous => {
            const next = new Set(previous);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    }

    useLayoutEffect(() => {
        const element = dialog.current;
        element.showModal();
        element.querySelector('h3').focus({ preventScroll: true });
        return () => element.close();
    }, []);

    function finish() {
        saveBookmarkFolders(pendingBookmark.id, folders.filter(folder => selectedFolders.has(folder)));
        onClose();
    }

    return createPortal(
        <dialog ref={dialog} className="gear-dialog bookmark-folder-dialog" aria-labelledby="bookmark-folder-title"
            onCancel={event => { event.preventDefault(); onClose(); }}
            onClick={event => { if (isDialogBackdropClick(event)) onClose(); }}>
            <div className="bookmark-folder-dialog-body">
                <header>
                    <h3 id="bookmark-folder-title" className="modal-title gold-text" tabIndex={-1}>选择收藏文件夹</h3>
                    <p className="modal-subtitle">点击文件夹以添加或移除 <strong>{pendingBookmark.title}</strong></p>
                    <p className="bookmark-folder-summary" aria-live="polite">
                        已选 {selectedFolders.size} / {folders.length} 个文件夹
                        {folders.length > 1 && ' · 列表可滚动查看'}
                    </p>
                </header>
                <div className="folder-selection-list">
                    {folders.map(folder => {
                        const selected = selectedFolders.has(folder);
                        return (
                            <button key={folder} type="button" aria-pressed={selected}
                                className={`folder-select-item${selected ? ' selected' : ''}`}
                                onClick={() => toggleFolder(folder)}>
                                <span className="folder-name-row"><Bookmark size={18} aria-hidden="true" />{folder}</span>
                                <Heart size={18} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
                            </button>
                        );
                    })}
                </div>
                <div className="modal-actions">
                    <button type="button" className="action-btn-small" disabled={!selectedFolders.size}
                        onClick={() => setSelectedFolders(new Set())}>重置</button>
                    <button type="button" onClick={finish} className="gold-button">完成</button>
                </div>
            </div>
        </dialog>, document.body
    );
}
