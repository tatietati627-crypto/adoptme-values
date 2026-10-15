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

    console.log('🚀 Запускаем Chromium с перехватом сетевого трафика...');
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

    let capturedData = null;

    // Перехватываем все фоновые JSON-ответы, которые скачивает сайт
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('application/json')) {
        try {
          const json = await response.json();
          // Проверяем, содержит ли этот JSON список питомцев или значений
          if (Array.isArray(json) && json.some(item => item && (item.name || item.item_name || item.regular))) {
            console.log(`🎯 Перехвачен массив с данными: ${url} (${json.length} элементов)`);
            capturedData = json;
          } else if (json && typeof json === 'object') {
            for (const key of ['pets', 'items', 'values', 'data']) {
              if (Array.isArray(json[key]) && json[key].some(i => i && (i.name || i.item_name))) {
                console.log(`🎯 Перехвачен объект данных с ключом "${key}": ${url} (${json[key].length} элементов)`);
                capturedData = json[key];
                break;
              }
            }
          }
        } catch (e) {
          // Игнорируем ответы, не относящиеся к JSON
        }
      }
    });

    console.log('🌐 Открываем Elvebredd...');
    await page.goto('https://elvebredd.com', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Делаем клик и скролл, чтобы инициировать фоновую подгрузку данных
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 6000));

    // Если на главной не нашли, заходим в раздел калькулятора
    if (!capturedData) {
      console.log('🌐 Переходим в раздел калькулятора...');
      try {
        await page.goto('https://elvebredd.com/adopt-me-calculator', {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 6000));
      } catch (e) {
        console.log('Калькулятор не загрузился:', e.message);
      }
    }

    await browser.close();

    if (!capturedData || capturedData.length === 0) {
      console.warn('⚠️ Фоновые данные с ценами не были пойманы. Пропускаем перезапись файла.');
      return;
    }

    console.log(`📊 Обрабатываем ${capturedData.length} записей...`);

    const localMap = new Map();
    localData.forEach(item => {
      if (item.name) localMap.set(item.name.trim().toLowerCase(), item);
    });

    let maxId = localData.reduce((max, item) => Math.max(max, item.id || 0), 0);
    let updatedCount = 0;
    let newCount = 0;

    for (const remote of capturedData) {
      const name = remote.name || remote.item_name;
      if (!name) continue;
      const key = name.trim().toLowerCase();

      // Определяем значение регулярной цены
      let regularVal = 0;
      if (typeof remote.regular === 'object') {
        regularVal = remote.regular.value || remote.regular.fly_ride || 0;
      } else if (typeof remote.value === 'number') {
        regularVal = remote.value;
      }

      if (localMap.has(key)) {
        const existing = localMap.get(key);
        if (regularVal > 0) {
          if (!existing.regular) existing.regular = {};
          existing.regular.value = regularVal;
          updatedCount++;
        }
      } else {
        maxId++;
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}.png`;
        const localImagePath = path.join(PETS_DIR, fileName);

        const imgUrl = remote.imageUrl || remote.image;
        if (imgUrl && imgUrl.startsWith('http')) {
          try {
            await downloadImage(imgUrl, localImagePath);
          } catch (e) {
            console.warn(`Не удалось скачать картинку для ${name}`);
          }
        }

        const newItem = {
          name: name,
          type: remote.type || 'pets',
          rarity: (remote.rarity || 'common').toLowerCase(),
          image: `/images/pets/${fileName}`,
          id: maxId,
          regular: { value: regularVal },
          neon: { value: 0 },
          mega: { value: 0 }
        };

        localData.push(newItem);
        localMap.set(key, newItem);
        newCount++;
        console.log(`✨ Добавлен новый питомец: ${name}`);
      }
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`\n🎉 Готово! Обновлено: ${updatedCount}, Добавлено: ${newCount}`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
