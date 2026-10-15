const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

// Скачивание прозрачных PNG
function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);

    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) return resolve(false);

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
    }).on('error', () => resolve(false));
  });
}

// Список страниц Supreme Values со всеми Godly
const TARGET_SECTIONS = [
  { url: 'https://supremevaluelist.com/godlies', defaultCategory: 'godly' },
  { url: 'https://supremevaluelist.com/ancients', defaultCategory: 'ancient' },
  { url: 'https://supremevaluelist.com/vintages', defaultCategory: 'vintage' },
  { url: 'https://supremevaluelist.com/chromas', defaultCategory: 'chroma' }
];

async function run() {
  let browser;
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    console.log('🚀 Запуск Chromium для полного сбора всех Godly предметов...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const allGodlyMap = new Map();

    for (const section of TARGET_SECTIONS) {
      console.log(`🌐 Переход в категорию: ${section.url}...`);
      try {
        await page.goto(section.url, { waitUntil: 'networkidle2', timeout: 45000 });
      } catch (e) {
        console.log(`Не удалось открыть напрямую ${section.url}, пробуем главную...`);
        await page.goto('https://supremevaluelist.com/', { waitUntil: 'networkidle2', timeout: 45000 });
      }

      await new Promise(r => setTimeout(r, 4000));

      // Прокрутка для подгрузки всех карточек категории
      await page.evaluate(async () => {
        for (let i = 0; i < 25; i++) {
          window.scrollBy(0, 1000);
          await new Promise(res => setTimeout(res, 150));
        }
      });

      const extracted = await page.evaluate((categoryName) => {
        const items = [];
        const cards = document.querySelectorAll('div[class*="item"], div[class*="card"], div[class*="weapon"], tr, [role="row"]');

        cards.forEach(card => {
          const img = card.querySelector('img');
          const texts = Array.from(card.querySelectorAll('p, span, h3, h4, td, div'))
            .map(el => el.innerText ? el.innerText.trim() : '')
            .filter(t => t.length > 0);

          if (img && texts.length >= 2) {
            const name = texts[0];
            const valStr = texts.find(t => /^[\d,]+(\.\d+)?$/.test(t.replace(/[^0-9.]/g, '')));
            const val = valStr ? parseFloat(valStr.replace(/,/g, '')) : 0;

            const lower = name.toLowerCase();
            if (
              val > 0 &&
              !lower.includes('menu') &&
              !lower.includes('close') &&
              !lower.includes('ad') &&
              !lower.includes('search') &&
              !lower.includes('filter')
            ) {
              items.push({
                name: name,
                value: val,
                imageUrl: img.src,
                category: categoryName
              });
            }
          }
        });
        return items;
      }, section.defaultCategory);

      for (const item of extracted) {
        const key = item.name.trim().toLowerCase();
        if (!allGodlyMap.has(key)) {
          allGodlyMap.set(key, item);
        }
      }
      console.log(`Накоплено уникальных предметов: ${allGodlyMap.size}`);
    }

    await browser.close();

    console.log(`\n🎯 Всего найдено Godly/Ancient предметов: ${allGodlyMap.size}`);

    const resultList = [];
    let idCounter = 1;

    for (const [key, item] of allGodlyMap) {
      const safeFileName = item.name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      const localImagePath = path.join(WEAPONS_DIR, safeFileName);

      // Скачиваем прозрачный PNG
      if (item.imageUrl && item.imageUrl.startsWith('http')) {
        await downloadImage(item.imageUrl, localImagePath);
      }

      const lower = item.name.toLowerCase();
      let type = 'knife';
      if (lower.includes('gun') || lower.includes('blaster') || lower.includes('revolver') || lower.includes('luger') || lower.includes('harvester') || lower.includes('shark') || lower.includes('laser')) {
        type = 'gun';
      }

      resultList.push({
        id: idCounter++,
        name: item.name,
        rarity: item.category.toUpperCase(), // GODLY, ANCIENT, CHROMA, VINTAGE
        type: type,
        value: item.value,
        image: `/images/weapons/${safeFileName}`
      });

      console.log(`🗡️ [${item.category.toUpperCase()}] ${item.name} | Value: ${item.value}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(resultList, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Сохранено ${resultList.length} Godly предметов в mm2_values.json`);
    console.log(`📁 Иконки скачаны в images/weapons/`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
