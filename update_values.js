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
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
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

    console.log('🚀 Запускаем Chromium с маскировкой...');
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('🌐 Переходим на страницу калькулятора Elvebredd...');
    await page.goto('https://elvebredd.com/adopt-me-calculator', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Ожидаем прогрузки элементов...');
    await new Promise(r => setTimeout(r, 6000));

    // Пробуем извлечь данные: сначала из встроенного состояния React/Next.js, либо из DOM
    console.log('📡 Считываем данные со страницы...');
    const remoteData = await page.evaluate(() => {
      // Способ 1: Next.js script data (если есть)
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const json = JSON.parse(nextDataEl.innerText);
          const pageProps = json?.props?.pageProps;
          if (pageProps?.pets) return pageProps.pets;
          if (pageProps?.values) return pageProps.values;
        } catch (e) {}
      }

      // Способ 2: парсинг DOM-карточек калькулятора
      const items = [];
      const cards = document.querySelectorAll('[class*="pet-card"], [class*="item-card"], .card, div[data-name]');
      
      cards.forEach(card => {
        const nameEl = card.querySelector('h3, h4, [class*="name"], .title');
        const valEl = card.querySelector('[class*="value"], [class*="val"]');
        const imgEl = card.querySelector('img');

        const name = nameEl ? nameEl.innerText.trim() : card.getAttribute('data-name');
        const valText = valEl ? valEl.innerText.replace(/[^0-9.]/g, '') : '0';
        const val = parseFloat(valText) || 0;
        const imgUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

        if (name && val > 0) {
          items.push({
            name: name,
            regular: { value: val },
            imageUrl: imgUrl
          });
        }
      });

      return items;
    });

    await browser.close();

    console.log(`Найдено элементов на странице: ${remoteData ? remoteData.length : 0}`);

    if (!remoteData || remoteData.length === 0) {
      console.warn('⚠️ Данные на странице калькулятора не найдены. Пропускаем перезапись файла.');
      return;
    }

    const localMap = new Map();
    localData.forEach(item => {
      if (item.name) localMap.set(item.name.trim().toLowerCase(), item);
    });

    let updatedCount = 0;
    let newCount = 0;
    let maxId = localData.reduce((max, item) => Math.max(max, item.id || 0), 0);

    for (const remote of remoteData) {
      if (!remote.name) continue;
      const key = remote.name.trim().toLowerCase();

      if (localMap.has(key)) {
        const existing = localMap.get(key);
        if (remote.regular?.value) {
          existing.regular.value = remote.regular.value;
          updatedCount++;
        }
      } else {
        maxId++;
        const safeName = remote.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}.png`;
        const localImagePath = path.join(PETS_DIR, fileName);

        if (remote.imageUrl && remote.imageUrl.startsWith('http')) {
          try {
            await downloadImage(remote.imageUrl, localImagePath);
          } catch (e) {
            console.warn(`Не удалось скачать картинку для ${remote.name}`);
          }
        }

        const newItem = {
          name: remote.name,
          type: 'pets',
          rarity: 'common',
          image: `/images/pets/${fileName}`,
          id: maxId,
          regular: remote.regular || { value: 0 },
          neon: { value: 0 },
          mega: { value: 0 }
        };

        localData.push(newItem);
        localMap.set(key, newItem);
        newCount++;
      }
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`\n🎉 Готово! Обновлено: ${updatedCount}, Новых: ${newCount}`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
