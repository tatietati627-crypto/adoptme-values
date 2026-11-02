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
  console.log('Запуск стабильного парсера Blox Fruits Values...');
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

    // Пытаемся вытянуть реальные данные из Next.js JSON на странице для заполнения цен и перманентов
    let siteItemsMap = {};
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1]);
        const pageProps = jsonData?.props?.pageProps || {};
        const rawItems = pageProps.items || pageProps.values || pageProps.initialData || [];
        
        if (Array.isArray(rawItems)) {
          for (const item of rawItems) {
            const itemName = item.name || item.title || "";
            const slugKey = itemName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            if (slugKey) {
              siteItemsMap[slugKey] = item;
            }
          }
        }
      } catch (e) {
        console.log('[-] Не удалось распарсить __NEXT_DATA__, используем базовые данные картинок.');
      }
    }
  
    // Ищем любые упоминания webp-картинок предметов на странице (как в твоем рабочем скрипте)
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
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          await fs.writeFile(filePath, buffer);
          console.log(`[+] Скачан: ${formattedName}`);
        }
      } catch (e) {
        console.log(`[-] Ошибка скачивания картинки: ${formattedName}`);
      }

      // Берем данные с сайта, если они нашлись, иначе ставим аккуратные дефолтные поля
      const itemData = siteItemsMap[slug] || {};

      catalog.push({
        id: slug,
        name: formattedName,
        category: itemData.category || "Fruits",
        localPath: `BloxFruits/images/${slug}.webp`,
        variants: {
          regular: {
            value: itemData.value || itemData.regularValue || "N/A",
            demand: itemData.demand || itemData.regularDemand || "Stable",
            beliPrice: itemData.beliPrice || "N/A"
          },
          permanent: {
            value: itemData.permValue || itemData.permanentValue || "N/A",
            demand: itemData.permDemand || itemData.permanentDemand || "High",
            robuxPrice: itemData.robuxPrice || "N/A"
          }
        }
      });
    }

    console.log(`\nУспешно обработано предметов: ${catalog.length}`);

    // Сохраняем итоговый JSON в правильное место
    const outputPath = path.join(DATA_DIR, 'bloxfruits_database.json');
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
    console.log(`Каталог сохранён в: ${outputPath}`);

  } catch (error) {
    console.error('Ошибка в работе скрипта:', error.message);
    process.exit(1);
  }
}

main();
