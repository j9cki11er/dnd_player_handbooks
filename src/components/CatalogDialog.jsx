import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { loadContent, prepareContent } from '../utils/content';
import { gearPriceLabel } from '../utils/gear';
import { spellText, splitSpellDetails, formatCreatureBlocks } from '../utils/spellSummary';

export default function CatalogDialog({ item, onClose, showCreature = false }) {
    const titleId = useId();
    const isSpell = Number.isInteger(item.levelNumeric);
    const ref = useRef(null);
    const descriptionRef = useRef(null);
    const [hasCreatures, setHasCreatures] = useState(false);
    const [spellFields, setSpellFields] = useState({});
    const [content, setContent] = useState('加载中…');
    useEffect(() => {
        const previous = document.activeElement;
        const dialog = ref.current;
        dialog.showModal();
        const controller = new AbortController();
        if (item.descriptionHtml) setContent(prepareContent(item.descriptionHtml));
        else loadContent(item.path, controller.signal).then(html => {
            if (!controller.signal.aborted) {
                const body = (item.itemType || isSpell)
                    ? html.replace(/^\s*<(h[234])\b[^>]*>[\s\S]*?<\/\1>/i, '')
                    : html;
                if (isSpell) {
                    const details = splitSpellDetails(body);
                    setSpellFields(details.fields);
                    const creatures = formatCreatureBlocks(details.html);
                    setHasCreatures(creatures.hasCreatures);
                    setContent(creatures.html);
                } else setContent(showCreature ? formatCreatureBlocks(body, { expanded: true }).html : body);
            }
        }).catch(() => { if (!controller.signal.aborted) setContent('内容加载失败，请重试。'); });
        return () => { controller.abort(); dialog.close(); previous?.focus(); };
    }, [item, isSpell, showCreature]);
    return createPortal(<dialog ref={ref} className="gear-dialog reference-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="gear-dialog-surface">
        <header className="gear-dialog-header">
            {isSpell ? (
                <h2 id={titleId} className="spell-dialog-heading">
                    <span className="spell-level-badge">{item.level || '环阶未知'}</span>
                    <span>{item.title} <small lang="en">{item.titleEn}</small></span>
                </h2>
            ) : (
                <div>
                    <h2 id={titleId}>{item.title}</h2>
                    <p>{item.damage ? `${item.titleEn} · ${item.category}` : item.itemType || showCreature ? [item.titleEn, showCreature && item.cr != null ? `CR ${item.cr}` : ''].filter(Boolean).join(' · ') : `重量 ${item.weight} · ${gearPriceLabel(item)}`}</p>
                </div>
            )}
            <button className="gear-close" aria-label={isSpell ? '关闭法术说明' : '关闭物品说明'} onClick={onClose} autoFocus><X size={20} /></button>
        </header>
        {item.itemType && (
            <dl className="gear-dialog-meta magic-dialog-meta">
                <div><dt>类别</dt><dd>{item.itemType}</dd></div>
                <div><dt>稀有度</dt><dd>{item.rarity}</dd></div>
                <div><dt>同调</dt><dd>{item.requiresAttunement ? '需要' : '无需'}</dd></div>
            </dl>
        )}
        {isSpell && (
            <>
                <p className="spell-dialog-classification">
                    {[item.school, item.classes?.join('、')].filter(Boolean).join(' · ')}
                </p>
                <dl className="weapon-dialog-stats spell-dialog-stats">
                    {[
                        ['施法时间', 'castingTime'],
                        ['施法距离', 'range'],
                        ['持续时间', 'duration'],
                        ['法术成分', 'components'],
                    ].map(([label, key]) => (
                        <div key={key}>
                            <dt>{label}</dt>
                            <dd>{spellFields[key] || spellText(item[key]) || '—'}</dd>
                        </div>
                    ))}
                </dl>
                {hasCreatures && (
                    <button type="button" className="gear-reset spell-creature-jump"
                        onClick={() => {
                            const creature = descriptionRef.current?.querySelector('.spell-creature-disclosure');
                            if (creature) {
                                creature.open = true;
                                creature.querySelector('summary')?.focus({ preventScroll: true });
                                creature.scrollIntoView({ block: 'start' });
                            }
                        }}>
                        ↓ 查看生物数据
                    </button>
                )}
            </>
        )}
        {item.damage ? (
            <dl className="weapon-dialog-stats">
                {[
                    ['伤害', item.damage],
                    ['重量', item.weight],
                    ['价格', item.cost],
                ].map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>
                ))}
                <div className="weapon-dialog-mastery"><dt>精通</dt><dd>{item.mastery || '—'}</dd></div>
                <div className="weapon-dialog-properties"><dt>词条</dt><dd>{item.properties || '—'}</dd></div>
            </dl>
        ) : <div ref={descriptionRef} className="gear-dialog-description dnd-content" dangerouslySetInnerHTML={{ __html: content }} />}

    </div></dialog>, document.body);
}
