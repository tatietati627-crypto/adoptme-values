const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Загрузка базы и картинок Blox Fruits...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        // Запрос к внутреннему API-маршруту сайта для получения полного списка
        const targetUrl = 'https://bloxfruitsvalues.gg/_next/data/latest/values.json'; 
        console.log(`🌐 Запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json',
                'Referer': 'https://bloxfruitsvalues.gg/values'
            }
        });

        if (!response.ok) {
            throw new Error(`Сервер вернул ошибку: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        const pageProps = json?.pageProps || {};
        const items = pageProps.items || pageProps.values || pageProps.data || [];

        console.log(`📦 Найдено элементов в базе: ${items.length}`);

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
                    const imgRes = await fetch(fullImgUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (imgRes.ok) {
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        fs.writeFileSync(localFilePath, buffer);
                        downloadedCount++;
                    }
                } catch (err) {
                    console.log(`⚠️ Не удалось скачать картинку для: ${name}`);
                }
            }

            database.push({
                id: sanitizedId,
                name: name,
                category: category,
                value: value,
                demand: demand,
                imageUrl: fullImgUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Успешно! Сохранено предметов: ${database.length}. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ОШИБКА ПАРСИНГА:", error.message);
        process.exit(1);
    }
}

run();
