const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Автопоиск эндпоинта и парсинг Blox Fruits...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        const mainUrl = 'https://bloxfruitsvalues.gg/values';
        console.log(`🌐 Загружаем главную страницу: ${mainUrl}`);

        const mainRes = await fetch(mainUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        if (!mainRes.ok) throw new Error(`Не удалось открыть сайт: ${mainRes.status}`);
        const html = await mainRes.text();

        // Ищем уникальный buildId, который использует Next.js на сайте
        const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
        if (!buildIdMatch) {
            throw new Error("Не удалось найти buildId сайта");
        }

        const buildId = buildIdMatch[1];
        console.log(`🔑 Найден buildId: ${buildId}`);

        // Формируем правильный динамический JSON-путь Next.js
        const dataUrl = `https://bloxfruitsvalues.gg/_next/data/${buildId}/values.json`;
        console.log(`🌐 Запрос к реальному API: ${dataUrl}`);

        const dataRes = await fetch(dataUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        if (!dataRes.ok) {
            throw new Error(`Ошибка API: ${dataRes.status} ${dataRes.statusText}`);
        }

        const json = await dataRes.json();
        const pageProps = json?.pageProps || {};
        const items = pageProps.items || pageProps.values || pageProps.data || [];

        console.log(`📦 Найдено элементов: ${items.length}`);

        const database = [];
        let downloadedCount = 0;

        for (const item of items) {
            const name = item.name || item.title || "Unknown";
            const category = item.category || item.type || "Fruits";
            const value = item.value || item.price || 0;
            const demand = item.demand || "Normal";
            const imgPath = item.image || item.icon || item.imageUrl || null;

            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localFilePath = path.join(imagesDir, fileName);
            const localRelativePath = `BloxFruits/images/${fileName}`;

            let fullImgUrl = null;
            if (imgPath) {
                fullImgUrl = imgPath.startsWith('http') ? imgPath : `https://bloxfruitsvalues.gg${imgPath}`;
                
                try {
                    const imgRes = await fetch(fullImgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (imgRes.ok) {
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        fs.writeFileSync(localFilePath, buffer);
                        downloadedCount++;
                    }
                } catch (e) {
                    console.log(`⚠️ Не удалось скачать картинку для ${name}`);
                }
            }

            database.push({
                id: sanitizedId,
                name,
                category,
                value,
                demand,
                imageUrl: fullImgUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Успешно! Сохранено предметов: ${database.length}. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ОШИБКА:", error.message);
        process.exit(1);
    }
}

run();
