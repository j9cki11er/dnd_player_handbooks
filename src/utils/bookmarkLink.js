export function createBookmarkLink(code, base) {
    const url = new URL(base);
    url.searchParams.delete('bookmarks');
    url.hash = new URLSearchParams({ bookmarks: code }).toString();
    return url.href;
}
export function bookmarkCodeFromInput(value) {
    const input = value.trim();
    if (!/^https?:\/\//i.test(input)) return input;
    const url = new URL(input);
    const code = new URLSearchParams(url.hash.slice(1)).get('bookmarks') || url.searchParams.get('bookmarks');
    if (!code) throw new Error('链接中没有收藏资料');
    return code;
}
