import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, 'data-source');
const OUTPUT_FILE = path.join(__dirname, 'src/data.json');
const PUBLIC_CONTENT_DIR = path.join(__dirname, 'public/content');

// Helper to ensure directory exists
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, callback);
        } else if (file.endsWith('.htm') || file.endsWith('.html')) {
            callback(fullPath);
        }
    });
}

function parseFiles() {
    console.log('Searching for files in:', SOURCE_DIR);
    ensureDir(PUBLIC_CONTENT_DIR);
    const results = [];

    walkDir(SOURCE_DIR, (fullPath) => {
        try {
            const relativePath = path.relative(SOURCE_DIR, fullPath);
            const buffer = fs.readFileSync(fullPath);

            // Detect encoding
            let encoding = 'utf8';

            // 1. Check for UTF-8 BOM
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                encoding = 'utf8';
            } else {
                // 2. Check for meta charset or comment
                const head = buffer.slice(0, 1024).toString('ascii').toLowerCase();
                if (head.includes('charset=gb2312') || head.includes('charset=gbk') || head.includes('coding: gbk')) {
                    encoding = 'gbk';
                } else if (head.includes('charset=utf-8')) {
                    encoding = 'utf8';
                } else {
                    // 3. Heuristic: try to decode as UTF-8, if it fails or contains invalid chars, fallback to GBK
                    try {
                        const utf8String = buffer.toString('utf8');
                        // Basic check for common replacement characters if it was actually GBK
                        if (utf8String.includes('\ufffd')) {
                            encoding = 'gbk';
                        } else {
                            encoding = 'utf8';
                        }
                    } catch (e) {
                        encoding = 'gbk';
                    }
                }
            }

            const html = iconv.decode(buffer, encoding);

            const root = parse(html);
            const titleElement = root.querySelector('title');
            const title = titleElement ? titleElement.innerText.trim() : path.basename(fullPath, path.extname(fullPath));

            let body = root.querySelector('body');
            let content = '';

            if (body) {
                body.querySelectorAll('script').forEach(s => s.remove());
                body.querySelectorAll('style').forEach(s => s.remove());
                content = body.innerHTML.trim();
            }

            // Fallback if body is empty or not found
            if (!content) {
                const tempRoot = parse(html);
                tempRoot.querySelectorAll('head').forEach(h => h.remove());
                tempRoot.querySelectorAll('script').forEach(s => s.remove());
                tempRoot.querySelectorAll('style').forEach(s => s.remove());
                tempRoot.querySelectorAll('title').forEach(t => t.remove());
                content = tempRoot.innerHTML.trim();
            }

            const parts = relativePath.split(path.sep);
            const category = parts[0];
            const filename = path.basename(relativePath);

            // Save content to public folder
            const contentRelativePath = relativePath.replace(/\.htm$/, '.html');
            const contentOutputPath = path.join(PUBLIC_CONTENT_DIR, contentRelativePath);
            ensureDir(path.dirname(contentOutputPath));
            fs.writeFileSync(contentOutputPath, content);

            // directory path excluding the filename
            const parentDir = path.dirname(relativePath);
            const pathParts = parentDir === '.' ? [category] : relativePath.split(path.sep).slice(0, -1);

            // isOverview if it's named _概述.htm or if it's named exactly like its parent directory
            const parentName = pathParts[pathParts.length - 1];
            const isOverview = filename === '_概述.htm' ||
                filename.toLocaleLowerCase() === parentName.toLocaleLowerCase() + '.htm' ||
                filename.toLocaleLowerCase() === parentName.toLocaleLowerCase() + '.html';

            results.push({
                id: relativePath,
                title,
                category,
                path: contentRelativePath, // Use the new .html path
                pathParts,
                isOverview,
                // content: content, // REMOVED to lightweight JSON
            });
        } catch (err) {
            console.error(`Error parsing ${fullPath}:`, err.message);
        }
    });

    // Load and parse directory.txt for ordering
    const DIRECTORY_FILE = path.join(__dirname, 'directory.txt');
    const titleOrderMap = new Map();
    const normalize = (s) => s ? s.replace(/\s+/g, '').toLocaleLowerCase() : '';

    try {
        if (fs.existsSync(DIRECTORY_FILE)) {
            const dirLines = fs.readFileSync(DIRECTORY_FILE, 'utf8').split('\n');
            let currentIndex = 0;
            dirLines.forEach(line => {
                if (!line.trim()) return;

                // Match "- Title" but allow for leading spaces
                const match = line.match(/^(\s*)-\s+(.+)$/);
                if (match) {
                    const titleText = match[2].trim();
                    const normalizedTitle = normalize(titleText);
                    if (normalizedTitle && !titleOrderMap.has(normalizedTitle)) {
                        titleOrderMap.set(normalizedTitle, currentIndex++);
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error reading directory.txt:', err.message);
    }

    const getOrder = (title) => {
        const norm = normalize(title);
        return titleOrderMap.has(norm) ? titleOrderMap.get(norm) : 999999;
    };

    results.sort((a, b) => {
        // 1. Compare by pathParts hierarchy first to keep folders together
        const maxLen = Math.max(a.pathParts.length, b.pathParts.length);
        for (let i = 0; i < maxLen; i++) {
            const partA = a.pathParts[i];
            const partB = b.pathParts[i];

            if (partA && !partB) return 1; // b is shorter (parent of a)
            if (!partA && partB) return -1; // a is shorter (parent of b)
            if (partA !== partB) {
                // Different folders at this level, compare their directory.txt order
                const orderA = getOrder(partA);
                const orderB = getOrder(partB);
                if (orderA !== orderB) return orderA - orderB;
                return partA.localeCompare(partB);
            }
        }

        // 2. Within the same folder, prioritize overview
        if (a.isOverview && !b.isOverview) return -1;
        if (!a.isOverview && b.isOverview) return 1;

        // 3. Then sort by their own title's order in directory.txt
        const orderA = getOrder(a.title);
        const orderB = getOrder(b.title);
        if (orderA !== orderB) return orderA - orderB;

        // 4. Default to title alphabetical
        return a.title.localeCompare(b.title);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Parsed ${results.length} files into ${OUTPUT_FILE}`);
}

parseFiles();
