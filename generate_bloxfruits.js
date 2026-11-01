const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Загрузка базы Blox Fruits из открытого источника...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '');
    }

    try {
        // Надежный открытый эндпоинт с полным каталогом Blox Fruits
        const targetUrl = 'https://raw.githubusercontent.com/BloxDB/BloxFruits-Database/main/fruits.json';
        console.log(`🌐 Запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
        }

        const items = await response.json();
        console.log(`📦 Получено предметов: ${Array.isArray(items) ? items.length : 0}`);

        const database = [];
        let downloadedCount = 0;

        for (const item of (Array.isArray(items) ? items : [])) {
            const name = item.name || item.title || "Unknown";
            const category = item.category || item.type || "Fruits";
            const value = item.value || item.price || 0;
            const demand = item.demand || "Normal";
            const imgUrl = item.image || item.icon || null;

            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localFilePath = path.join(imagesDir, fileName);
            const localRelativePath = `BloxFruits/images/${fileName}`;

            if (imgUrl) {
                try {
                    const imgRes = await fetch(imgUrl);
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
                imageUrl: imgUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Успешно! Сохранено элементов: ${database.length}. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ОШИБКА:", error.message);
        process.exit(1);
    }
}

run();
