const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Запуск парсера Blox Fruits Values...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        // Запрос к публичному API сайта bloxfruitsvalues.gg
        const targetUrl = 'https://bloxfruitsvalues.gg/api/values'; // Стандартный эндпоинт каталога
        console.log(`🌐 Запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://bloxfruitsvalues.gg/'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || data.data || []);

        console.log(`📦 Получено предметов: ${items.length}`);

        const database = [];
        let downloadedCount = 0;

        for (const item of items) {
            const name = item.name || item.title || "Unknown";
            const category = item.category || item.type || "Fruits";
            const value = item.value || item.price || 0;
            const demand = item.demand || "Normal";
            
            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localFilePath = path.join(imagesDir, fileName);
            const localRelativePath = `BloxFruits/images/${fileName}`;

            // Ссылка на картинку с сайта
            const imageUrl = item.image || item.icon || item.imageUrl || null;

            if (imageUrl) {
                try {
                    const imgRes = await fetch(imageUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (imgRes.ok) {
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        fs.writeFileSync(localFilePath, buffer);
                        downloadedCount++;
                    }
                } catch (err) {
                    console.log(`⚠️ Не удалось скачать картинку для ${name}`);
                }
            }

            database.push({
                id: sanitizedId,
                name: name,
                category: category,
                value: value,
                demand: demand,
                imageUrl: imageUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Готово! Сохранено предметов: ${database.length}. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ОШИБКА:", error.message);
        process.exit(1);
    }
}

run();
