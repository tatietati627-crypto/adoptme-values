const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const RARES_JSON_PATH = path.join(__dirname, 'mm2_rares.json');
const RARES_IMG_DIR = path.join(__dirname, 'images', 'rares');

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
    if (!fs.existsSync(RARES_IMG_DIR)) {
      fs.mkdirSync(RARES_IMG_DIR, { recursive: true });
    }

    console.log('📦 Начинаем выгрузку RARE (редких предметов)...');
    const raresList = [];
    const seenSlugs = new Set();
    let offset = 0;
    let total = 0;

    do {
      const res = await fetchApi(`items?category=rare&limit=100&offset=${offset}`);
      if (!res || !res.items || res.items.length === 0) break;

      total = res.total || res.items.length;

      for (const item of res.items) {
        const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const imgName = `${slug}.png`;
        const localImgPath = path.join(RARES_IMG_DIR, imgName);

        // Получаем детальную информацию
        const detail = await fetchApi(`items/${encodeURIComponent(slug)}`);
        const apiImg = detail?.item?.image_url || detail?.image_url;

        // Варианты путей на CDN
        const candidateUrls = [
          apiImg,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.png`,
          `https://cdn.un6107617.dev/rblxvalue/items/rare/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/rare/${slug}.png`
        ].filter(Boolean);

        let downloaded = false;
        for (const u of candidateUrls) {
          downloaded = await downloadFile(u, localImgPath);
          if (downloaded) break;
        }

        raresList.push({
          id: item.id,
          name: item.name,
          slug: slug,
          rarity: 'RARE',
          type: item.type || 'knife',
          value: parseFloat(item.value) || 0,
          demand: item.demand || 1,
          stability: item.stability || 'Stable',
          image: `/images/rares/${imgName}`
        });

        console.log(`✨ [RARE] ${item.name} -> ${downloaded ? '🖼️ Скачано' : '⚠️ Не найдено'}`);
        await new Promise(r => setTimeout(r, 60));
      }

      offset += res.items.length;
      if (offset >= total) break;
    } while (true);

    fs.writeFileSync(RARES_JSON_PATH, JSON.stringify(raresList, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Всего выгружено Rare: ${raresList.length}`);
    console.log(`📄 Файл сохранён: mm2_rares.json`);

  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

run();
