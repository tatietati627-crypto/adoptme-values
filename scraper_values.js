import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = 'https://bloxfruitsvalues.gg/values';
const ASSETS_DIR = './assets/bloxfruits_all';
const DATA_DIR = './data';

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('Стягиваем данные с страницы цен...');
  
  // Делаем запрос к странице с имитацией браузера
  const res = await fetch(TARGET_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    console.error(`Ошибка доступа к сайту: ${res.status}`);
    return;
  }

  const html = await res.text();

  // Регулярка для поиска блоков предметов, картинок и названий на странице Next.js / Nuxt / Tailwind
  // Сайт отдает данные в виде блоков с картинками .webp и названиями
  const itemRegex = /<img[^>]+src="([^"]+\.webp)"[^>]*>[\s\S]*?<div[^>]*>([^<]+)<\/div>/g;
  
  let match;
  const items = [];
  const seen = new Set();

  while ((match = itemRegex.exec(html)) !== null) {
    let imgUrl = match.arg1 || match[1];
    let name = (match.arg2 || match[2]).trim();

    if (!imgUrl || !name || name.length > 30 || seen.has(name)) continue;
    seen.add(name);

    // Нормализуем ссылку на картинку, если она относительная
    if (imgUrl.startsWith('/')) {
      imgUrl = `https://bloxfruitsvalues.gg${imgUrl}`;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    items.push({ name, slug, imgUrl });
  }

  console.log(`Найдено уникальных предметов: ${items.length}. Начинаем скачивание ассетов...`);

  const catalog = [];

  for (const item of items) {
    const filePath = path.join(ASSETS_DIR, `${item.slug}.webp`);
    try {
      const imgRes = await fetch(item.imgUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        console.log(`[+] Сохранен: ${item.name}`);
      }
    } catch (e) {
      console.log(`[-] Ошибка скачивания картинки для ${item.name}`);
    }

    catalog.push({
      name: item.name,
      slug: item.slug,
      image: `/assets/bloxfruits_all/${item.slug}.webp`
    });
  }

  await fs.writeFile(path.join(DATA_DIR, 'bloxfruits_values_catalog.json'), JSON.stringify(catalog, null, 2));
  console.log('Готово! Весь каталог цен и предметов успешно выкачан.');
}

main();
