const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const LOCAL_JSON_PATH = path.join(__dirname, 'adoptme_values.json');
const PETS_DIR = path.join(__dirname, 'images', 'pets');

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return resolve();
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', () => resolve());
  });
}

async function run() {
  let browser;
  try {
    console.log('🔄 Читаем adoptme_values.json...');
    const localData = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf8'));

    if (!fs.existsSync(PETS_DIR)) {
      fs.mkdirSync(PETS_DIR, { recursive: true });
    }

    console.log('🚀 Запускаем Chromium с эмуляцией кликов...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });

    console.log('🌐 Открываем калькулятор Elvebredd...');
    await page.goto('https://elvebredd.com/adopt-me-calculator', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Ожидаем полную загрузку приложения...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('🖱️ Кликаем на выбор питомца для открытия каталога...');
    // Ищем кнопку добавления питомца (+) или слот на странице
    await page.evaluate(() => {
      const clickables = Array.from(document.querySelectorAll('button, div[role="button"], [class*="slot"], [class*="add"]'));
      const target = clickables.find(el => {
        const txt = el.innerText || '';
        return txt.includes('+') || txt.toLowerCase().includes('add') || el.className.includes('slot');
      });
      if (target) target.click();
    });

    await new Promise(r => setTimeout(r, 4000));

    console.log('📥 Сканируем карточки предметов в каталоге...');
    const scrapedItems = await page.evaluate(() => {
      const items = [];
      // Находим все карточки питомцев в открывшемся каталоге
      const cards = document.querySelectorAll('[class*="item"], [class*="card"], [class*="pet"]');

      cards.forEach(c => {
        const img = c.querySelector('img');
        const textNodes = Array.from(c.querySelectorAll('p, span, h3, h4, div'))
          .map(el => el.innerText ? el.innerText.trim() : '')
          .filter(t => t.length > 0);

        if (img && textNodes.length >= 2) {
          const name = textNodes[0];
          // Ищем числовые значения (ценность)
          const valStr = textNodes.find(t => /^[\d,]+(\.\d+)?$/.test(t.replace(/[^0-9.]/g, '')));
          const val = valStr ? parseFloat(valStr.replace(/,/g, '')) : 0;

          if (name && val > 0 && !name.toLowerCase().includes('playwire') && !name.toLowerCase().includes('ad')) {
            items.push({
              name: name,
              value: val,
              imgUrl: img.src
            });
          }
        }
      });

      return items;
    });

    await browser.close();

    console.log(`Найдено активных карточек: ${scrapedItems.length}`);

    if (scrapedItems.length === 0) {
      console.log('⚠️ Карточки пока не прогрузились в DOM. Сохраняем текущую базу без изменений.');
      return;
    }

    const localMap = new Map();
    localData.forEach(item => {
      if (item.name) localMap.set(item.name.trim().toLowerCase(), item);
    });

    let updatedCount = 0;
    let newCount = 0;
    let maxId = localData.reduce((max, item) => Math.max(max, item.id || 0), 0);

    for (const scraped of scrapedItems) {
      const key = scraped.name.trim().toLowerCase();

      if (localMap.has(key)) {
        const existing = localMap.get(key);
        if (existing.regular) {
          existing.regular.value = scraped.value;
          updatedCount++;
        }
      } else {
        maxId++;
        const safeName = scraped.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}.png`;
        const localImagePath = path.join(PETS_DIR, fileName);

        if (scraped.imgUrl && scraped.imgUrl.startsWith('http')) {
          await downloadImage(scraped.imgUrl, localImagePath);
        }

        const newItem = {
          name: scraped.name,
          type: 'pets',
          rarity: 'common',
          image: `/images/pets/${fileName}`,
          id: maxId,
          regular: { value: scraped.value },
          neon: { value: 0 },
          mega: { value: 0 }
        };

        localData.push(newItem);
        localMap.set(key, newItem);
        newCount++;
        console.log(`✨ Добавлен новый питомец: ${scraped.name} (Value: ${scraped.value})`);
      }
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`\n🎉 Финал: обновлено ${updatedCount}, добавлено новых ${newCount}!`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
