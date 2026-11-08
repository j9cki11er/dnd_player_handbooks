import { expansionCode } from '../utils/expansions';
import React, { useLayoutEffect, useRef } from 'react';
import { Folder } from 'lucide-react';
import { ItemCard } from './Common';

import { glossaryName, glossaryTitles } from '../utils/handbookNavigation';

function DirectoryGrid({ names, categoryTree, navigateTo }) {
    return (
        <div className="item-grid reference-card-grid welcome-four-grid">
            {names.map(name => {
                const node = categoryTree[name];
                if (!node) return null;
                const code = expansionCode(name);
                const [chapter, chapterTitle] = name.split('：', 2);
                const prefix = code || chapter;
                const suffix = ` (${code})`;
                const title = code
                    ? (name.endsWith(suffix) ? name.slice(0, -suffix.length) : name)
                    : chapterTitle;
                return (
                    <button key={name} type="button" className="item-card glass-panel welcome-chapter-card"
                        onClick={() => navigateTo(node._path, true, false)}>
                        <span className="card-category welcome-chapter-prefix">
                            <Folder size={16} aria-hidden="true" />
                            {prefix}
                        </span>
                        <span className="card-title">{title.replaceAll('：', ' ')}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function WelcomePanel({ theme, chapters, expansions = [], categoryTree, navigateTo, selectItem, isBookmarkedAnywhere, openBookmarkDialog }) {
    const panel = useRef(null);
    useLayoutEffect(() => {
        const titles = [...panel.current.querySelectorAll('.welcome-directory .card-title')];
        const fitTitles = () => {
            for (const title of titles) title.style.removeProperty('font-size');
            const sizes = titles.map(title => {
                if (!title.clientWidth || title.scrollWidth <= title.clientWidth) return null;
                const size = Number.parseFloat(getComputedStyle(title).fontSize);
                return Math.floor(size * title.clientWidth / title.scrollWidth * 10) / 10;
            });
            titles.forEach((title, index) => {
                if (sizes[index] !== null) title.style.fontSize = `${sizes[index]}px`;
            });
        };

        fitTitles();
        const resize = new ResizeObserver(fitTitles);
        resize.observe(panel.current);
        const settings = new MutationObserver(fitTitles);
        settings.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
        return () => {
            resize.disconnect();
            settings.disconnect();
        };
    }, [categoryTree, chapters, expansions]);

    const glossaryFiles = categoryTree[glossaryName]?._files ?? [];
    const glossaryItems = glossaryTitles.map(title => glossaryFiles.find(item => item.title === title)).filter(Boolean);
    return (
        <div className="welcome-panel" ref={panel}>
            <img src={theme === 'light' ? '/DND桌子深色标题.webp' : '/DND桌子浅色标题.webp'} alt="诺诺 DnD" className="welcome-logo" width={3000} height={1509} />

            <div className="welcome-directory mt-6">
                <DirectoryGrid names={chapters.filter(name => !name.startsWith('附录'))}
                    categoryTree={categoryTree} navigateTo={navigateTo} />
            </div>

            {glossaryItems.length > 0 && (
                <section className="welcome-directory mt-12" aria-labelledby="welcome-glossary-title">
                    <h2 id="welcome-glossary-title" className="welcome-title text-2xl mb-2">常用知识</h2>
                    <div className="item-grid reference-card-grid welcome-four-grid">
                        {glossaryItems.map(item => (
                            <ItemCard key={item.id} item={item} lightweight categoryLabel="常用知识"
                                onClick={() => selectItem(item)}
                                isBookmarked={isBookmarkedAnywhere(item.id)}
                                openBookmarkDialog={openBookmarkDialog} />
                        ))}
                    </div>
                </section>
            )}

            <section className="welcome-directory mt-12" aria-labelledby="welcome-appendix-title">
                <h2 id="welcome-appendix-title" className="welcome-title text-2xl mb-2">附录</h2>
                <DirectoryGrid names={chapters.filter(name => name.startsWith('附录'))}
                    categoryTree={categoryTree} navigateTo={navigateTo} />
            </section>

            {expansions.length > 0 && (
                <>
                    <p className="welcome-desc">
                        扩充手册包含额外的角色创建选项与规则模块。
                        但力量并非毫无代价——使用扩充手册创建的角色将比标准规则低 1️⃣ 个等级。
                    </p>
                    <div className="welcome-directory mt-6">
                        <DirectoryGrid names={expansions} categoryTree={categoryTree} navigateTo={navigateTo} />
                    </div>
                </>
            )}

            <div className="disclaimer-box">
                <p className="text-gold opacity-90 text-sm leading-relaxed whitespace-pre-line">
                    <strong>冒险者须知 · Beta 测试</strong><br></br>
                    {"\n"}
                    此冒险手册仍在锻造之中（Beta 测试阶段）。<br></br>
                    {"\n"}
                    若你在冒险途中发现任何异常、错误，或有改进建议，<br></br>
                    {"\n"}
                    请透过 WhatsApp 将情报送达：<br></br>
                    {"\n"}
                    <a
                        href="https://wa.me/60176698311"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-link text-lg block my-1"
                    >
                        0176698311
                    </a>
                    {"\n"}<br></br>
                    你的反馈，将决定下一次升级的命运。
                </p>
            </div>

            <footer className="welcome-footer mt-16 pt-8 border-t border-gold/10 text-center">
                <p className="footer-text text-xs opacity-60 leading-relaxed">
                    内容由不要喂龙公会提供 <br />网页技术支持： <a href="https://elifestyles.biz" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">eLifeStyles.biz</a>
                </p>
                <p className="footer-text text-xs opacity-60 leading-relaxed">
                    插画绘制：<a href="https://www.instagram.com/yi.lin.10/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">一零 l YiLin</a>
                </p>
                <p className="footer-link text-xs opacity-60 mt-1">
                    查看更多冒险手册在: <a href="https://5echm.kagangtuya.top/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">https://5echm.kagangtuya.top/</a>
                </p>
            </footer>
        </div>
    );
}
