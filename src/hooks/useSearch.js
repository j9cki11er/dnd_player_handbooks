import { useMemo } from 'react';
import Fuse from 'fuse.js';

export function useSearch({ data, spellData, featData, masteryData, invocationData, searchQuery }) {
    const fuse = useMemo(() => new Fuse(data.filter(item => !item.hiddenFromDirectory), {
        keys: ['title', 'titleEn', 'category', 'pathParts', 'rarity', 'itemType'],
        threshold: 0.3
    }), [data]);

    const spellFuse = useMemo(() => new Fuse(spellData, {
        keys: ['title', 'titleEn'],
        threshold: 0.3
    }), [spellData]);

    const featFuse = useMemo(() => new Fuse(featData, {
        keys: ['title', 'titleEn', 'category'],
        threshold: 0.3
    }), [featData]);

    const masteryFuse = useMemo(() => new Fuse(masteryData, {
        keys: ['title', 'titleEn', 'category'],
        threshold: 0.3
    }), [masteryData]);

    const invocationFuse = useMemo(() => new Fuse(invocationData, {
        keys: ['title', 'titleEn', 'category'],
        threshold: 0.3
    }), [invocationData]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return { categories: [], spells: [], feats: [], masteries: [], invocations: [] };
        return {
            categories: fuse.search(searchQuery).map(r => r.item),
            spells: spellFuse.search(searchQuery).map(r => r.item),
            feats: featFuse.search(searchQuery).map(r => r.item),
            masteries: masteryFuse.search(searchQuery).map(r => r.item),
            invocations: invocationFuse.search(searchQuery).map(r => r.item)
        };
    }, [searchQuery, fuse, spellFuse, featFuse, masteryFuse, invocationFuse]);

    return { searchResults };
}
