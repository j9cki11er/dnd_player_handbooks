const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const { globSync } = require('glob');

const SOURCE_DIR = path.join(__dirname, 'data-source');
const OUTPUT_FILE = path.join(__dirname, 'src/data.json');

function parseFiles() {
  const files = globSync('**/*.htm', { cwd: SOURCE_DIR });
  const results = [];

  files.forEach(file => {
    const fullPath = path.join(SOURCE_DIR, file);
    const buffer = fs.readFileSync(fullPath);
    const html = iconv.decode(buffer, 'GBK');
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || path.basename(file, '.htm');
    const content = $('body').html();
    
    // Clean up content: fix relative links, remove scripts if any
    const cleanContent = content ? content.trim() : '';

    // Determine category and subcategory
    const parts = file.split(path.sep);
    let category = '其他';
    let subcategory = null;

    if (parts.length > 1) {
      category = parts[0];
      if (parts.length > 2) {
        subcategory = parts[1];
      }
    }

    results.push({
      id: file,
      title,
      category,
      subcategory,
      content: cleanContent,
      path: file
    });
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Parsed ${results.length} files into ${OUTPUT_FILE}`);
}

parseFiles();
