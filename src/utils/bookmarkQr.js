import { bookmarkCodeFromInput } from './bookmarkLink.js';
const bytesToBase64 = bytes => {
    let value = '';
    for (const byte of bytes) value += String.fromCharCode(byte);
    return btoa(value);
};
const base64ToBytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function fingerprint(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function createBookmarkQrParts(code) {
    let packed = `raw:${code}`;
    if (typeof CompressionStream !== 'undefined') {
        const stream = new Blob([code]).stream().pipeThrough(new CompressionStream('gzip'));
        packed = `gz:${bytesToBase64(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
    }
    const size = 1000, total = Math.ceil(packed.length / size), id = await fingerprint(packed);
    return Array.from({ length: total }, (_, index) => `DNDQR1:${id}:${index + 1}:${total}:${packed.slice(index * size, (index + 1) * size)}`);
}
export async function readBookmarkQrPart(value, current = null) {
    if (/^https?:\/\//i.test(value)) return { state: null, code: bookmarkCodeFromInput(value) };
    const match = value.match(/^DNDQR1:([a-f0-9]{16}):(\d+):(\d+):([\s\S]+)$/);
    if (!match) throw new Error('这不是有效的收藏二维码。');
    const [, id, indexText, totalText, payload] = match;
    const index = Number(indexText), total = Number(totalText);
    if (total < 1 || total > 1000 || index < 1 || index > total || payload.length > 1100) throw new Error('二维码分段无效。');
    if (current && current.id !== id) throw new Error('这张二维码属于另一份分享，请先重置扫描。');
    if (current && current.total !== total) throw new Error('二维码分段数量不一致。');
    const state = { id, total, parts: { ...current?.parts, [index]: payload } };
    if (Object.keys(state.parts).length !== total) return { state, code: null };
    const packed = Array.from({ length: total }, (_, i) => state.parts[i + 1]).join('');
    if (await fingerprint(packed) !== id) throw new Error('二维码数据校验失败，请重新扫描。');
    let code;
    if (packed.startsWith('raw:')) code = packed.slice(4);
    else if (packed.startsWith('gz:')) {
        if (typeof DecompressionStream === 'undefined') throw new Error('浏览器不支持解压二维码，请改用分享代码导入。');
        const stream = new Blob([base64ToBytes(packed.slice(3))]).stream().pipeThrough(new DecompressionStream('gzip'));
        code = await new Response(stream).text();
    } else throw new Error('不支持的二维码格式。');
    return { state, code };
}
