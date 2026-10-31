const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Загрузка полной базы Blade Ball...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '');
    }

    try {
        // Загружаем полный актуальный дамп предметов Blade Ball из открытого репозитория сообщества
        const targetUrl = 'https://raw.githubusercontent.com/BloxDB/BladeBall-Database/main/database.json';
        console.log(`🌐 Запрос к: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'
            }
        });

        console.log(`📡 Статус ответа: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            throw new Error(`Ошибка загрузки дампа: ${response.status} ${response.statusText}`);
        }

        const items = await response.json();
        console.log(`📦 Всего получено предметов из базы: ${Array.isArray(items) ? items.length : 'Не массив'}`);

        const database = [];

        for (const item of (Array.isArray(items) ? items : [])) {
            const name = item.name || item.title || "Unknown Item";
            const category = item.category || item.type || "Swords";
            const assetId = item.assetId || item.id || item.robloxId || null;
            
            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localRelativePath = `BladeBall/images/${fileName}`;

            // Официальная ссылка на иконку через Roblox CDN по Asset ID
            const imageUrl = assetId 
                ? `https://tr.rbxcdn.com/${assetId}/420/420/Image/Png` 
                : (item.image || null);

            database.push({
                id: sanitizedId,
                name: name,
                category: category,
                value: item.value || item.price || 0,
                demand: item.demand || "Normal",
                assetId: assetId,
                imageUrl: imageUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bladeball_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Успешно! Полная база сохранена. Предметов: ${database.length}`);

    } catch (error) {
        console.error("❌ ОШИБКА:", error.message);
        process.exit(1);
    }
}

run();
