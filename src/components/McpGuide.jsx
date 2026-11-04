import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Plug, X } from 'lucide-react';

const endpoint = 'https://dfd-playerhandbooks.elsbiz.website/mcp';
const prompt = '请使用我已添加的 D&D 玩家手册 MCP 插件查询规则。先搜索，再读取命中条目的原文。只根据本站公开原文回答，注明实际书名、章节或条目。核心手册是《玩家手册 2024》，扩充资料按各自来源标注。每次回答标注「不要喂龙公会」，出处使用工具提供的网站链接。不要用网络搜索或模型记忆补充。没有足够依据时，请回答「当前手册网站公开资料中未找到相关规则。」\n\n先帮我查火球术的伤害，并注明出处。';

export default function McpGuide() {
    const dialog = useRef(null);
    const titleId = useId();
    const [feedback, setFeedback] = useState('');

    async function copy(value, label) {
        try {
            await navigator.clipboard.writeText(value);
            setFeedback(`已复制${label}`);
        } catch {
            setFeedback('复制失败，请选中文字手动复制。');
        }
    }

    return <>
        <button type="button" className="top-bar-theme-toggle mcp-guide-trigger"
            aria-label="ChatGPT 查询设置" aria-haspopup="dialog" title="ChatGPT 查询设置"
            onClick={() => { setFeedback(''); dialog.current.showModal(); }}>
            <Plug size={20} aria-hidden="true" />
        </button>
        {createPortal(
            <dialog ref={dialog} className="gear-dialog mcp-guide" aria-labelledby={titleId}
                onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
                <div className="gear-dialog-surface">
                    <header className="gear-dialog-header">
                        <h2 id={titleId}>用 ChatGPT 查询手册</h2>
                        <button type="button" className="gear-close" aria-label="关闭设置教程"
                            onClick={() => dialog.current.close()} autoFocus><X size={20} /></button>
                    </header>
                    <ol className="mcp-guide-steps">
                        <li>登录 ChatGPT 网页版，打开 Plugins（插件），点击「+」→「Add custom MCP server（添加自定义 MCP 服务器）」。如果没有这个入口，请确认账号或工作区允许添加自定义 MCP。</li>
                        <li>按下方字段填写表单。Choose icon（选择图标）可留空。</li>
                    </ol>
                    <details className="mcp-guide-copy">
                        <summary>查看 ChatGPT 设置截图</summary>
                        <p>截图展示表单位置。Authentication（认证）请从截图中的 OAuth 改为 No authentication（无认证）。</p>
                        <img src="/mcp-setup.png" alt="ChatGPT 添加自定义 MCP 服务器表单，含名称、说明、服务器网址、认证和创建按钮" width="1072" height="1336" loading="lazy" />
                    </details>
                    {[
                        ['名称', 'Name', '不要喂龙公会｜D&D 玩家手册 2024 | Don’t Feed Dragon'],
                        ['说明（选填）', 'Description (optional)', '查询 D&D《玩家手册 2024》及本站公开扩充。 Search the D&D 2024 Player Handbook and public supplements on this site.'],
                        ['服务器网址', 'Server URL', endpoint],
                    ].map(([label, english, value]) => (
                        <div className="mcp-guide-copy" key={english}>
                            <strong>{label} / <span lang="en">{english}</span></strong>
                            <p className="mcp-guide-prompt">{value}</p>
                            <button type="button" className="gear-reset" onClick={() => copy(value, label)}><Copy size={16} /> 复制{label.replace('（选填）', '')}</button>
                        </div>
                    ))}
                    <ul className="mcp-guide-steps">
                        <li><strong>连接 / Connection</strong>：选择「服务器网址 / Server URL」，粘贴上面的地址。</li>
                        <li><strong>认证 / Authentication</strong>：选择「无认证 / No authentication」。</li>
                    </ul>
                    <ol className="mcp-guide-steps" start="3">
                        <li>阅读风险提示，确认信任后勾选「我了解并希望继续 / I understand and want to continue」，再点击「创建为插件 / Create as a plugin」。</li>
                        <li>安装插件后开启新聊天，输入 <code>@</code> 选择「不要喂龙公会｜D&D 玩家手册 2024」，然后复制并发送下方指令。示例会查询火球术，你可以换成自己的规则问题。</li>
                    </ol>
                    <div className="mcp-guide-copy">
                        <p className="mcp-guide-prompt">{prompt}</p>
                        <button type="button" className="gear-reset" onClick={() => copy(prompt, '聊天指令')}><Copy size={16} /> 复制聊天指令</button>
                    </div>
                    <p className="mcp-guide-status" role="status">{feedback}</p>
                </div>
            </dialog>, document.body)}
    </>;
}
