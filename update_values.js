const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const LOCAL_JSON_PATH = path.join(__dirname, 'adoptme_values.json');
const PETS_DIR = path.join(__dirname, 'images', 'pets');

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve();
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

function buildFullPetValues(baseVal, existing = {}) {
  const val = parseFloat(baseVal) || 0;
  const rideAdd = val > 50 ? 0.75 : (val > 10 ? 0.5 : 0.35);
  const flyAdd = val > 50 ? 1.25 : (val > 10 ? 0.8 : 0.6);

  const regular = {
    value: val,
    fly_ride: existing.regular?.fly_ride || +(val + rideAdd + flyAdd).toFixed(2),
    ride: existing.regular?.ride || +(val + rideAdd).toFixed(2),
    fly: existing.regular?.fly || +(val + flyAdd).toFixed(2),
    no_pot: existing.regular?.no_pot || val
  };

  const neonBase = +(val * 4.2).toFixed(2);
  const neon = {
    value: neonBase,
    fly_ride: existing.neon?.fly_ride || +(neonBase + (rideAdd * 2)).toFixed(2),
    ride: existing.neon?.ride || +(neonBase + rideAdd).toFixed(2),
    fly: existing.neon?.fly || +(neonBase + flyAdd).toFixed(2),
    no_pot: existing.neon?.no_pot || neonBase
  };

  const megaBase = +(val * 16.8).toFixed(2);
  const mega = {
    value: megaBase,
    fly_ride: existing.mega?.fly_ride || +(megaBase + (rideAdd * 4)).toFixed(2),
    ride: existing.mega?.ride || +(megaBase + (rideAdd * 2)).toFixed(2),
    fly: existing.mega?.fly || +(megaBase + (flyAdd * 2)).toFixed(2),
    no_pot: existing.mega?.no_pot || megaBase
  };

  return { regular, neon, mega };
}

async function run() {
  let browser;
  try {
    console.log('🔄 Читаем базовый файл adoptme_values.json...');
    let localData = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf8'));

    localData = localData.filter(i => {
      const n = (i.name || '').toLowerCase();
      return !n.includes('playwire') && !n.includes('audience') && !n.includes('menu') && !n.includes('close');
    });

    if (!fs.existsSync(PETS_DIR)) {
      fs.mkdirSync(PETS_DIR, { recursive: true });
    }

    console.log('🚀 Запускаем Chromium...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('🌐 Переходим на страницу калькулятора Elvebredd...');
    await page.goto('https://elvebredd.com/adopt-me-calculator', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('🖱️ Открываем каталог питомцев...');
    await page.evaluate(() => {
      const clickables = Array.from(document.querySelectorAll('button, div[role="button"], [class*="slot"], [class*="add"]'));
      const target = clickables.find(el => {
        const txt = el.innerText || '';
        return txt.includes('+') || txt.toLowerCase().includes('add') || el.className.includes('slot');
      });
      if (target) target.click();
    });

    await new Promise(r => setTimeout(r, 4000));

    console.log('📜 Запускаем накопительный сбор со всех страниц каталога...');
    const allFoundMap = new Map();

    // 80 итераций прокрутки с чтением на каждом шаге
    for (let step = 1; step <= 80; step++) {
      const batch = await page.evaluate(() => {
        const items = [];
        const cards = document.querySelectorAll('[class*="item"], [class*="card"], [class*="pet"]');

        cards.forEach(c => {
          const img = c.querySelector('img');
          const textNodes = Array.from(c.querySelectorAll('p, span, h3, h4, div'))
            .map(el => el.innerText ? el.innerText.trim() : '')
            .filter(t => t.length > 0);

          if (img && textNodes.length >= 2) {
            const name = textNodes[0];
            const valStr = textNodes.find(t => /^[\d,]+(\.\d+)?$/.test(t.replace(/[^0-9.]/g, '')));
            const val = valStr ? parseFloat(valStr.replace(/,/g, '')) : 0;

            const lower = name.toLowerCase();
            if (
              val > 0 &&
              !lower.includes('close') &&
              !lower.includes('menu') &&
              !lower.includes('playwire') &&
              !lower.includes('filter') &&
              !lower.includes('search') &&
              !lower.includes('ad')
            ) {
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

      for (const item of batch) {
        const key = item.name.trim().toLowerCase();
        if (!allFoundMap.has(key)) {
          allFoundMap.set(key, item);
        }
      }

      // Прокручиваем модалку дальше вниз
      await page.evaluate(() => {
        const modal = document.querySelector('[class*="modal"], [class*="popup"], [class*="dialog"]') || window;
        if (modal.scrollBy) {
          modal.scrollBy(0, 1000);
        } else {
          window.scrollBy(0, 1000);
        }
      });

      if (step % 10 === 0) {
        console.log(`⏳ Шаг ${step}/80: в памяти накоплено ${allFoundMap.size} уникальных карточек...`);
      }

      await new Promise(r => setTimeout(r, 400));
    }

    await browser.close();

    console.log(`\n🎯 Итого собрано уникальных карточек: ${allFoundMap.size}`);

    const localMap = new Map();
    localData.forEach(item => {
      if (item.name) localMap.set(item.name.trim().toLowerCase(), item);
    });

    let updatedCount = 0;
    let newCount = 0;
    let maxId = localData.reduce((max, item) => Math.max(max, item.id || 0), 0);

    for (const [key, scraped] of allFoundMap) {
      if (localMap.has(key)) {
        const existing = localMap.get(key);
        const bundle = buildFullPetValues(scraped.value, existing);
        existing.regular = bundle.regular;
        existing.neon = bundle.neon;
        existing.mega = bundle.mega;
        updatedCount++;
      } else {
        maxId++;
        const safeName = scraped.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}.png`;
        const localImagePath = path.join(PETS_DIR, fileName);

        if (scraped.imgUrl && scraped.imgUrl.startsWith('http')) {
          await downloadImage(scraped.imgUrl, localImagePath);
        }

        const bundle = buildFullPetValues(scraped.value);

        const newItem = {
          name: scraped.name,
          type: 'pets',
          rarity: 'legendary',
          image: `/images/pets/${fileName}`,
          id: maxId,
          regular: bundle.regular,
          neon: bundle.neon,
          mega: bundle.mega
        };

        localData.push(newItem);
        localMap.set(key, newItem);
        newCount++;
        console.log(`✨ Добавлен новый питомец: ${scraped.name}`);
      }
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Обновлено: ${updatedCount}, Добавлено новых: ${newCount}, Всего в базе: ${localData.length}`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
