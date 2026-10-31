import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = 'https://bloxfruitsvalues.gg/values';
const ASSETS_DIR = './assets/bloxfruits_all';
const DATA_DIR = './data';

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  await ensureDir(ASSETS_DIR);
  await ensureDir(DATA_DIR);

  console.log('====================================================');
  console.log('Запуск парсера Blox Fruits Values...');
  console.log('Target: ' + TARGET_URL);
  console.log('====================================================\n');

  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      throw new Error(`Не удалось открыть страницу. Статус: ${res.status}`);
    }

    const html = await res.text();
    const catalog = [];
    const seenSlugs = new Set();

    // Ищем ссылки на картинки и связанные названия предметов в верстке сайта
    const imgRegex = /https:\/\/bloxfruitsvalues\.gg\/fruits\/([a-zA-Z0-9_-]+)\.webp/g;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const rawName = match[1];
      const slug = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      // Красивое форматирование имени из slug (kitsune_mutation -> Kitsune Mutation)
      const formattedName = rawName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const imageUrl = `https://bloxfruitsvalues.gg/fruits/${rawName}.webp`;
      const localImagePath = path.join(ASSETS_DIR, `${slug}.webp`);

      console.log(`[+] Найден предмет: ${formattedName}`);

      try {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          await fs.writeFile(localImagePath, buffer);
          console.log(`    -> Картинка сохранена: ${localImagePath}`);
        }
      } catch (err) {
        console.log(`    [-] Ошибка скачивания картинки: ${err.message}`);
      }

      catalog.push({
        name: formattedName,
        slug: slug,
        original_image: imageUrl,
        local_image: `/assets/bloxfruits_all/${slug}.webp`
      });
    }

    console.log(`\nУспешно обработано предметов: ${catalog.length}`);

    // Сохраняем полный итоговый JSON
    const outputPath = path.join(DATA_DIR, 'bloxfruits_values_catalog.json');
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
    console.log(`Каталог сохранён в: ${outputPath}`);

  } catch (error) {
    console.error('Ошибка в работе скрипта:', error.message);
    process.exit(1);
  }
}

main();
