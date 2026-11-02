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
    
    // Парсим скрытый JSON Next.js (__NEXT_DATA__), если он есть в HTML
    let rawItems = [];
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1]);
        const pageProps = jsonData?.props?.pageProps || {};
        rawItems = pageProps.items || pageProps.values || pageProps.initialData || [];
      } catch (e) {
        console.log('[-] Не удалось распарсить __NEXT_DATA__, используем регулярный поиск по странице.');
      }
    }

    // Если в Next.js данные нашли структурированно
    const catalog = [];
    
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      console.log(`Найдено структурированных элементов: ${rawItems.length}`);
      
      for (const item of rawItems) {
        const name = item.name || item.title || "Unknown";
        const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const imageUrl = item.image || item.icon || `https://bloxfruitsvalues.gg/fruits/${slug}.webp`;
        const filePath = path.join(ASSETS_DIR, `${slug}.webp`);

        // Скачиваем картинку
        try {
          const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            await fs.writeFile(filePath, buffer);
          }
        } catch (e) {
          // пропускаем
        }

        catalog.push({
          id: slug,
          name: name,
          category: item.category || "Fruits",
          localPath: `BloxFruits/images/${slug}.webp`,
          variants: {
            regular: {
              value: item.regularValue || item.value || "N/A",
              demand: item.regularDemand || item.demand || "Stable",
              beliPrice: item.beliPrice || "N/A"
            },
            permanent: {
              value: item.permanentValue || item.permValue || "N/A",
              demand: item.permanentDemand || "High",
              robuxPrice: item.robuxPrice || "N/A"
            }
          }
        });
      }
    } else {
      // Запасной вариант через веб-спарсинг картинок, если JSON зашифрован
      const matches = [...html.matchAll(/\/fruits\/([a-zA-Z0-9_-]+)\.webp/g)];
      const uniqueItems = [...new Set(matches.map(m => m[1]))];

      console.log(`Найдено уникальных предметов по картинкам: ${uniqueItems.length}`);

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
          }
        } catch (e) {}

        catalog.push({
          id: slug,
          name: formattedName,
          category: "Fruits",
          localPath: `BloxFruits/images/${slug}.webp`,
          variants: {
            regular: { value: "N/A", demand: "Stable", beliPrice: "N/A" },
            permanent: { value: "N/A", demand: "High", robuxPrice: "N/A" }
          }
        });
      }
    }

    console.log(`\nИтоговый каталог: ${catalog.length} предметов.`);

    const outputPath = path.join(DATA_DIR, 'bloxfruits_database.json');
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
    console.log(`Каталог успешно сохранён в: ${outputPath}`);

  } catch (error) {
    console.error('Ошибка в работе скрипта:', error.message);
    process.exit(1);
  }
}

main();
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
    
    // Парсим скрытый JSON Next.js (__NEXT_DATA__), если он есть в HTML
    let rawItems = [];
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1]);
        const pageProps = jsonData?.props?.pageProps || {};
        rawItems = pageProps.items || pageProps.values || pageProps.initialData || [];
      } catch (e) {
        console.log('[-] Не удалось распарсить __NEXT_DATA__, используем регулярный поиск по странице.');
      }
    }

    // Если в Next.js данные нашли структурированно
    const catalog = [];
    
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      console.log(`Найдено структурированных элементов: ${rawItems.length}`);
      
      for (const item of rawItems) {
        const name = item.name || item.title || "Unknown";
        const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const imageUrl = item.image || item.icon || `https://bloxfruitsvalues.gg/fruits/${slug}.webp`;
        const filePath = path.join(ASSETS_DIR, `${slug}.webp`);

        // Скачиваем картинку
        try {
          const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            await fs.writeFile(filePath, buffer);
          }
        } catch (e) {
          // пропускаем
        }

        catalog.push({
          id: slug,
          name: name,
          category: item.category || "Fruits",
          localPath: `BloxFruits/images/${slug}.webp`,
          variants: {
            regular: {
              value: item.regularValue || item.value || "N/A",
              demand: item.regularDemand || item.demand || "Stable",
              beliPrice: item.beliPrice || "N/A"
            },
            permanent: {
              value: item.permanentValue || item.permValue || "N/A",
              demand: item.permanentDemand || "High",
              robuxPrice: item.robuxPrice || "N/A"
            }
          }
        });
      }
    } else {
      // Запасной вариант через веб-спарсинг картинок, если JSON зашифрован
      const matches = [...html.matchAll(/\/fruits\/([a-zA-Z0-9_-]+)\.webp/g)];
      const uniqueItems = [...new Set(matches.map(m => m[1]))];

      console.log(`Найдено уникальных предметов по картинкам: ${uniqueItems.length}`);

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
          }
        } catch (e) {}

        catalog.push({
          id: slug,
          name: formattedName,
          category: "Fruits",
          localPath: `BloxFruits/images/${slug}.webp`,
          variants: {
            regular: { value: "N/A", demand: "Stable", beliPrice: "N/A" },
            permanent: { value: "N/A", demand: "High", robuxPrice: "N/A" }
          }
        });
      }
    }

    console.log(`\nИтоговый каталог: ${catalog.length} предметов.`);

    const outputPath = path.join(DATA_DIR, 'bloxfruits_database.json');
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
    console.log(`Каталог успешно сохранён в: ${outputPath}`);

  } catch (error) {
    console.error('Ошибка в работе скрипта:', error.message);
    process.exit(1);
  }
}

main();
