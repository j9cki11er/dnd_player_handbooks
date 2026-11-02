export function filterGear(items, { query = '', min = '', max = '' } = {}) {
    const minimum = min === '' ? 0 : Number(min);
    const maximum = max === '' ? Infinity : Number(max);
    if (!Number.isFinite(minimum) || Number.isNaN(maximum) || minimum < 0 || maximum < minimum) return [];
    const term = query.trim().toLocaleLowerCase();
    return items.filter(item => (!term || `${item.title} ${item.titleEn}`.toLocaleLowerCase().includes(term))
        && item.pricesGP.some(price => price >= minimum && price <= maximum));
}
export function gearPriceLabel(item, currency) {
    if (currency && item.pricesGP.length) {
        const prices = item.pricesGP.map(price => Number((price / gearCurrencyFactor(currency)).toFixed(2)));
        const low = Math.min(...prices), high = Math.max(...prices);
        return `${low === high ? low : `${low}–${high}`} ${currency}`;
    }
    if (!item.pricesGP.length) return item.cost;
    if (!/多类|多种/.test(item.cost)) return item.cost.replace(/(CP|SP|GP|PP|EP)/g, ' $1');
    const minimum = Math.min(...item.pricesGP), maximum = Math.max(...item.pricesGP);
    return minimum === maximum ? `${minimum} GP` : `${minimum}–${maximum} GP`;
}

export function gearCurrencyFactor(currency) { return currency === 'CP' ? 0.01 : 1; }
export function sortGear(items, sort = 'name', { min = '', max = '' } = {}) {
    const price = item => Math.min(...item.pricesGP.filter(value => value >= (min === '' ? 0 : Number(min)) && value <= (max === '' ? Infinity : Number(max))));
    return [...items].sort((a, b) => {
        const difference = sort === 'price-asc' ? price(a) - price(b) : sort === 'price-desc' ? price(b) - price(a) : 0;
        return difference || a.titleEn.localeCompare(b.titleEn);
    });
}
