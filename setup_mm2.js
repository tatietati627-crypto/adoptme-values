const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

// Скачивание прозрачных PNG
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

// Запрос данных с API RBLXValue с авторизацией
function fetchCategoryItems(category) {
  return new Promise((resolve) => {
    let allItems = [];
    let offset = 0;
    const limit = 100;

    function getBatch() {
      const url = `https://rblxvalue.com/api/v1/items?category=${encodeURIComponent(category)}&limit=${limit}&offset=${offset}`;

      const options = {
        headers: {
          'X-Api-Key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        }
      };

      https.get(url, options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const items = data.items || (Array.isArray(data) ? data : []);
            
            if (!items || items.length === 0) {
              return resolve(allItems);
            }

            allItems = allItems.concat(items);

            if (data.total && allItems.length < data.total) {
              offset += limit;
              getBatch();
            } else {
              resolve(allItems);
            }
          } catch (e) {
            console.error(`Ошибка разбора JSON для ${category}:`, e.message);
            resolve(allItems);
          }
        });
      }).on('error', (err) => {
        console.error(`Ошибка сети (${category}):`, err.message);
        resolve(allItems);
      });
    }

    getBatch();
  });
}

async function run() {
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    const categories = ['godly', 'ancient', 'vintage', 'chroma', 'unique'];
    const itemsMap = new Map();

    console.log('🚀 Подключаемся к RBLXValue API с твоим API-ключом...');

    for (const cat of categories) {
      console.log(`📦 Загрузка категории: [${cat.toUpperCase()}]...`);
      const items = await fetchCategoryItems(cat);
      console.log(`-> Получено предметов: ${items.length}`);

      for (const item of items) {
        const name = item.name;
        if (name && !itemsMap.has(name.toLowerCase().trim())) {
          itemsMap.set(name.toLowerCase().trim(), {
            ...item,
            customRarity: cat.toUpperCase()
          });
        }
      }
    }

    console.log(`\n🎯 Всего собрано уникального оружия: ${itemsMap.size} шт.`);

    const mm2Data = [];
    let idCounter = 1;

    for (const [key, item] of itemsMap) {
      const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeName}.png`;
      const localImagePath = path.join(WEAPONS_DIR, fileName);

      // Скачиваем чистый PNG
      const imgUrl = item.image_url || item.imageUrl || item.image;
      if (imgUrl) {
        await downloadImage(imgUrl, localImagePath);
      }

      // Определяем тип (knife, gun, pet)
      let type = (item.type || item.category || 'knife').toLowerCase();
      if (type.includes('pet')) type = 'pet';
      else if (type.includes('gun') || type.includes('blaster') || type.includes('revolver')) type = 'gun';
      else type = 'knife';

      mm2Data.push({
        id: idCounter++,
        name: item.name,
        rarity: item.customRarity,
        type: type,
        value: parseFloat(item.value) || 0,
        demand: parseInt(item.demand) || 5,
        stability: item.stability || 'stable',
        image: `/images/weapons/${fileName}`
      });

      console.log(`🗡️ [${item.customRarity}] ${item.name} | Value: ${item.value}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(mm2Data, null, 2), 'utf8');
    console.log(`\n🎉 УСПЕШНО СОЗДАНО!`);
    console.log(`📄 Сохранено предметов в mm2_values.json: ${mm2Data.length}`);
    console.log(`📁 Скачано картинок в images/weapons/: ${mm2Data.length}`);

  } catch (err) {
    console.error('❌ Фатальная ошибка:', err.message);
    process.exit(1);
  }
}

run();
