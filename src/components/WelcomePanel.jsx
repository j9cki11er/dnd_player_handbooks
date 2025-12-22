import React from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';

export default function WelcomePanel({ chapters, categoryTree, navigateTo }) {
    return (
        <div className="welcome-panel">
            <img src="/DFD logo-cropped.png" alt="Welcome Logo" className="welcome-logo" />
            <h3 className="welcome-logo-text dnd-font gold-text text-2xl mb-2">不要喂龙公会</h3>
            <h2 className="welcome-title text-2xl mb-2">DnD 玩家手册2024</h2>
            <p className="welcome-desc mb-6">从目录选择分类，或使用全局搜索，快速查找规则、法术与职业内容。常用资料可 ❤️ 收藏至文件夹，让你在冒险途中随时查阅。</p>
            <div className="disclaimer-box mb-8">
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

            <div className="welcome-directory mt-12">
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
                                <Folder size={32} className="text-gold opacity-60 mb-2" />
                                <h4 className="card-title text-center text-sm">{name}</h4>
                            </motion.div>
                        );
                    })}
                </div>
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
