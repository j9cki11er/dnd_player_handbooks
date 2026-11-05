const key = 'handbook-text-size';
export const defaultTextSize = 100;
export const minTextSize = 85;
export const maxTextSize = 130;

export function getTextSize() {
    try {
        const size = Number(localStorage.getItem(key));
        if (size >= minTextSize && size <= maxTextSize && size % 5 === 0) return size;
    } catch {
        // The browser may block storage.
    }
    return defaultTextSize;
}

export function applyTextSize(size) {
    document.documentElement.style.setProperty('--handbook-text-size', `${size}%`);
}

export function saveTextSize(size) {
    applyTextSize(size);
    try {
        localStorage.setItem(key, String(size));
    } catch {
        // The setting still applies for the current page.
    }
}
