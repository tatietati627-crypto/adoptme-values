const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Автоматическая установка cheerio, если его нет
try {
    require.resolve('cheerio');
} catch (e) {
    console.log("📦 Установка cheerio...");
    execSync('npm install cheerio');
}

const cheerio = require('cheerio');

async function run() {
    console.log("🚀 Melanie Studio | Парсинг bloxfruitsvalues.gg/values...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        const pageUrl = 'https://bloxfruitsvalues.gg/values';
        console.log(`🌐 Скачиваем страницу: ${pageUrl}`);

        const response = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`Не удалось загрузить страницу: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const database = [];
        let downloadedCount = 0;

        // Ищем скрытые данные Next.js __NEXT_DATA__
        const nextDataScript = $('#__NEXT_DATA__').html();
        
        if (nextDataScript) {
            console.log("🔍 Найден __NEXT_DATA__, извлекаем структурированные данные...");
            const nextData = JSON.parse(nextDataScript);
            const pageProps = nextData?.props?.pageProps || {};
            const items = pageProps.items || pageProps.values || pageProps.initialData || [];

            if (Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    const name = item.name || item.title || "Unknown";
                    const category = item.category || item.type || "Fruits";
                    const value = item.value || item.price || 0;
                    const demand = item.demand || "Normal";
                    const imgUrl = item.image || item.icon || item.img || null;

                    const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const fileName = `${sanitizedId}.png`;
                    const localFilePath = path.join(imagesDir, fileName);
                    const localRelativePath = `BloxFruits/images/${fileName}`;

                    if (imgUrl) {
                        const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://bloxfruitsvalues.gg${imgUrl}`;
                        try {
                            const imgRes = await fetch(fullImgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                            if (imgRes.ok) {
                                const buffer = Buffer.from(await imgRes.arrayBuffer());
                                fs.writeFileSync(localFilePath, buffer);
                                downloadedCount++;
                            }
                        } catch (e) {
                            console.log(`⚠️ Не удалось скачать иконку для ${name}`);
                        }
                    }

                    database.push({
                        id: sanitizedId,
                        name,
                        category,
                        value,
                        demand,
                        imageUrl: imgUrl,
                        localPath: localRelativePath
                    });
                }
            }
        }

        // Если данных через Next.js не нашлось, парсим карточки из HTML
        if (database.length === 0) {
            console.log("🔍 Парсим HTML-карточки со страницы...");
            
            $('[class*="item"], [class*="card"], div.grid > div').each((i, el) => {
                const name = $(el).find('h2, h3, p, [class*="title"], [class*="name"]').first().text().trim();
                const valueText = $(el).find('[class*="value"], [class*="price"]').text().trim();
                const imgSrc = $(el).find('img').attr('src');

                if (name && name.length > 1) {
                    const sanitizedId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const fileName = `${sanitizedId}.png`;
                    const localFilePath = path.join(imagesDir, fileName);
                    const localRelativePath = `BloxFruits/images/${fileName}`;

                    database.push({
                        id: sanitizedId,
                        name: name,
                        category: "Fruits",
                        value: valueText || "N/A",
                        demand: "Normal",
                        imageUrl: imgSrc || null,
                        localPath: localRelativePath
                    });
                }
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Парсинг завершен! Найдено элементов: ${database.length}. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ДЕТАЛИ ОШИБКИ:", error);
        process.exit(1);
    }
}

run();
