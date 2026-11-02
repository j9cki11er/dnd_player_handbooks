import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createBookmarkQrParts, readBookmarkQrPart } from '../utils/bookmarkQr';

export default function BookmarkQr({ exportData, onImportCode }) {
    const [parts, setParts] = useState([]), [page, setPage] = useState(0), [url, setUrl] = useState('');
    const [message, setMessage] = useState(''), [error, setError] = useState('');
    const scan = useRef(null), busy = useRef(false);
    useEffect(() => {
        let alive = true;
        setParts([]); setPage(0); setUrl('');
        createBookmarkQrParts(exportData).then(result => { if (alive) setParts(result); }).catch(() => { if (alive) setError('二维码生成失败，请使用分享代码。'); });
        return () => { alive = false; };
    }, [exportData]);
    useEffect(() => {
        let alive = true;
        setUrl('');
        if (parts[page]) QRCode.toDataURL(parts[page], { width: 640, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then(result => { if (alive) setUrl(result); }).catch(() => { if (alive) setError('二维码生成失败，请使用分享代码。'); });
        return () => { alive = false; };
    }, [parts, page]);
    const readImage = async event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file || busy.current) return;
        busy.current = true; setError('');
        let objectUrl;
        try {
            objectUrl = URL.createObjectURL(file);
            const image = new Image(); image.src = objectUrl;
            await image.decode();
            const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
            const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const data = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
            if (!result) throw new Error('未识别到二维码，请选择清晰、完整的二维码图片。');
            const decoded = await readBookmarkQrPart(result.data, scan.current);
            scan.current = decoded.state;
            setMessage(decoded.code ? '二维码已读取，请检查下方代码并点击「确认导入」。' : `已读取 ${Object.keys(decoded.state.parts).length} / ${decoded.state.total} 张，请继续读取其余二维码。`);
            if (decoded.code) onImportCode(decoded.code);
        } catch (err) { setError(err.message || '读取失败，请更换图片重试。'); }
        finally { if (objectUrl) URL.revokeObjectURL(objectUrl); busy.current = false; }
    };
    return <section className="bookmark-qr" aria-label="二维码分享与导入">
        <h4>二维码分享</h4><p>二维码在本机生成。收藏较多时分成多张，接收方需读完全部二维码。</p>
        {url ? <img src={url} alt={`收藏分享二维码，第 ${page + 1} 张，共 ${parts.length} 张`} className="bookmark-qr-image" /> : <p role="status">正在生成二维码…</p>}
        {parts.length > 1 && <div className="qr-actions"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>上一张</button><span>{page + 1} / {parts.length}</span><button type="button" disabled={page === parts.length - 1} onClick={() => setPage(page + 1)}>下一张</button></div>}
        {url && <a className="qr-download" href={url} download={`dnd-bookmarks-${page + 1}-of-${parts.length}.png`}>保存这张二维码</a>}
        <h4>二维码导入</h4><div className="qr-actions"><label>选择二维码图片<input type="file" accept="image/*" onChange={readImage} /></label><label>拍摄二维码<input type="file" accept="image/*" capture="environment" onChange={readImage} /></label><button type="button" onClick={() => { scan.current = null; setMessage(''); setError(''); onImportCode(''); }}>重置扫描</button></div>
        <p>可选择相册图片或拍照识别；读取后仍需确认导入，不覆盖现有收藏。</p>{message && <p role="status">{message}</p>}{error && <p role="alert" className="qr-error">{error}</p>}
    </section>;
}
