// Metadata is extracted from HTML; list previews should never display raw tags.
export function spellText(value = '') {
    return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}
export function summarizeComponents(value) {
    const text = spellText(value || 'V、S');
    const base = text.split(/[（(]/)[0].trim().replace(/\s*[,、]\s*/g, '、');
    const prices = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(\+)?\s*GP\s*(\+)?/gi)]
        .map(([, amount, before, after]) => `${amount}${before || after ? '+' : ''} GP`);
    const summary = prices.length && /M/i.test(base)
        ? `${base}（${[...new Set(prices)].join('、')}）`
        : base;
    return { text, summary, hasDetails: summary !== text };
}

export function summarizeDuration(value) {
    const text = spellText(value || '瞬时');
    const concentration = text.includes('专注');
    const duration = text.replace(/专注|至多|最多/g, '').replace(/^[，,、\s]+|[，,、\s]+$/g, '')
        .replace(/一\s*(?=分钟|小时)/g, '1')
        .replace(/(\d+)\s*分钟/g, '$1Min')
        .replace(/(\d+)\s*(?:个\s*)?小时/g, '$1Hr')
        .replace(/(\d+)\s*(轮|日|天)/g, '$1$2');
    return concentration ? `C ${duration}`.trim() : duration;
}
