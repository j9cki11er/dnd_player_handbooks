import { navMascots } from '../utils/handbookNavigation';
import DisplaySettings from './DisplaySettings';
import { ArrowLeft, Search } from 'lucide-react';
import McpGuide from "./McpGuide";


export default function TopBar({ activeTab, selectedItem, currentPath, detailStack, handleBack, onHome, switchTab, theme, toggleTheme }) {
    const getTitle = () => {
        if (selectedItem) return selectedItem.title;

        switch (activeTab) {
            case 'browser':
                return '冒险手册';
            case 'items': return '武器装备';
            case 'spells': return '法术列表';
            case 'search': return '全局搜索';
            case 'bookmarks': return '我的收藏';
            default: return '冒险手册';
        }
    };

    const showBackButton = (activeTab === 'browser' && (currentPath.length > 0 || selectedItem || detailStack.length > 0)) ||
        (activeTab !== 'browser' && (selectedItem || detailStack.length > 0));

    return (
        <header className="sticky-top-bar">
            <div className="top-bar-left">
                {showBackButton ? (
                    <button onClick={handleBack} className="top-bar-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                ) : (
                    <button type="button" className="top-bar-home" aria-label="返回主页" onClick={onHome}>
                        <img src="/DFD logo-cropped.png" alt="" />
                    </button>
                )}
                <h1 className="top-bar-title">{getTitle()}</h1>
            </div>
            <div className="top-bar-actions">
                <McpGuide />

                <DisplaySettings theme={theme} toggleTheme={toggleTheme} />
                {activeTab === 'search' ? (
                    <img className="top-bar-search-mascot" src={`/dfdnono/dfdnono${navMascots.search}.webp`} alt="" />
                ) : (
                    <button onClick={() => switchTab('search')} className="top-bar-search-btn" aria-label="全局搜索">
                        <Search size={22} />
                    </button>
                )}
            </div>
        </header>
    );
}
