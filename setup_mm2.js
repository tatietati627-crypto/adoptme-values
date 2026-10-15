const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);

    https.get(url, (res) => {
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

function fetchPage(category, offset = 0) {
  return new Promise((resolve, reject) => {
    const url = `https://api.rblxvalue.com/v2/items?category=${encodeURIComponent(category)}&limit=100&offset=${offset}`;

    const options = {
      headers: {
        'X-Api-Key': API_KEY,
        'User-Agent': 'Mozilla/5.0'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error(`Ошибка парсинга для ${category}:`, data.slice(0, 150));
          resolve({ items: [] });
        }
      });
    }).on('error', (err) => {
      console.error(`Сетевая ошибка для ${category}:`, err.message);
      resolve({ items: [] });
    });
  });
}

async function run() {
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    const categories = ['godly', 'ancient', 'vintage', 'unique', 'chroma'];
    const itemsMap = new Map();

    console.log('🚀 Подключение к актуальному API: https://api.rblxvalue.com/v2 ...');

    for (const cat of categories) {
      console.log(`\n📦 Загружаем категорию [${cat.toUpperCase()}]...`);
      let offset = 0;
      let total = 0;

      do {
        const res = await fetchPage(cat, offset);
        const items = res.items || [];
        total = res.total || items.length;

        for (const item of items) {
          if (item.name && !itemsMap.has(item.name.toLowerCase().trim())) {
            itemsMap.set(item.name.toLowerCase().trim(), {
              ...item,
              displayCategory: cat.toUpperCase()
            });
          }
        }

        console.log(`-> Получено ${items.length} шт. (всего в категории: ${total})`);
        offset += items.length;

        if (items.length === 0 || offset >= total) break;
      } while (true);
    }

    console.log(`\n🎯 Всего получено уникальных предметов: ${itemsMap.size} шт.`);

    const mm2Data = [];
    let idCounter = 1;

    for (const [key, item] of itemsMap) {
      const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeName}.png`;
      const localImagePath = path.join(WEAPONS_DIR, fileName);

      // Скачивание картинки по slug
      const itemSlug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const imgUrl = `https://rblxvalue.com/assets/images/items/${itemSlug}.png`;

      await downloadImage(imgUrl, localImagePath);

      mm2Data.push({
        id: idCounter++,
        name: item.name,
        slug: itemSlug,
        rarity: item.displayCategory,
        type: (item.type || 'knife').toLowerCase(),
        value: parseFloat(item.value) || 0,
        demand: parseInt(item.demand) || 5,
        stability: item.stability || 'Stable',
        image: `/images/weapons/${fileName}`
      });

      console.log(`🗡️ [${item.displayCategory}] ${item.name} | Value: ${item.value}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(mm2Data, null, 2), 'utf8');
    console.log(`\n🎉 УСПЕШНО! Создан файл mm2_values.json с ${mm2Data.length} предметами.`);
    console.log(`📁 Иконки сохранены в images/weapons/`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
