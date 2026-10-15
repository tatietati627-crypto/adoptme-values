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

// Запрос данных с имитацией настоящего браузера
function fetchWithBrowserHeaders(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://elvebredd.com/'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📡 Ответ от сервера: HTTP ${res.statusCode}`);
        if (res.statusCode !== 200) {
          console.error(`Фрагмент ответа: ${data.slice(0, 300)}`);
          return reject(new Error(`Сервер вернул статус HTTP ${res.statusCode}`));
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error(`Сервер вернул HTML вместо JSON. Первые 300 символов:\n${data.slice(0, 300)}`);
          reject(new Error('Ответ не является корректным JSON'));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('🔄 Читаем adoptme_values.json...');
    const localData = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf8'));

    if (!fs.existsSync(PETS_DIR)) {
      fs.mkdirSync(PETS_DIR, { recursive: true });
    }

    console.log('🌐 Загружаем актуальные данные...');
    // Пробуем запросить данные
    const remoteData = await fetchWithBrowserHeaders('https://elvebredd.com/api/values');

    if (!Array.isArray(remoteData)) {
      throw new Error('Данные с сайта получены не в виде списка массивов');
    }

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
            console.log(`📥 Скачиваем картинку: ${remote.name}`);
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
      }
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`\n✅ Успешно! Обновлено: ${updatedCount}, Добавлено: ${newCount}`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
