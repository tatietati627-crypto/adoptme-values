const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const UNCOMMONS_JSON_PATH = path.join(__dirname, 'mm2_uncommons.json');
const UNCOMMONS_IMG_DIR = path.join(__dirname, 'images', 'uncommons');

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://rblxvalue.com/'
      }
    }, (res) => {
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
    if (!fs.existsSync(UNCOMMONS_IMG_DIR)) {
      fs.mkdirSync(UNCOMMONS_IMG_DIR, { recursive: true });
    }

    console.log('📦 Начинаем выгрузку UNCOMMON с прямым перебором CDN...');
    const uncommonsList = [];
    const seenSlugs = new Set();
    let offset = 0;
    let total = 0;

    do {
      const res = await fetchApi(`items?category=uncommon&limit=100&offset=${offset}`);
      if (!res || !res.items || res.items.length === 0) break;

      total = res.total || res.items.length;

      for (const item of res.items) {
        const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const imgName = `${slug}.png`;
        const localImgPath = path.join(UNCOMMONS_IMG_DIR, imgName);

        // Получаем инфу из апи
        const detail = await fetchApi(`items/${encodeURIComponent(slug)}`);
        const apiImg = detail?.item?.image_url || detail?.image_url;

        // Список всех возможных прямых адресов на CDN
        const candidateUrls = [
          apiImg,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.png`,
          `https://cdn.un6107617.dev/rblxvalue/items/uncommon/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/uncommon/${slug}.png`
        ].filter(Boolean);

        let downloaded = false;
        for (const u of candidateUrls) {
          downloaded = await downloadFile(u, localImgPath);
          if (downloaded) break;
        }

        uncommonsList.push({
          id: item.id,
          name: item.name,
          slug: slug,
          rarity: 'UNCOMMON',
          type: item.type || 'knife',
          value: parseFloat(item.value) || 0,
          demand: item.demand || 1,
          stability: item.stability || 'Stable',
          image: `/images/uncommons/${imgName}`
        });

        console.log(`✨ [UNCOMMON] ${item.name} -> ${downloaded ? '🖼️ Скачано' : '⚠️ Не найдено'}`);
        await new Promise(r => setTimeout(r, 60));
      }

      offset += res.items.length;
      if (offset >= total) break;
    } while (true);

    fs.writeFileSync(UNCOMMONS_JSON_PATH, JSON.stringify(uncommonsList, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Обработано предметов: ${uncommonsList.length}`);
    console.log(`📄 Файл сохранён: mm2_uncommons.json`);

  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

run();
