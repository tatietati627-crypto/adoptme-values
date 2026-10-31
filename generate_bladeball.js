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
        const targetUrl = 'https://api.bbtslist.com/api/v1/items';
        console.log(`🌐 Делаем запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://bbtslist.com/'
            }
        });

        console.log(`📡 Статус ответа: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Сервер вернул ошибку ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const items = await response.json();
        console.log(`📦 Получено сырых элементов из API: ${Array.isArray(items) ? items.length : 'Не массив'}`);

        const database = [];

        for (const item of (Array.isArray(items) ? items : [])) {
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

        console.log(`✅ Успешно! Сохранено предметов Blade Ball: ${database.length}`);

    } catch (error) {
        // Выводим развернутый стек ошибки в лог GitHub Actions
        console.error("❌ ДЕТАЛИ ОШИБКИ:", error);
        process.exit(1);
    }
}

run();
