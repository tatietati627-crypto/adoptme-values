const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Запуск парсера Blade Ball...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '');
    }

    try {
        // Делаем запрос с полноценными заголовками браузера, чтобы обходить защиту
        const response = await fetch('https://api.bbtslist.com/api/v1/items', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://bbtslist.com/'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
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
