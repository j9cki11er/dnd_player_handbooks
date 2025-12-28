import React from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';

export default function WelcomePanel({ chapters, expansions = [], categoryTree, navigateTo }) {
    return (
        <div className="welcome-panel">
            <div className="logo flex items-center gap-2">
                <a href="/" className="sidebar-header" onClick={(e) => { e.preventDefault(); handleNavClick(() => { setActiveTab('browser'); setCurrentPath([]); setSelectedItem(null); setDetailStack([]); }); }}>
                    <img src="/DFD logo-cropped.png" alt="Logo" className="sidebar-logo" />
                    <div className="flex flex-col">
                        <span className="logo-text dnd-font gold-text leading-tight">Don't Feed Dragon <br></br>不要喂龙公会</span>
                    </div>
                </a>
            </div>

            {/* <img src="/DFD logo-cropped.png" alt="Welcome Logo" className="welcome-logo" /> */}
            {/* <h3 className="welcome-logo-text dnd-font gold-text text-2xl mb-2">不要喂龙公会</h3> */}
            <h2 className="welcome-title text-2xl mb-2">DnD 玩家手册2024</h2>
            <p className="welcome-desc">从目录选择分类，或使用全局搜索，快速查找规则、法术与职业内容。常用资料可 ❤️ 收藏至文件夹，让你在冒险途中随时查阅。</p>

            <div className="welcome-directory mt-6">
                <div className="item-grid">
                    {chapters.map(name => {
                        const node = categoryTree[name];
                        if (!node) return null;
                        return (
                            <motion.div
                                key={name}
                                whileHover={{ scale: 1.02, y: -4 }}
                                onClick={() => navigateTo(node._path, true, false)}
                                className="item-card glass-panel flex flex-col items-center justify-center py-6"
                            >
                                <Folder size={24} className="text-gold opacity-60 mb-2" />
                                <h4 className="card-title text-center text-sm">{name}</h4>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {expansions.length > 0 && (
                <>
                    <h2 className="welcome-title text-2xl mb-2 mt-12">扩充手册</h2>
                    <p className="welcome-desc">
                        扩充手册包含额外的角色创建选项与规则模块。
                        想要更强并非是毫无代价的——使用扩充手册创建的角色将比标准规则低 1️⃣ 个等级。
                    </p>
                    <div className="welcome-directory mt-6">
                        <div className="item-grid">
                            {expansions.map(name => {
                                const node = categoryTree[name];
                                if (!node) return null;
                                return (
                                    <motion.div
                                        key={name}
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        onClick={() => navigateTo(node._path, true, false)}
                                        className="item-card glass-panel flex flex-col items-center justify-center py-6"
                                    >
                                        <Folder size={24} className="text-gold opacity-60 mb-2" />
                                        <h4 className="card-title text-center text-sm">{name}</h4>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <div className="disclaimer-box">
                <p className="text-gold opacity-90 text-sm leading-relaxed whitespace-pre-line">
                    <strong>冒险者须知 · Beta 测试</strong><br></br>
                    {"\n"}
                    此玩家手册仍在锻造之中（Beta 测试阶段）。<br></br>
                    {"\n"}
                    若你在冒险途中发现任何异常、错误，或有改进建议，<br></br>
                    {"\n"}
                    请透过 WhatsApp 将情报送达：<br></br>
                    {"\n"}
                    <a
                        href="https://wa.me/60175815819"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-link text-lg block my-1"
                    >
                        +60 17-581 5819
                    </a>
                    {"\n"}<br></br>
                    你的反馈，将决定下一次升级的命运。
                </p>
            </div>

            <footer className="welcome-footer mt-16 pt-8 border-t border-gold/10 text-center">
                <p className="footer-text text-xs opacity-60 leading-relaxed">
                    Provided by Don't Feed Dragon 不要喂龙公会 <br></br> Powered by <a href="https://elifestyles.biz" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">eLifeStyles.biz</a>
                </p>
                <p className="footer-link text-xs opacity-60 mt-1">
                    查看更多玩家手册在: <a href="https://5echm.kagangtuya.top/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">https://5echm.kagangtuya.top/</a>
                </p>
            </footer>
        </div>
    );
}
