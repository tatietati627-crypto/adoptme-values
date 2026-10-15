const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);

    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve);
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

// Поиск прозрачной иконки на Fandom MM2
function fetchWikiImage(itemName) {
  return new Promise((resolve) => {
    const formatted = encodeURIComponent(itemName);
    const url = `https://murder-mystery-2.fandom.com/api.php?action=query&titles=${formatted}&prop=pageimages&format=json&pithumbsize=400`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId && pages[pageId].thumbnail) {
            resolve(pages[pageId].thumbnail.source);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Запрос детальной инфы предмета из API v2
function fetchItemDetail(slug) {
  return new Promise((resolve) => {
    const url = `https://api.rblxvalue.com/v2/items/${encodeURIComponent(slug)}`;
    https.get(url, { headers: { 'X-Api-Key': API_KEY, 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const item = parsed.item || parsed;
          resolve(item.image_url || item.imageUrl || item.image || null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  if (!fs.existsSync(WEAPONS_DIR)) {
    fs.mkdirSync(WEAPONS_DIR, { recursive: true });
  }

  if (!fs.existsSync(MM2_JSON_PATH)) {
    console.error('❌ mm2_values.json не найден!');
    return;
  }

  const items = JSON.parse(fs.readFileSync(MM2_JSON_PATH, 'utf8'));
  console.log(`🗡️ Найдено ${items.length} предметов. Начинаем поиск и загрузку иконок...`);

  // Проверим первый предмет для теста URL из API
  const testImg = await fetchItemDetail(items[0].slug || 'travelers-gun');
  console.log(`🔍 Проверка ссылки на изображение из API: ${testImg || 'отсутствует в API'}`);

  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_');
    const localPath = path.join(WEAPONS_DIR, `${safeName}.png`);

    // Если картинка уже есть — пропускаем
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) {
      successCount++;
      continue;
    }

    let imgUrl = null;

    // 1. Пробуем получить ссылку из детального эндпоинта API
    if (testImg) {
      imgUrl = await fetchItemDetail(item.slug);
    }

    // 2. Если в API нет ссылки, берем официальный рендер с вики
    if (!imgUrl) {
      imgUrl = await fetchWikiImage(item.name);
    }

    if (imgUrl) {
      const ok = await downloadFile(imgUrl, localPath);
      if (ok) {
        successCount++;
        console.log(`[${i + 1}/${items.length}] ✅ Скачан: ${item.name}`);
      } else {
        console.log(`[${i + 1}/${items.length}] ❌ Ошибка скачивания файла: ${item.name}`);
      }
    } else {
      console.log(`[${i + 1}/${items.length}] ⚠️ Иконка не найдена: ${item.name}`);
    }

    // Небольшая задержка, чтобы не спамить запросами
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n🎉 Готово! Всего скачано картинок: ${successCount}/${items.length}`);
}

run();
