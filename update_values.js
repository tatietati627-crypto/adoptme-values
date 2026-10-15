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

    console.log('🚀 Запускаем Chromium с маскировкой под реального пользователя...');
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('🌐 Переходим на страницу Elvebredd...');
    // Открываем сам сайт, чтобы получить валидные cookies и пройти Cloudflare
    await page.goto('https://elvebredd.com', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Ожидаем завершения проверок защиты...');
    await new Promise(r => setTimeout(r, 6000));

    console.log('📡 Извлекаем данные о питомцах...');
    // Забираем данные прямо через контекст страницы в браузере
    const remoteData = await page.evaluate(async () => {
      try {
        const res = await fetch('https://elvebredd.com/api/values');
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    });

    await browser.close();

    if (!remoteData || !Array.isArray(remoteData)) {
      throw new Error('Не удалось получить массив данных через браузер. Возможно, изменился внутренний маршрут API.');
    }

    console.log(`✅ Получено предметов с сайта: ${remoteData.length}`);

    const localMap = new Map();
    localData.forEach(item => {
      if (item.name) localMap.set(item.name.trim().toLowerCase(), item);
    });

    let maxId = localData.reduce((max, item) => Math.max(max, item.id || 0), 0);
    let updatedCount = 0;
    let newCount = 0;

    for (const remote of remoteData) {
      if (!remote.name) continue;
      const key = remote.name.trim().toLowerCase();

      if (localMap.has(key)) {
        const existing = localMap.get(key);
        if (remote.regular) existing.regular = { ...existing.regular, ...remote.regular };
        if (remote.neon) existing.neon = { ...existing.neon, ...remote.neon };
        if (remote.mega) existing.mega = { ...existing.mega, ...remote.mega };
        updatedCount++;
      } else {
        maxId++;
        const safeName = remote.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}.png`;
        const localImagePath = path.join(PETS_DIR, fileName);

        if (remote.imageUrl) {
          try {
            console.log(`📥 Скачиваем картинку для: ${remote.name}`);
            await downloadImage(remote.imageUrl, localImagePath);
          } catch (e) {
            console.warn(`Не удалось скачать картинку для ${remote.name}:`, e.message);
          }
        }

        const newItem = {
          name: remote.name,
          type: remote.type || 'pets',
          rarity: (remote.rarity || 'common').toLowerCase(),
          image: `/images/pets/${fileName}`,
          id: maxId,
          regular: remote.regular || { value: 0 },
          neon: remote.neon || { value: 0 },
          mega: remote.mega || { value: 0 }
        };

        localData.push(newItem);
        localMap.set(key, newItem);
        newCount++;
        console.log(`✨ Добавлен новый питомец: ${remote.name}`);
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
