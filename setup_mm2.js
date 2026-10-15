const fs = require('fs');
const path = require('path');
const https = require('https');

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function run() {
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    // Запрашиваем категории строго по эндпоинтам API RBLXValue
    const categories = ['godly', 'ancient', 'vintage', 'chroma', 'unique'];
    const allItemsMap = new Map();

    for (const cat of categories) {
      const url = `https://rblxvalue.com/api/v1/items?category=${cat}`;
      console.log(`🌐 Запрос категории [${cat.toUpperCase()}]: ${url}`);
      
      const response = await fetchJson(url);
      const list = Array.isArray(response) ? response : (response.items || response.data || []);
      console.log(`-> Получено для [${cat}]: ${list.length} предметов`);

      for (const item of list) {
        const name = item.name || item.title;
        if (name && !allItemsMap.has(name.toLowerCase().trim())) {
          allItemsMap.set(name.toLowerCase().trim(), {
            ...item,
            resolvedCategory: cat.toUpperCase()
          });
        }
      }
    }

    console.log(`\n🎯 Всего уникальных предметов собрано: ${allItemsMap.size}`);

    const mm2Data = [];
    let idCounter = 1;

    for (const [key, item] of allItemsMap) {
      const name = item.name || item.title;
      const safeFileName = name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      const localImagePath = path.join(WEAPONS_DIR, safeFileName);

      const imgUrl = item.imageUrl || item.image || item.thumbnail;
      if (imgUrl) {
        await downloadImage(imgUrl, localImagePath);
      }

      mm2Data.push({
        id: idCounter++,
        name: name,
        rarity: item.resolvedCategory,
        type: (item.type || 'knife').toLowerCase(),
        value: parseFloat(item.value) || 0,
        demand: item.demand || 5,
        stability: item.stability || 'stable',
        image: `/images/weapons/${safeFileName}`
      });

      console.log(`🗡️ [${item.resolvedCategory}] ${name} | Value: ${item.value}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(mm2Data, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Сохранено ${mm2Data.length} предметов в mm2_values.json`);
    console.log(`📁 Все чистые картинки скачаны в images/weapons/`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
