import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createBookmarkQrParts, readBookmarkQrPart } from '../src/utils/bookmarkQr.js';
function scanQr(text) {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const scale = 5, border = 4, width = (qr.modules.size + border * 2) * scale;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    for (let y = 0; y < qr.modules.size; y++) for (let x = 0; x < qr.modules.size; x++) {
        if (!qr.modules.get(y, x)) continue;
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
            const offset = (((y + border) * scale + dy) * width + (x + border) * scale + dx) * 4;
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
        }
    }
    return jsQR(pixels, width, width)?.data;
}
test('generated QR image can be decoded into the original bookmark code', async () => {
    const code = btoa(encodeURIComponent(JSON.stringify({ '角色收藏': ['gear:火把', 'weapon:Dagger'] })));
    const parts = await createBookmarkQrParts(code);
    assert.equal(parts.length, 1);
    const result = await readBookmarkQrPart(scanQr(parts[0]));
    assert.equal(result.code, code);
});
test('large collections reassemble out of order and duplicate scans do not count twice', async () => {
    const code = Array.from({length: 700}, (_, index) => `${index}-${crypto.randomUUID()}`).join('');
    const parts = await createBookmarkQrParts(code);
    assert.ok(parts.length > 1);
    let result = await readBookmarkQrPart(parts.at(-1));
    result = await readBookmarkQrPart(parts.at(-1), result.state);
    assert.equal(Object.keys(result.state.parts).length, 1);
    for (const part of parts.slice(0, -1).reverse()) result = await readBookmarkQrPart(part, result.state);
    assert.equal(result.code, code);
});
test('unrelated, mixed and corrupted QR payloads are rejected', async () => {
    await assert.rejects(readBookmarkQrPart('https://example.com'));
    const [first] = await createBookmarkQrParts('first');
    const [second] = await createBookmarkQrParts('second');
    const state = (await readBookmarkQrPart(first)).state;
    await assert.rejects(readBookmarkQrPart(second, state), /另一份/);
    await assert.rejects(readBookmarkQrPart(first.slice(0,-1) + '!'), /校验/);
});
