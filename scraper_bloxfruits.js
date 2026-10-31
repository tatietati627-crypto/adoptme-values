import fs from 'node:fs/promises';
import path from 'node:path';

const ASSETS_DIR = './assets/bloxfruits_all';
const DATA_DIR = './data';

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('Ищем данные Blox Fruits...');

  // Пробуем запросить данные из внутренних эндпоинтов или главной страницы трейдов
  const res = await fetch('https://bloxfruitsvalues.gg/values', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
  });

  const html = await res.text();
  
  // Ищем любые упоминания webp-картинок предметов на странице
  const matches = [...html.matchAll(/\/fruits\/([a-zA-Z0-9_-]+)\.webp/g)];
  const uniqueItems = [...new Set(matches.map(m => m[1]))];

  console.log(`Найдено уникальных картинок: ${uniqueItems.length}`);

  const catalog = [];

  for (const rawName of uniqueItems) {
    const slug = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const formattedName = rawName
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const imageUrl = `https://bloxfruitsvalues.gg/fruits/${rawName}.webp`;
    const filePath = path.join(ASSETS_DIR, `${slug}.webp`);

    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        console.log(`[+] Скачан: ${formattedName}`);
      }
    } catch (e) {
      console.log(`[-] Ошибка: ${formattedName}`);
    }

    catalog.push({
      name: formattedName,
      slug: slug,
      image: `/assets/bloxfruits_all/${slug}.webp`
    });
  }

  await fs.writeFile(path.join(DATA_DIR, 'bloxfruits_values_catalog.json'), JSON.stringify(catalog, null, 2));
  console.log('Готово! Каталог сохранен.');
}

main();
