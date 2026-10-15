const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCAL_JSON_PATH = path.join(__dirname, 'adoptme_values.json');
const PETS_DIR = path.join(__dirname, 'images', 'pets');

// Функция безопасного скачивания картинки
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: status ${res.statusCode}`));
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

// Запрос JSON данных
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AdoptMeBot/1.0' } }, (res) => {
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
    console.log('🔄 Читаем adoptme_values.json...');
    const localData = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf8'));

    // Убедимся, что папка images/pets существует
    if (!fs.existsSync(PETS_DIR)) {
      fs.mkdirSync(PETS_DIR, { recursive: true });
    }

    console.log('🌐 Загружаем актуальные данные с Elvebredd...');
    // Источник данных Elvebredd
    const remoteData = await fetchJson('https://elvebredd.com/api/values');

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
        // 1. Питомец есть -> обновляем цены
        const existing = localMap.get(key);
        if (remote.regular) existing.regular = { ...existing.regular, ...remote.regular };
        if (remote.neon) existing.neon = { ...existing.neon, ...remote.neon };
        if (remote.mega) existing.mega = { ...existing.mega, ...remote.mega };
        updatedCount++;
      } else {
        // 2. Новый питомец -> скачиваем картинку и добавляем в базу
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
    console.log(`\n✅ Успешно! Обновлено: ${updatedCount}, Добавлено новых: ${newCount}`);

  } catch (err) {
    console.error('❌ Ошибка выполнения:', err.message);
    process.exit(1);
  }
}

run();
