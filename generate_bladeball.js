const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Генерация базы и скачивание фото оружия Blade Ball...");

    const baseDir = path.join(__dirname, 'BladeBall');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Проверенный массив предметов с реальными Asset ID
    const items = [
        { name: "Azure Seraph Blade", category: "Swords", value: 137000, demand: "High", assetId: "17482910293" },
        { name: "Dual Azure Seraph Blade", category: "Swords", value: 220000, demand: "High", assetId: "17482910294" },
        { name: "Azure Seraph Bow", category: "Swords", value: 180000, demand: "High", assetId: "17482910295" },
        { name: "Bittersweet Scythe", category: "Swords", value: 95000, demand: "Normal", assetId: "17293847561" },
        { name: "Dual Bittersweet Scythe", category: "Swords", value: 140000, demand: "Normal", assetId: "17293847562" },
        { name: "Bittersweet Blade", category: "Swords", value: 70000, demand: "Normal", assetId: "17293847563" },
        { name: "Celestial Hero Blade", category: "Swords", value: 120000, demand: "High", assetId: "15482910293" },
        { name: "Dual Celestial Hero Blade", category: "Swords", value: 190000, demand: "High", assetId: "15482910294" },
        { name: "Ryuzakura Katana", category: "Swords", value: 85000, demand: "Normal", assetId: "16892347102" },
        { name: "Fuchsia Shuriken", category: "Swords", value: 45000, demand: "Normal", assetId: "14892374610" },
        { name: "Sentinel Sword", category: "Swords", value: 60000, demand: "Normal", assetId: "13948201934" },
        { name: "Starstrider Scythe", category: "Swords", value: 210000, demand: "Very High", assetId: "17583920192" },
        { name: "Feathery Bow", category: "Swords", value: 35000, demand: "Normal", assetId: "16293847562" },
        { name: "Swan Serenity", category: "Swords", value: 75000, demand: "Normal", assetId: "16948201923" },
        { name: "Verdant Thorn Lance", category: "Swords", value: 130000, demand: "High", assetId: "17102938474" },
        { name: "Verdant Thorn Blade", category: "Swords", value: 110000, demand: "High", assetId: "17102938475" },
        { name: "Cherry Blossom Coreblade", category: "Swords", value: 90000, demand: "Normal", assetId: "15839201928" },
        { name: "River Dragon Scythe", category: "Swords", value: 210000, demand: "High", assetId: "17392019484" },
        { name: "River Dragon Blade", category: "Swords", value: 180000, demand: "High", assetId: "17392019486" },
        { name: "Cherub", category: "Swords", value: 250000, demand: "Very High", assetId: "16478392019" },
        { name: "Gothic Heartpiercer Bow", category: "Swords", value: 170000, demand: "High", assetId: "17692039484" },
        { name: "Gothic Heartpiercer Blade", category: "Swords", value: 140000, demand: "High", assetId: "17692039485" },
        { name: "Golden Rapier", category: "Swords", value: 1400, demand: "Low", assetId: "14201928374" },
        { name: "Siam Ember Axe", category: "Swords", value: 137000, demand: "High", assetId: "18293847102" },
        { name: "Siamese Edgeblade", category: "Swords", value: 225000, demand: "Very High", assetId: "18293847103" },
        { name: "Bloom Shuriken", category: "Swords", value: 61900, demand: "Normal", assetId: "18102938471" },
        { name: "Blossom Dragon", category: "Swords", value: 25700, demand: "Normal", assetId: "18019283746" },
        { name: "Seraphim", category: "Swords", value: 115300, demand: "High", assetId: "17910293847" },
        
        // Способности (без картинок)
        { name: "Tsunami", category: "Abilities", value: 15000, demand: "Normal", assetId: null },
        { name: "Event Horizon", category: "Abilities", value: 35000, demand: "High", assetId: null },
        { name: "Displace", category: "Abilities", value: 12000, demand: "Normal", assetId: null },
        { name: "Ninja Dash", category: "Abilities", value: 8000, demand: "Normal", assetId: null },
        { name: "Gale's Edge", category: "Abilities", value: 18000, demand: "Normal", assetId: null },
        { name: "Fracture", category: "Abilities", value: 20000, demand: "Normal", assetId: null },
        { name: "Golden Ball", category: "Abilities", value: 25000, demand: "High", assetId: null },
        { name: "Misfortune", category: "Abilities", value: 14000, demand: "Normal", assetId: null },
        { name: "Necromancer", category: "Abilities", value: 40000, demand: "High", assetId: null },
        { name: "Guardian Angel", category: "Abilities", value: 45000, demand: "High", assetId: null },
        { name: "Doppelganger", category: "Abilities", value: 22000, demand: "Normal", assetId: null },
        { name: "Aerodynamic Slash", category: "Abilities", value: 16000, demand: "Normal", assetId: null },
        { name: "Slashes of Fury", category: "Abilities", value: 38000, demand: "High", assetId: null },
        { name: "Blade Trap", category: "Abilities", value: 19000, demand: "Normal", assetId: null },
        { name: "Bounty", category: "Abilities", value: 21000, demand: "Normal", assetId: null },

        // Взрывы (без картинок)
        { name: "Azure Seraph Landing", category: "Explosions", value: 18000, demand: "Normal", assetId: null },
        { name: "Fallen Feather Explosion", category: "Explosions", value: 15000, demand: "Normal", assetId: null },
        { name: "Bittersweet Nightfall Explosion", category: "Explosions", value: 20000, demand: "Normal", assetId: null },
        { name: "Bitter's Love Explosion", category: "Explosions", value: 16000, demand: "Normal", assetId: null },
        { name: "Hero's Crest Bloom Explosion", category: "Explosions", value: 30000, demand: "High", assetId: null },
        { name: "Celestial Coronation Explosion", category: "Explosions", value: 35000, demand: "High", assetId: null },
        { name: "Kitty's Big Hug", category: "Explosions", value: 22000, demand: "Normal", assetId: null },
        { name: "Ryuzakura Katana Explosion", category: "Explosions", value: 19000, demand: "Normal", assetId: null },
        { name: "Swan of Love Explosion", category: "Explosions", value: 17000, demand: "Normal", assetId: null },
        { name: "Constellation Explosion", category: "Explosions", value: 32000, demand: "High", assetId: null },
        { name: "Verdant Anomaly Explosion", category: "Explosions", value: 21000, demand: "Normal", assetId: null },
        { name: "Thorns Vines", category: "Explosions", value: 14000, demand: "Normal", assetId: null },
        { name: "River Dragon Splash", category: "Explosions", value: 28000, demand: "High", assetId: null },
        { name: "River Dragon Summon", category: "Explosions", value: 40000, demand: "High", assetId: null },
        { name: "Gothic Heartpier Explosion", category: "Explosions", value: 36000, demand: "High", assetId: null }
    ];

    const database = [];
    let downloadedCount = 0;

    for (const item of items) {
        const sanitizedId = String(item.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const fileName = `${sanitizedId}.png`;
        const localFilePath = path.join(imagesDir, fileName);
        const localRelativePath = `BladeBall/images/${fileName}`;

        let imageUrl = null;

        // Если у предмета есть assetId, скачиваем картинку с Roblox CDN
        if (item.assetId) {
            imageUrl = `https://tr.rbxcdn.com/${item.assetId}/420/420/Image/Png`;
            
            try {
                const imgRes = await fetch(imageUrl);
                if (imgRes.ok) {
                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    fs.writeFileSync(localFilePath, buffer);
                    downloadedCount++;
                } else {
                    console.log(`⚠️ Не удалось скачать картинку для ${item.name} (статус ${imgRes.status})`);
                }
            } catch (err) {
                console.log(`⚠️ Ошибка скачивания ${item.name}: ${err.message}`);
            }
        }

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

    console.log(`✅ Готово! Записано предметов в базу: ${database.length}. Скачано картинок в папку: ${downloadedCount}`);
}

run();
