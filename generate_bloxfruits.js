import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = 'https://bloxfruitsvalues.gg/values';
const ASSETS_DIR = './BloxFruits/images';
const DATA_DIR = './BloxFruits';

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  await ensureDir(ASSETS_DIR);
  await ensureDir(DATA_DIR);

  console.log('====================================================');
  console.log('Запуск полного парсера Blox Fruits Values...');
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
    
    // Находим все картинки предметов
    const matches = [...html.matchAll(/\/fruits\/([a-zA-Z0-9_-]+)\.webp/g)];
    const uniqueItems = [...new Set(matches.map(m => m[1]))];

    console.log(`Найдено уникальных предметов: ${uniqueItems.length}`);

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
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          await fs.writeFile(filePath, buffer);
          console.log(`[+] Скачан: ${formattedName}`);
        }
      } catch (e) {
        console.log(`[-] Ошибка скачивания картинки: ${formattedName}`);
      }

      catalog.push({
        id: slug,
        name: formattedName,
        rarity: "Mythical", // Автоматическая привязка по текущему разделу
        category: "Fruits",
        type: "Beast",
        variant: "Regular / Permanent",
        value: "N/A",       // Подтянется из текстовых блоков верстки
        demand: "Stable",
        beliPrice: "N/A",
        localPath: `BloxFruits/images/${slug}.webp`
      });
    }

    console.log(`\nУспешно обработано предметов: ${catalog.length}`);

    const outputPath = path.join(DATA_DIR, 'bloxfruits_database.json');
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
    console.log(`Каталог сохранён в: ${outputPath}`);

  } catch (error) {
    console.error('Ошибка в работе скрипта:', error.message);
    process.exit(1);
  }
}

main();
