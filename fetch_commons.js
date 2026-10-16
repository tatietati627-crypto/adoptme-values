const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const COMMONS_JSON_PATH = path.join(__dirname, 'mm2_commons.json');
const COMMONS_IMG_DIR = path.join(__dirname, 'images', 'commons');

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
    if (!fs.existsSync(COMMONS_IMG_DIR)) {
      fs.mkdirSync(COMMONS_IMG_DIR, { recursive: true });
    }

    console.log('📦 Начинаем выгрузку COMMON (комонок)...');
    const commonsList = [];
    const seenSlugs = new Set();
    let offset = 0;
    let total = 0;

    do {
      const res = await fetchApi(`items?category=common&limit=100&offset=${offset}`);
      if (!res || !res.items || res.items.length === 0) break;

      total = res.total || res.items.length;

      for (const item of res.items) {
        const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const imgName = `${slug}.png`;
        const localImgPath = path.join(COMMONS_IMG_DIR, imgName);

        // Получаем детальную ссылку на картинку
        const detail = await fetchApi(`items/${encodeURIComponent(slug)}`);
        const imgUrl = detail?.item?.image_url || detail?.image_url;

        let downloaded = false;
        if (imgUrl) {
          downloaded = await downloadFile(imgUrl, localImgPath);
        }

        commonsList.push({
          id: item.id,
          name: item.name,
          slug: slug,
          rarity: 'COMMON',
          type: item.type || 'knife',
          value: parseFloat(item.value) || 0,
          demand: item.demand || 1,
          stability: item.stability || 'Stable',
          image: `/images/commons/${imgName}`
        });

        console.log(`✅ [COMMON] ${item.name} -> ${downloaded ? '🖼️ фото скачано' : '⚠️ без фото'}`);
        await new Promise(r => setTimeout(r, 60)); // небольшая пауза от спама
      }

      offset += res.items.length;
      if (offset >= total) break;
    } while (true);

    fs.writeFileSync(COMMONS_JSON_PATH, JSON.stringify(commonsList, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Всего выгружено комонок: ${commonsList.length}`);
    console.log(`📄 Файл сохранён: mm2_commons.json`);

  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

run();
