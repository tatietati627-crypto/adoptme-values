const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Загрузка базы Blade Ball с GitHub...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '');
    }

    try {
        // Используем стабильный открытый JSON-источник с актуальными данными Blade Ball
        const targetUrl = 'https://raw.githubusercontent.com/StealTheSky/bladeball-values/main/items.json';
        console.log(`🌐 Запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl);
        console.log(`📡 Статус ответа: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            throw new Error(`Не удалось загрузить базу. Статус: ${response.status}`);
        }

        const items = await response.json();
        console.log(`📦 Получено предметов: ${Array.isArray(items) ? items.length : 'Не массив'}`);

        const database = [];

        for (const item of (Array.isArray(items) ? items : [])) {
            const name = item.name || item.title || "Unknown Item";
            const category = item.category || item.type || "Swords";
            const assetId = item.assetId || item.id || null;
            
            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localRelativePath = `BladeBall/images/${fileName}`;

            // Картинку подтягиваем через стандартный CDN Роблокса по ID
            const imageUrl = assetId 
                ? `https://tr.rbxcdn.com/${assetId}/420/420/Image/Png` 
                : (item.image || null);

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

        console.log(`✅ Успешно! Сохранено предметов в базу: ${database.length}`);

    } catch (error) {
        console.error("❌ ОШИБКА:", error.message);
        process.exit(1);
    }
}

run();
