import React, { useState, useEffect } from 'react';
import {
    User, Shield, Swords, Heart, Zap, Sword, Book, Backpack,
    Coins, Scroll, Settings, Plus, Trash2, ChevronRight,
    ChevronDown, Save, RefreshCw, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CHARACTER = {
    "id": null,
    "meta": {
        "system": "DND5E_2024",
        "language": "zh-CN",
        "version": "1.0"
    },
    "identity": {
        "name": "无名英雄",
        "race": "人类",
        "class": "战士",
        "subclass": "",
        "level": 1,
        "background": "",
        "alignment": "中立",
        "experience": 0
    },
    "body": {
        "size": "中型",
        "speed": 30
    },
    "combat": {
        "armor_class": 10,
        "shield": false,
        "initiative": 0,
        "proficiency_bonus": 2,
        "heroic_inspiration": false,
        "passive_perception": 10
    },
    "vitals": {
        "hp": {
            "current": 10,
            "max": 10,
            "temporary": 0
        },
        "hit_dice": {
            "type": "d10",
            "total": 1,
            "spent": 0
        },
        "death_saves": {
            "success": 0,
            "failure": 0
        }
    },
    "attributes": {
        "strength": { "label": "力量", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": { "athletics": { "label": "运动", "proficient": false, "bonus": 0 } } },
        "dexterity": { "label": "敏捷", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": { "acrobatics": { "label": "特技", "proficient": false, "bonus": 0 }, "sleight_of_hand": { "label": "巧手", "proficient": false, "bonus": 0 }, "stealth": { "label": "隐匿", "proficient": false, "bonus": 0 } } },
        "constitution": { "label": "体质", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": {} },
        "intelligence": { "label": "智力", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": { "arcana": { "label": "奥秘", "proficient": false, "bonus": 0 }, "history": { "label": "历史", "proficient": false, "bonus": 0 }, "investigation": { "label": "调查", "proficient": false, "bonus": 0 }, "nature": { "label": "自然", "proficient": false, "bonus": 0 }, "religion": { "label": "宗教", "proficient": false, "bonus": 0 } } },
        "wisdom": { "label": "感知", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": { "perception": { "label": "察觉", "proficient": false, "bonus": 0 }, "insight": { "label": "洞悉", "proficient": false, "bonus": 0 }, "medicine": { "label": "医药", "proficient": false, "bonus": 0 }, "survival": { "label": "求生", "proficient": false, "bonus": 0 }, "animal_handling": { "label": "驯兽", "proficient": false, "bonus": 0 } } },
        "charisma": { "label": "魅力", "score": 10, "modifier": 0, "save": { "proficient": false, "bonus": 0 }, "skills": { "deception": { "label": "欺瞒", "proficient": false, "bonus": 0 }, "intimidation": { "label": "威吓", "proficient": false, "bonus": 0 }, "performance": { "label": "表演", "proficient": false, "bonus": 0 }, "persuasion": { "label": "游说", "proficient": false, "bonus": 0 } } }
    },
    "attacks": [],
    "equipment": {
        "weapons": [],
        "tools": [],
        "gear": [],
        "armor_training": { "light": false, "medium": false, "heavy": false, "shields": false },
        "proficiencies": []
    },
    "features": {
        "feats": [],
        "class_features": [],
        "race_traits": []
    },
    "spellcasting": {
        "enabled": false,
        "ability": "",
        "ability_modifier": 0,
        "spell_save_dc": 0,
        "spell_attack_bonus": 0,
        "slots": { "1": { "max": 0, "used": 0 }, "2": { "max": 0, "used": 0 }, "3": { "max": 0, "used": 0 }, "4": { "max": 0, "used": 0 }, "5": { "max": 0, "used": 0 }, "6": { "max": 0, "used": 0 }, "7": { "max": 0, "used": 0 }, "8": { "max": 0, "used": 0 }, "9": { "max": 0, "used": 0 } },
        "spells": []
    },
    "wealth": {
        "cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0,
        "attunements": []
    },
    "roleplay": {
        "backstory": "",
        "personality": "",
        "appearance": "",
        "languages": []
    }
};

const calcModifier = (score) => Math.floor((score - 10) / 2);

const CharacterPanel = () => {
    const [characters, setCharacters] = useState(() => {
        const saved = localStorage.getItem('dnd_characters_2024');
        if (saved) return JSON.parse(saved);

        // Migration from single char
        const legacy = localStorage.getItem('dnd_character_2024');
        if (legacy) {
            const legacyChar = JSON.parse(legacy);
            legacyChar.id = legacyChar.id || Date.now();
            return [legacyChar];
        }
        return [];
    });

    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        localStorage.setItem('dnd_characters_2024', JSON.stringify(characters));
    }, [characters]);

    const char = characters.find(c => c.id === selectedId) || null;

    const updateNested = (path, value) => {
        if (!selectedId) return;
        setCharacters(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const charIdx = next.findIndex(c => c.id === selectedId);
            if (charIdx === -1) return prev;

            let curr = next[charIdx];
            const parts = path.split('.');
            for (let i = 0; i < parts.length - 1; i++) {
                curr = curr[parts[i]];
            }
            curr[parts[parts.length - 1]] = value;

            // Auto-recalculate modifiers if score changed
            if (path.includes('attributes') && path.endsWith('score')) {
                const attrKey = parts[1];
                const newScore = value;
                next[charIdx].attributes[attrKey].modifier = calcModifier(newScore);
            }

            return next;
        });
    };

    const addListItem = (path, item) => {
        if (!selectedId) return;
        setCharacters(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const charIdx = next.findIndex(c => c.id === selectedId);
            if (charIdx === -1) return prev;

            let curr = next[charIdx];
            const parts = path.split('.');
            for (let i = 0; i < parts.length; i++) {
                curr = curr[parts[i]];
            }
            curr.push(item);
            return next;
        });
    };

    const removeListItem = (path, index) => {
        if (!selectedId) return;
        setCharacters(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const charIdx = next.findIndex(c => c.id === selectedId);
            if (charIdx === -1) return prev;

            let curr = next[charIdx];
            const parts = path.split('.');
            for (let i = 0; i < parts.length; i++) {
                curr = curr[parts[i]];
            }
            curr.splice(index, 1);
            return next;
        });
    };

    const addNewCharacter = () => {
        const newChar = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
        newChar.id = Date.now();
        newChar.identity.name = "新角色";
        setCharacters(prev => [...prev, newChar]);
        setSelectedId(newChar.id);
    };

    const deleteCharacter = (e, id) => {
        e.stopPropagation();
        if (confirm('确定要删除这个角色吗？')) {
            setCharacters(prev => prev.filter(c => c.id !== id));
            if (selectedId === id) setSelectedId(null);
        }
    };

    const StatBox = ({ label, value, path, type = "number" }) => (
        <div className="stat-box glass-panel">
            <span className="stat-label">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => updateNested(path, type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
                className="stat-value-input"
            />
        </div>
    );

    const AttributeCard = ({ name, attr }) => (
        <div className="attribute-card glass-panel">
            <div className="attr-header">
                <span className="attr-label">{attr.label}</span>
                <span className="attr-mod">{attr.modifier >= 0 ? `+${attr.modifier}` : attr.modifier}</span>
            </div>
            <input
                type="number"
                value={attr.score}
                onChange={(e) => updateNested(`attributes.${name}.score`, parseInt(e.target.value) || 0)}
                className="attr-score-input"
            />
            <div className="attr-save-skill">
                <div className="attr-row">
                    <input
                        type="checkbox"
                        checked={attr.save.proficient}
                        onChange={(e) => updateNested(`attributes.${name}.save.proficient`, e.target.checked)}
                    />
                    <span>豁免</span>
                    <span className="ml-auto">+{attr.modifier + (attr.save.proficient ? char.combat.proficiency_bonus : 0) + attr.save.bonus}</span>
                </div>
                {Object.entries(attr.skills).map(([skillKey, skill]) => (
                    <div className="attr-row" key={skillKey}>
                        <input
                            type="checkbox"
                            checked={skill.proficient}
                            onChange={(e) => updateNested(`attributes.${name}.skills.${skillKey}.proficient`, e.target.checked)}
                        />
                        <span className="skill-label">{skill.label}</span>
                        <span className="ml-auto">+{attr.modifier + (skill.proficient ? char.combat.proficiency_bonus : 0) + skill.bonus}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (!selectedId || !char) {
        return (
            <div className="character-panel">
                <div className="list-view-header mb-6 flex justify-between items-center">
                    <h2 className="text-2xl dnd-font gold-text m-0">我的角色卡</h2>
                    <button className="gold-button flex items-center " onClick={addNewCharacter}>
                        <Plus size={18} /> 新建角色
                    </button>
                </div>

                <div className="character-list-grid">
                    {characters.map(c => (
                        <motion.div
                            key={c.id}
                            layout
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="character-summary-card glass-panel cursor-pointer group"
                            onClick={() => setSelectedId(c.id)}
                        >
                            <div className="card-content">
                                <h3 className="gold-text dnd-font text-xl mb-1">{c.identity.name}</h3>
                                <div className="text-sm opacity-70">
                                    {c.identity.race} • {c.identity.class} • 等级 {c.identity.level}
                                </div>
                                <div className="mt-4 flex gap-4 text-xs opacity-50">
                                    <span>AC: {c.combat.armor_class}</span>
                                    <span>HP: {c.vitals.hp.current}/{c.vitals.hp.max}</span>
                                </div>
                            </div>
                            <button
                                className="delete-char-btn opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => deleteCharacter(e, c.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30" />
                        </motion.div>
                    ))}

                    {characters.length === 0 && (
                        <div className="col-span-full py-12 text-center opacity-50 italic">
                            暂无角色卡，点击右上角新建一个吧
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="character-panel">
            <div className="character-header">
                <div className="flex flex-wrap gap-4 mb-6 items-center">
                    <button
                        className="back-btn mr-2 p-2 hover:bg-white/5 rounded-full transition-colors"
                        onClick={() => setSelectedId(null)}
                    >
                        <ChevronRight className="rotate-180" size={24} />
                    </button>
                    <div className="flex-1 min-w-[200px]">
                        <input
                            className="char-name-input dnd-font gold-text"
                            value={char.identity.name}
                            onChange={(e) => updateNested('identity.name', e.target.value)}
                            placeholder="角色姓名"
                        />
                        <div className="flex  text-sm opacity-70">
                            <input value={char.identity.race} onChange={(e) => updateNested('identity.race', e.target.value)} placeholder="种族" className="inline-input" />
                            <span>•</span>
                            <input value={char.identity.class} onChange={(e) => updateNested('identity.class', e.target.value)} placeholder="职业" className="inline-input" />
                            <span>等级</span>
                            <input type="number" value={char.identity.level} onChange={(e) => updateNested('identity.level', parseInt(e.target.value) || 1)} className="inline-input w-8" />
                        </div>
                    </div>
                </div>
                    <div className="vitals-panel glass-panel mb-6">
                        <div className="section-title flex items-center  m-0 p-4 border-b border-white/10">
                            <Heart size={18} /> 生命值
                        </div>
                        <div className="p-4 flex flex-row gap-4">
                            <div className="flex flex-row gap-4 vitals-grid">
                                <div className="flex-1">
                                    <span className="stat-label block mb-1">当前</span>
                                    <input
                                        type="number"
                                        className="hp-input current"
                                        value={char.vitals.hp.current}
                                        onChange={(e) => updateNested('vitals.hp.current', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="stat-label block mb-1">上限</span>
                                    <input
                                        type="number"
                                        className="hp-input max"
                                        value={char.vitals.hp.max}
                                        onChange={(e) => updateNested('vitals.hp.max', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="stat-label block mb-1">临时</span>
                                    <input
                                        type="number"
                                        className="hp-input temp"
                                        value={char.vitals.hp.temporary}
                                        onChange={(e) => updateNested('vitals.hp.temporary', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="char-divider" />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center ">
                                    <span className="stat-label">生命骰:</span>
                                    <input className="inline-input w-12" value={char.vitals.hit_dice.total} onChange={(e) => updateNested('vitals.hit_dice.total', parseInt(e.target.value) || 0)} />
                                    <input className="inline-input w-12" value={char.vitals.hit_dice.type} onChange={(e) => updateNested('vitals.hit_dice.type', e.target.value)} />
                                </div>
                                <div className="flex items-center ">
                                    <span className="stat-label">豁免:</span>
                                    <div className="flex gap-1 text-green-500">
                                        {[1, 2, 3].map(i => (
                                            <input key={`s-${i}`} type="checkbox" checked={char.vitals.death_saves.success >= i} onChange={(e) => updateNested('vitals.death_saves.success', e.target.checked ? i : i - 1)} />
                                        ))}
                                    </div>
                                    <div className="flex gap-1 text-red-500">
                                        {[1, 2, 3].map(i => (
                                            <input key={`f-${i}`} type="checkbox" checked={char.vitals.death_saves.failure >= i} onChange={(e) => updateNested('vitals.death_saves.failure', e.target.checked ? i : i - 1)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
            </div>

            <div className="char-grid">
                {/* Main Stats Column */}
                <div className="char-col-stats">
                    <div className="stats-header-grid mb-4">
                        <StatBox label="护甲等级" value={char.combat.armor_class} path="combat.armor_class" />
                        <StatBox label="先攻" value={char.combat.initiative} path="combat.initiative" />
                        <StatBox label="速度" value={char.body.speed} path="body.speed" />
                        <StatBox label="熟练加值" value={char.combat.proficiency_bonus} path="combat.proficiency_bonus" />
                    </div>

                

                    <div className="attributes-grid mb-6">
                        {Object.entries(char.attributes).map(([key, attr]) => (
                            <AttributeCard key={key} name={key} attr={attr} />
                        ))}
                    </div>
                </div>

                {/* Combat & Items Column */}
                <div className="char-col-combat flex flex-col gap-6">
                    {/* Attacks */}
                    <div className="combat-section glass-panel">
                        <div className="section-title flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center ">
                                <Sword size={18} /> 攻击与动作
                            </div>
                            <button className="add-btn" onClick={() => addListItem('attacks', { name: "新攻击", type: "melee", attack_bonus: 0, damage: "1d8", damage_type: "挥砍", notes: "" })}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="p-2">
                            {char.attacks.map((atk, idx) => (
                                <div key={idx} className="attack-row p-2 flex flex-col gap-1 border-b border-white/5 last:border-0 relative group">
                                    <div className="flex items-center ">
                                        <input className="font-bold flex-1" value={atk.name} onChange={(e) => updateNested(`attacks.${idx}.name`, e.target.value)} />
                                        <span className="text-gold">+{atk.attack_bonus}</span>
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeListItem('attacks', idx)}>
                                            <Trash2 size={14} className="text-red-500" />
                                        </button>
                                    </div>
                                    <div className="flex  text-xs opacity-70">
                                        <input className="w-16" value={atk.damage} onChange={(e) => updateNested(`attacks.${idx}.damage`, e.target.value)} />
                                        <input className="flex-1" value={atk.damage_type} onChange={(e) => updateNested(`attacks.${idx}.damage_type`, e.target.value)} />
                                        <input className="flex-1 text-right" value={atk.notes} onChange={(e) => updateNested(`attacks.${idx}.notes`, e.target.value)} placeholder="备注" />
                                    </div>
                                </div>
                            ))}
                            {char.attacks.length === 0 && <div className="p-4 text-center opacity-30 text-sm italic">暂无攻击</div>}
                        </div>
                    </div>

                    {/* Features */}
                    <div className="features-section glass-panel">
                        <div className="section-title flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center ">
                                <Star size={18} /> 特性与专长
                            </div>
                            <button className="add-btn" onClick={() => addListItem('features.feats', { name: "新特性", source: "", desc: "" })}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="p-2 max-h-[300px] overflow-y-auto">
                            {char.features.feats.map((feat, idx) => (
                                <div key={idx} className="feat-row p-2 border-b border-white/5 last:border-0 relative group">
                                    <div className="flex items-center justify-between">
                                        <input className="font-bold text-sm" value={feat.name} onChange={(e) => updateNested(`features.feats.${idx}.name`, e.target.value)} />
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeListItem('features.feats', idx)}>
                                            <Trash2 size={14} className="text-red-500" />
                                        </button>
                                    </div>
                                    <textarea
                                        className="text-xs opacity-70 w-full mt-1 bg-transparent border-none resize-none focus:ring-0"
                                        value={feat.desc}
                                        onChange={(e) => updateNested(`features.feats.${idx}.desc`, e.target.value)}
                                        placeholder="描述..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Spellcasting if enabled */}
                    <div className="spell-section glass-panel">
                        <div className="section-title flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center ">
                                <Book size={18} /> 施法
                            </div>
                            <input
                                type="checkbox"
                                checked={char.spellcasting.enabled}
                                onChange={(e) => updateNested('spellcasting.enabled', e.target.checked)}
                            />
                        </div>
                        {char.spellcasting.enabled && (
                            <div className="p-4 flex flex-col gap-4">
                                <div className="grid grid-cols-3  text-center">
                                    <div className="stat-mini">
                                        <span className="label">能力</span>
                                        <input className="w-full text-center" value={char.spellcasting.ability} onChange={(e) => updateNested('spellcasting.ability', e.target.value)} />
                                    </div>
                                    <div className="stat-mini">
                                        <span className="label">DC</span>
                                        <input className="w-full text-center" type="number" value={char.spellcasting.spell_save_dc} onChange={(e) => updateNested('spellcasting.spell_save_dc', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div className="stat-mini">
                                        <span className="label">攻击加值</span>
                                        <input className="w-full text-center" type="number" value={char.spellcasting.spell_attack_bonus} onChange={(e) => updateNested('spellcasting.spell_attack_bonus', parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>
                                <div className="char-divider" />
                                <div className="flex flex-wrap  justify-center">
                                    {Object.entries(char.spellcasting.slots).map(([lvl, info]) => (
                                        <div key={lvl} className="slot-box">
                                            <span className="text-[10px] opacity-50">{lvl}环</span>
                                            <input
                                                className="w-8 text-center"
                                                value={`${info.used}/${info.max}`}
                                                onChange={(e) => {
                                                    const [u, m] = e.target.value.split('/');
                                                    updateNested(`spellcasting.slots.${lvl}.used`, parseInt(u) || 0);
                                                    updateNested(`spellcasting.slots.${lvl}.max`, parseInt(m) || 0);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Equipment & Wealth */}
                <div className="char-col-equipment flex flex-col gap-6">
                    <div className="equipment-section glass-panel">
                        <div className="section-title flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center ">
                                <Backpack size={18} /> 装备物品
                            </div>
                            <button className="add-btn" onClick={() => addListItem('equipment.gear', "新物品")}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {char.equipment.gear.map((item, idx) => (
                                <div key={idx} className="item-row flex items-center justify-between py-1 group">
                                    <input className="text-sm flex-1" value={item} onChange={(e) => updateNested(`equipment.gear.${idx}`, e.target.value)} />
                                    <button className="opacity-0 group-hover:opacity-100" onClick={() => removeListItem('equipment.gear', idx)}>
                                        <Trash2 size={12} className="text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="wealth-section glass-panel">
                        <div className="section-title flex items-center  p-4 border-b border-white/10">
                            <Coins size={18} /> 资产
                        </div>
                        <div className="wealth-grid p-4 grid grid-cols-5 ">
                            {['cp', 'sp', 'ep', 'gp', 'pp'].map(curr => (
                                <div key={curr} className="stat-mini">
                                    <span className="label font-bold uppercase">{curr}</span>
                                    <input
                                        type="number"
                                        className="w-full text-center text-xs"
                                        value={char.wealth[curr]}
                                        onChange={(e) => updateNested(`wealth.${curr}`, parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Roleplay */}
                    <div className="roleplay-section glass-panel">
                        <div className="section-title flex items-center  p-4 border-b border-white/10">
                            <User size={18} /> 角色描述
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            <div>
                                <span className="stat-label text-xs block mb-1">背景故事</span>
                                <textarea
                                    className="roleplay-textarea"
                                    value={char.roleplay.backstory}
                                    onChange={(e) => updateNested('roleplay.backstory', e.target.value)}
                                />
                            </div>
                            <div>
                                <span className="stat-label text-xs block mb-1">人格特质</span>
                                <textarea
                                    className="roleplay-textarea"
                                    value={char.roleplay.personality}
                                    onChange={(e) => updateNested('roleplay.personality', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterPanel;
