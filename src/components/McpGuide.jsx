import { isDialogBackdropClick } from '../utils/dialog';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Copy, Image, Plug, X } from 'lucide-react';

const endpoint = 'https://dfd-playerhandbooks.elsbiz.website/mcp';
const prompt = '请查询不要喂龙公会的手册，告诉我火球术的伤害，并附上书名和条目链接。只依据手册原文回答，找不到就直接说明。';

export default function McpGuide() {
    const dialog = useRef(null);
    const titleId = useId();
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        if (!feedback) return;
        const timeout = setTimeout(() => setFeedback(null), 2800);
        return () => clearTimeout(timeout);
    }, [feedback]);

    async function copy(value, label) {
        try {
            await navigator.clipboard.writeText(value);
            setFeedback({ message: `复制成功 · ${label}` });
        } catch {
            setFeedback({ message: '复制失败，请选中文字手动复制。' });
        }
    }

    return <>
        <button type="button" className="top-bar-theme-toggle mcp-guide-trigger"
            aria-label="ChatGPT 查询设置" aria-haspopup="dialog" title="ChatGPT 查询设置"
            onClick={() => { setFeedback(null); dialog.current.showModal(); }}>
            <Plug size={20} aria-hidden="true" />
        </button>
        {createPortal(
            <dialog ref={dialog} className="gear-dialog mcp-guide" aria-labelledby={titleId}
                onClick={event => { if (isDialogBackdropClick(event)) dialog.current.close(); }}>
                <div className="gear-dialog-surface">
                    <header className="mcp-guide-header">
                        <div>
                            <p className="mcp-guide-kicker"><Plug size={16} aria-hidden="true" /> 不要喂龙公会 · D&D 2024</p>
                            <h2 id={titleId}>用 ChatGPT 查询手册</h2>
                            <p>连接一次，即可在聊天中查询核心规则与公开扩充。</p>
                        </div>
                        <button type="button" className="gear-close" aria-label="关闭设置教程"
                            onClick={() => dialog.current.close()} autoFocus><X size={20} /></button>
                    </header>
                    <section className="mcp-guide-section">
                        <h3><span>01</span> 连接手册</h3>
                        <ol className="mcp-guide-steps">
                            <li>打开插件页，选择添加自定义服务器。</li>
                            <li>填写下方名称和网址，认证选择「无认证」。</li>
                            <li>确认风险提示后创建插件。</li>
                        </ol>
                        {[
                            ['名称', '不要喂龙公会｜玩家手册 2024'],
                            ['服务器网址', endpoint],
                        ].map(([label, value]) => (
                            <div className="mcp-guide-copy" key={label}>
                                <strong>{label}</strong>
                                <p className="mcp-guide-prompt">{value}</p>
                                <button type="button" className="gear-reset" onClick={() => copy(value, label)}><Copy size={16} /> 复制{label}</button>
                            </div>
                        ))}
                        <a className="mcp-guide-link" href="https://chatgpt.com/plugins" target="_blank" rel="noopener noreferrer">
                            打开插件页 <ArrowUpRight size={16} aria-hidden="true" />
                        </a>
                        <details className="mcp-guide-copy">
                            <summary><Image size={16} aria-hidden="true" /> 查看设置截图</summary>
                            <p>截图仅用于辨认表单位置。认证请选择「无认证」。</p>
                            <img src="/mcp-setup.png" alt="添加自定义服务器的设置表单" width="1072" height="1336" loading="lazy" />
                        </details>
                    </section>
                    <section className="mcp-guide-section mcp-guide-chat">
                        <h3><span>02</span> 发出第一条查询</h3>
                        <p>开启新对话，输入 <code>@</code> 选中刚添加的手册，再发送你的问题。</p>
                        <div className="mcp-guide-copy">
                            <p className="mcp-guide-prompt">{prompt}</p>
                            <button type="button" className="gear-reset" onClick={() => copy(prompt, '查询示例')}><Copy size={16} /> 复制示例</button>
                        </div>
                        <div role="status">{feedback && <p className="mcp-guide-status">{feedback.message}</p>}</div>
                    </section>
                </div>
            </dialog>, document.body)}
    </>;
}
