import fs from 'node:fs/promises';
import path from 'node:path';

const ASSETS_DIR = './assets/bladeball';
const DATA_DIR = './data';

const FULL_DATABASE_URL = 'https://raw.githubusercontent.com/blox-data/blade-ball-database/main/data.json'; 

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('Скачиваем полный дамп базы данных Blade Ball...');

  let items = [];

  try {
    const res = await fetch(FULL_DATABASE_URL);
    if (res.ok) {
      items = await res.json();
      console.log(`Загружено записей из базы: ${items.length}`);
    } else {
      throw new Error(`Ошибка загрузки датасета: ${res.status}`);
    }
  } catch (err) {
    console.log(`Не удалось взять с основного репозитория (${err.message}), переключаемся на резервный каталог...`);
    items = [
      { name: 'Default Sword', category: 'sword', slug: 'default_sword', img: 'https://tr.rbxcdn.com/180DAY-Asset-F95D83C66B994C3E9CA9F26E770E10AA-Png/150/150/Image/Webp/noFilter' }
    ];
  }

  const catalog = [];

  for (const item of items) {
    const name = item.name || 'Unknown Item';
    const slug = (item.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const category = item.category || 'item';
    const imgUrl = item.img || item.image;

    if (!imgUrl) continue;

    const fileName = `${slug}.webp`;
    const localFilePath = path.join(ASSETS_DIR, fileName);

    try {
      const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        await fs.writeFile(localFilePath, buffer);
        console.log(`[+] Сохранено: [${category}] ${name}`);
      }
    } catch (e) {
      // Пропускаем проблемные файлы
    }

    catalog.push({
      name: name,
      category: category,
      slug: slug,
      image: `/assets/bladeball/${fileName}`
    });
  }

  const outputPath = path.join(DATA_DIR, 'bladeball_catalog.json');
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
  console.log(`Готово! Каталог сохранен. Всего элементов: ${catalog.length}`);
}

main();
