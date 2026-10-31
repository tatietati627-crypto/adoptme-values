const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Запуск парсера Blade Ball...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        // Вытягиваем базу данных предметов с открытого API
        const response = await fetch('https://api.bbtslist.com/api/v1/items', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.statusText}`);
        }

        const items = await response.json();
        const database = [];

        for (const item of items) {
            const name = item.name || item.title || "Unknown Item";
            const category = item.category || item.type || "Swords";
            const assetId = item.assetId || item.robloxId || null;
            
            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localRelativePath = `BladeBall/images/${fileName}`;

            // Картинку берём напрямую через официальный CDN Roblox по assetId
            const imageUrl = assetId 
                ? `https://tr.rbxcdn.com/${assetId}/420/420/Image/Png` 
                : (item.image || item.iconUrl || null);

            database.push({
                id: sanitizedId,
                name: name,
                category: category,
                value: item.value || 0,
                demand: item.demand || "Normal",
                assetId: assetId,
                imageUrl: imageUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bladeball_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Готово! Сохранено предметов Blade Ball: ${database.length}`);

    } catch (error) {
        console.error("❌ Ошибка при генерации Blade Ball:", error.message);
        process.exit(1);
    }
}

run();
