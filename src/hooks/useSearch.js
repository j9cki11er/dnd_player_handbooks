import { useMemo } from 'react';
import Fuse from 'fuse.js';

export function useSearch({ data, spellData, featData, masteryData, searchQuery }) {
    const fuse = useMemo(() => new Fuse(data, {
        keys: ['title', 'category', 'pathParts'],
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

    const searchResults = useMemo(() => {
        if (!searchQuery) return { categories: [], spells: [], feats: [], masteries: [] };
        return {
            categories: fuse.search(searchQuery).map(r => r.item),
            spells: spellFuse.search(searchQuery).map(r => r.item),
            feats: featFuse.search(searchQuery).map(r => r.item),
            masteries: masteryFuse.search(searchQuery).map(r => r.item)
        };
    }, [searchQuery, fuse, spellFuse, featFuse, masteryFuse]);

    return { searchResults };
}
