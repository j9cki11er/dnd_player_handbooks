import { useRef, useState } from 'react';
import { Minus, Plus, Sun, Moon, X } from 'lucide-react';
import { defaultTextSize, getTextSize, minTextSize, maxTextSize, saveTextSize } from '../utils/textSize';

export default function DisplaySettings({ theme, toggleTheme }) {
    const dialog = useRef(null);
    const [size, setSize] = useState(getTextSize);
    const themeLabel = theme === 'dark' ? '切换浅色模式' : '切换深色模式';

    function updateSize(nextSize) {
        saveTextSize(nextSize);
        setSize(nextSize);
    }

    return (
        <>
            <button type="button" className="top-bar-theme-toggle" title="显示设置" aria-label="显示设置"
                aria-haspopup="dialog" onClick={() => {
                    setSize(getTextSize());
                    dialog.current.showModal();
                }}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <dialog ref={dialog} className="display-settings" aria-label="显示设置"
                onClick={event => {
                    if (event.target === event.currentTarget) dialog.current.close();
                }}>
                <div className="display-settings-panel">
                    <div className="display-settings-row">
                        <strong>显示设置</strong>
                        <button type="button" aria-label="关闭显示设置" onClick={() => dialog.current.close()}><X size={18} /></button>
                    </div>
                    <button type="button" onClick={toggleTheme}>{themeLabel}</button>
                    <div className="display-settings-row">
                        <span>全站字号</span>
                        <button type="button" aria-label="缩小字号" disabled={size <= minTextSize} onClick={() => updateSize(size - 5)}><Minus size={18} /></button>
                        <output aria-live="polite">{size}%</output>
                        <button type="button" aria-label="放大字号" disabled={size >= maxTextSize} onClick={() => updateSize(size + 5)}><Plus size={18} /></button>
                    </div>
                    <button type="button" disabled={size === defaultTextSize} onClick={() => updateSize(defaultTextSize)}>重置字号</button>
                </div>
            </dialog>
        </>
    );
}
