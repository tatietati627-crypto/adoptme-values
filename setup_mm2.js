const fs = require('fs');
const path = require('path');
const https = require('https');

const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

// Функция скачивания картинок
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

// Запрос данных из API
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    console.log('🌐 Запрашиваем данные напрямую из API RBLXValue...');
    
    // Получаем список предметов
    const response = await fetchJson('https://rblxvalue.com/api/v1/items');
    const items = Array.isArray(response) ? response : (response.items || response.data || []);

    console.log(`📦 Всего получено предметов из API: ${items.length}`);

    // Оставляем только ножи, пистолеты, петов категорий Godly, Ancient, Vintage, Chroma, Unique
    const targetRarities = ['godly', 'ancient', 'vintage', 'chroma', 'unique'];

    const filtered = items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const rarity = (item.rarity || '').toLowerCase();
      return targetRarities.some(r => cat.includes(r) || type.includes(r) || rarity.includes(r));
    });

    console.log(`🎯 Отфильтровано Godly/Ancient/Chroma/Vintage: ${filtered.length} шт.`);

    const mm2Data = [];
    let idCounter = 1;

    for (const item of filtered) {
      const name = item.name || item.title;
      if (!name) continue;

      const safeFileName = name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      const localImagePath = path.join(WEAPONS_DIR, safeFileName);

      // Скачиваем оригинальную чистую картинку
      const imgUrl = item.imageUrl || item.image || item.thumbnail;
      if (imgUrl) {
        await downloadImage(imgUrl, localImagePath);
      }

      // Определяем редкость и категорию
      let itemRarity = (item.category || item.rarity || 'GODLY').toUpperCase();
      let itemType = (item.type || 'knife').toLowerCase();

      mm2Data.push({
        id: idCounter++,
        name: name,
        rarity: itemRarity,
        type: itemType,
        value: parseFloat(item.value) || 0,
        demand: item.demand || 5,
        stability: item.stability || 'stable',
        image: `/images/weapons/${safeFileName}`
      });

      console.log(`🗡️ [${itemRarity}] ${name} | Value: ${item.value}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(mm2Data, null, 2), 'utf8');
    console.log(`\n🎉 УСПЕШНО! Сохранено ${mm2Data.length} предметов в mm2_values.json`);
    console.log(`📁 Все оригинальные картинки скачаны в images/weapons/`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
