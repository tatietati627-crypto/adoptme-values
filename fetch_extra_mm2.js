const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';

const OTHER_JSON_PATH = path.join(__dirname, 'mm2_other_items.json');
const SETS_JSON_PATH = path.join(__dirname, 'mm2_sets.json');

const OTHER_IMG_DIR = path.join(__dirname, 'images', 'other');
const SETS_IMG_DIR = path.join(__dirname, 'images', 'sets');

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

function fetchApi(endpoint) {
  return new Promise((resolve) => {
    const url = `https://api.rblxvalue.com/v2/${endpoint}`;
    https.get(url, {
      headers: {
        'X-Api-Key': API_KEY,
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  try {
    [OTHER_IMG_DIR, SETS_IMG_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // --- 1. ВЫГРУЗКА СЕТОВ ---
    console.log('📦 1. Загружаем MM2 СЕТЫ...');
    const setsData = await fetchApi('sets');
    const setsList = setsData?.sets || setsData?.items || setsData || [];
    const processedSets = [];

    console.log(`Найдено сетов: ${Array.isArray(setsList) ? setsList.length : 0}`);

    if (Array.isArray(setsList)) {
      for (const set of setsList) {
        const rawSlug = set.slug || set.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const cleanSlug = rawSlug.replace(/-set$/, ''); // убираем суффикс -set для картинок
        const imgName = `${cleanSlug}.png`;
        const imgPath = path.join(SETS_IMG_DIR, imgName);

        // Проверяем несколько возможных адресов CDN
        const urlsToTry = [
          `https://cdn.un6107617.dev/rblxvalue/sets/${cleanSlug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/sets/${rawSlug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/sets/${cleanSlug}.webp`,
          set.image_url
        ].filter(Boolean);

        let downloaded = false;
        for (const u of urlsToTry) {
          downloaded = await downloadFile(u, imgPath);
          if (downloaded) break;
          // пробуем с расширением .png
          if (u.includes('.webp')) {
            downloaded = await downloadFile(u.replace('.webp', '.png'), imgPath);
            if (downloaded) break;
          }
        }

        // Если готового постера сета нет на сервере — качаем первое оружие из сета как аватарку
        if (!downloaded && set.items && set.items.length > 0) {
          const firstItemUrl = set.items[0].image_url;
          if (firstItemUrl) {
            downloaded = await downloadFile(firstItemUrl, imgPath);
          }
        }

        processedSets.push({
          id: set.id,
          name: set.name,
          slug: cleanSlug,
          total_value: set.total_value || set.value || 0,
          demand: set.demand || 'High Demand',
          image: `/images/sets/${imgName}`,
          items: (set.items || []).map(it => ({
            name: it.name,
            slug: it.slug,
            value: it.value,
            image: `/images/weapons/${it.slug || it.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
          }))
        });

        console.log(`✨ [СЕТ] ${set.name} -> ${downloaded ? '✅ Картинка готова' : '⚠️ Без файла'}`);
        await new Promise(r => setTimeout(r, 60));
      }

      fs.writeFileSync(SETS_JSON_PATH, JSON.stringify(processedSets, null, 2), 'utf8');
      console.log(`🎉 Сохранено сетов в mm2_sets.json: ${processedSets.length}`);
    }

    console.log(`\n🎉 Скрипт успешно завершил работу!`);

  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

run();
