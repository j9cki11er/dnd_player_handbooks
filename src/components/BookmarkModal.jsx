import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Heart } from 'lucide-react';
import { isDialogBackdropClick } from '../utils/dialog';

export default function BookmarkModal({ isOpen, onClose, pendingBookmark, bookmarks, toggleBookmark }) {
    const dialog = useRef(null);
    const manuallyEdited = useRef(false);
    const visible = isOpen && Boolean(pendingBookmark);

    useLayoutEffect(() => {
        if (!visible) return;
        const element = dialog.current;
        manuallyEdited.current = false;
        element.showModal();
        return () => element.close();
    }, [visible]);

    if (!visible) return null;

    function finish() {
        const { id, suggestedFolder } = pendingBookmark;
        const suggestedItems = bookmarks[suggestedFolder];
        if (!manuallyEdited.current && suggestedFolder && suggestedItems && !suggestedItems.includes(id)) {
            toggleBookmark(id, suggestedFolder);
        }
        onClose();
    }

    return createPortal(
        <dialog ref={dialog} className="gear-dialog bookmark-folder-dialog" aria-labelledby="bookmark-folder-title"
            onCancel={event => { event.preventDefault(); onClose(); }}
            onClick={event => { if (isDialogBackdropClick(event)) onClose(); }}>
            <div className="bookmark-folder-dialog-body">
                <h3 id="bookmark-folder-title" className="modal-title gold-text">选择收藏文件夹</h3>
                <p className="modal-subtitle">点击文件夹以添加或移除 <strong>{pendingBookmark.title}</strong></p>
                <div className="folder-selection-list">
                    {Object.entries(bookmarks).map(([folder, ids]) => {
                        const selected = ids.includes(pendingBookmark.id);
                        const suggested = !selected && folder === pendingBookmark.suggestedFolder;
                        return (
                            <button key={folder} type="button" aria-pressed={selected}
                                className={`folder-select-item ${selected ? 'selected' : suggested ? 'suggested' : ''}`}
                                onClick={() => {
                                    manuallyEdited.current = true;
                                    toggleBookmark(pendingBookmark.id, folder);
                                }}>
                                <span className="folder-name-row"><Bookmark size={18} />{folder}</span>
                                {(selected || suggested) && <Heart size={14} fill="currentColor" className="text-red-500" aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
                <div className="modal-actions">
                    <button type="button" onClick={finish} className="gold-button">完成</button>
                </div>
            </div>
        </dialog>, document.body
    );
}
