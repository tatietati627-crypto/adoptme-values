const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Генерация локальной базы Blade Ball...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '');
    }

    // Базовый актуальный список предметов Blade Ball со стандартными Asset ID и иконками
    const items = [
        { name: "Azure Seraph Blade", category: "Swords", assetId: "16584321098", value: 150000, demand: "High" },
        { name: "Bittersweet Scythe", category: "Swords", assetId: "17293847561", value: 95000, demand: "Normal" },
        { name: "Celestial Hero Blade", category: "Swords", assetId: "15482910293", value: 120000, demand: "High" },
        { name: "Ryuzakura Katana", category: "Swords", assetId: "16892347102", value: 85000, demand: "Normal" },
        { name: "Fuchsia Shuriken", category: "Swords", assetId: "14892374610", value: 45000, demand: "Normal" },
        { name: "Sentinel Sword", category: "Swords", assetId: "13948201934", value: 60000, demand: "Normal" },
        { name: "Starstrider Scythe", category: "Swords", assetId: "17583920192", value: 210000, demand: "Very High" },
        { name: "Feathery Bow", category: "Swords", assetId: "16293847562", value: 35000, demand: "Normal" },
        { name: "Swan Serenity", category: "Swords", assetId: "16948201923", value: 75000, demand: "Normal" },
        { name: "Verdant Thorn Blade", category: "Swords", assetId: "17102938475", value: 110000, demand: "High" },
        { name: "Cherry Blossom Coreblade", category: "Swords", assetId: "15839201928", value: 90000, demand: "Normal" },
        { name: "River Dragon Blade", category: "Swords", assetId: "17392019485", value: 180000, demand: "High" },
        { name: "Cherub", category: "Swords", assetId: "16478392019", value: 250000, demand: "Very High" },
        { name: "Gothic Heartpiercer Blade", category: "Swords", assetId: "17692039485", value: 140000, demand: "High" }
    ];

    const database = [];

    for (const item of items) {
        const sanitizedId = String(item.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const fileName = `${sanitizedId}.png`;
        const localRelativePath = `BladeBall/images/${fileName}`;

        // Ссылка на официальный CDN Roblox для картинок
        const imageUrl = item.assetId 
            ? `https://tr.rbxcdn.com/${item.assetId}/420/420/Image/Png` 
            : null;

        database.push({
            id: sanitizedId,
            name: item.name,
            category: item.category,
            value: item.value,
            demand: item.demand,
            assetId: item.assetId,
            imageUrl: imageUrl,
            localPath: localRelativePath
        });
    }

    const dbPath = path.join(baseDir, 'bladeball_database.json');
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

    console.log(`✅ Успешно сгенерировано предметов Blade Ball: ${database.length}`);
}

run();
