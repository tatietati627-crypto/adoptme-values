const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'Rbx_aa357d5b65f6d287af4a864ef472ded4066e7a7d91d4f4a4';
const PETS_JSON_PATH = path.join(__dirname, 'mm2_pets.json');
const PETS_IMG_DIR = path.join(__dirname, 'images', 'pets');

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
    if (!fs.existsSync(PETS_IMG_DIR)) {
      fs.mkdirSync(PETS_IMG_DIR, { recursive: true });
    }

    console.log('📦 Начинаем выгрузку PETS (питомцев MM2)...');
    const petsList = [];
    const seenSlugs = new Set();
    let offset = 0;
    let total = 0;

    do {
      const res = await fetchApi(`items?category=pets&limit=100&offset=${offset}`);
      if (!res || !res.items || res.items.length === 0) break;

      total = res.total || res.items.length;

      for (const item of res.items) {
        const slug = item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `pet_${item.id}`);
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const imgName = `${slug}.png`;
        const localImgPath = path.join(PETS_IMG_DIR, imgName);

        // Получаем детальную информацию
        const detail = await fetchApi(`items/${encodeURIComponent(slug)}`);
        const apiImg = detail?.item?.image_url || detail?.image_url;

        // Варианты возможных адресов для CDN питомцев
        const candidateUrls = [
          apiImg,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/${slug}.png`,
          `https://cdn.un6107617.dev/rblxvalue/pets/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/pets/${slug}.png`,
          `https://cdn.un6107617.dev/rblxvalue/items/pets/${slug}.webp`,
          `https://cdn.un6107617.dev/rblxvalue/items/pets/${slug}.png`
        ].filter(Boolean);

        let downloaded = false;
        for (const u of candidateUrls) {
          downloaded = await downloadFile(u, localImgPath);
          if (downloaded) break;
        }

        // Безопасное определение редкости
        let rawRarity = item.rarity || item.category || 'PET';
        if (typeof rawRarity === 'object' && rawRarity !== null) {
          rawRarity = rawRarity.name || rawRarity.slug || 'PET';
        }
        const safeRarity = String(rawRarity).toUpperCase();

        petsList.push({
          id: item.id,
          name: item.name,
          slug: slug,
          rarity: safeRarity,
          type: 'pet',
          value: parseFloat(item.value) || 0,
          demand: item.demand || 1,
          stability: item.stability || 'Stable',
          image: `/images/pets/${imgName}`
        });

        console.log(`🐾 [PET] ${item.name} -> ${downloaded ? '🖼️ Скачано' : '⚠️ Не найдено'}`);
        await new Promise(r => setTimeout(r, 60));
      }

      offset += res.items.length;
      if (offset >= total) break;
    } while (true);

    fs.writeFileSync(PETS_JSON_PATH, JSON.stringify(petsList, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Всего выгружено питомцев: ${petsList.length}`);
    console.log(`📄 Файл сохранён: mm2_pets.json`);

  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

run();
