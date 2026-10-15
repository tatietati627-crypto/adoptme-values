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
  [OTHER_IMG_DIR, SETS_IMG_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // --- 1. ВЫГРУЗКА SETS ---
  console.log('📦 1. Загружаем MM2 СЕТЫ (/v2/sets)...');
  const setsData = await fetchApi('sets');
  const setsList = setsData?.sets || setsData || [];
  const processedSets = [];

  console.log(`Найдено сетов: ${Array.isArray(setsList) ? setsList.length : 0}`);

  if (Array.isArray(setsList)) {
    for (const set of setsList) {
      const slug = set.slug || set.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const imgName = `${slug}.png`;
      const imgPath = path.join(SETS_IMG_DIR, imgName);

      // Скачиваем превью сета, если доступно
      if (set.image_url) {
        await downloadFile(set.image_url, imgPath);
      }

      processedSets.push({
        name: set.name,
        slug: slug,
        total_value: set.total_value || set.value || 0,
        demand: set.demand || 'Normal',
        items: set.items || [],
        image: `/images/sets/${imgName}`
      });
    }
    fs.writeFileSync(SETS_JSON_PATH, JSON.stringify(processedSets, null, 2), 'utf8');
    console.log(`✅ Сохранено сетов в mm2_sets.json: ${processedSets.length}`);
  }

  // --- 2. ВЫГРУЗКА ОСТАЛЬНЫХ КАТЕГОРИЙ ---
  console.log('\n📦 2. Загружаем остальные категории предметов...');
  const extraCategories = ['legendary', 'rare', 'uncommon', 'common', 'pets', 'misc'];
  const otherItems = [];
  const seenSlugs = new Set();

  for (const cat of extraCategories) {
    console.log(`\n🔍 Категория: [${cat.toUpperCase()}]`);
    let offset = 0;
    let total = 0;

    do {
      const res = await fetchApi(`items?category=${encodeURIComponent(cat)}&limit=100&offset=${offset}`);
      if (!res || !res.items || res.items.length === 0) break;

      total = res.total || res.items.length;

      for (const item of res.items) {
        const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const imgName = `${slug}.png`;
        const localPath = path.join(OTHER_IMG_DIR, imgName);

        // Получаем ссылку на картинку через детальный запрос
        const detail = await fetchApi(`items/${encodeURIComponent(slug)}`);
        const imgUrl = detail?.item?.image_url || detail?.image_url;

        if (imgUrl) {
          await downloadFile(imgUrl, localPath);
        }

        otherItems.push({
          name: item.name,
          slug: slug,
          rarity: (item.category || cat).toUpperCase(),
          type: item.type || 'knife',
          value: parseFloat(item.value) || 0,
          demand: item.demand || 1,
          stability: item.stability || 'Stable',
          image: `/images/other/${imgName}`
        });

        console.log(`  -> [${cat.toUpperCase()}] ${item.name}`);
        await new Promise(r => setTimeout(r, 60)); // пауза против лимитов
      }

      offset += res.items.length;
      if (offset >= total) break;
    } while (true);
  }

  fs.writeFileSync(OTHER_JSON_PATH, JSON.stringify(otherItems, null, 2), 'utf8');
  console.log(`\n🎉 УСПЕШНО!`);
  console.log(`📄 Сохранено предметов в mm2_other_items.json: ${otherItems.length}`);
  console.log(`📄 Сохранено сетов в mm2_sets.json: ${processedSets.length}`);
}

run();
