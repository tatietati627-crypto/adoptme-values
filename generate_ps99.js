const fs = require('fs');
const path = require('path');

async function run() {
    console.log("🚀 Melanie Studio | Автоматическая генерация базы Pet Simulator 99...");

    const dirs = [
        path.join(__dirname, 'PetSimulator99'),
        path.join(__dirname, 'PetSimulator99/images'),
        path.join(__dirname, 'PetSimulator99/images/huge'),
        path.join(__dirname, 'PetSimulator99/images/titanic'),
        path.join(__dirname, 'PetSimulator99/images/exclusive'),
        path.join(__dirname, 'PetSimulator99/images/exotics')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Создана папка: ${dir}`);
        }
    });

    try {
        const response = await fetch('https://biggamesapi.io/api/collection/Pets', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Статус API: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        const pets = Array.isArray(json) ? json : (json.data || []);

        if (!pets.length) {
            throw new Error(`Массив питомцев пуст. Ответ сервера: ${JSON.stringify(json).slice(0, 150)}`);
        }

        const database = [];

        pets.forEach(item => {
            const config = item.configData || {};
            const name = config.Name || item.category || "Unknown";
            
            let category = "exotics";
            const lowerName = name.toLowerCase();
            if (lowerName.includes("huge")) category = "huge";
            else if (lowerName.includes("titanic")) category = "titanic";
            else if (lowerName.includes("exclusive")) category = "exclusive";

            const assetId = config.Icon ? String(config.Icon).replace('rbxassetid://', '') : null;

            database.push({
                id: item.category || name,
                name: name,
                displayName: config.DisplayName || name,
                category: category,
                rarity: config.Rarity ? (config.Rarity.category || config.Rarity) : "Unknown",
                assetId: assetId,
                imageUrl: assetId ? `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png` : null
            });
        });

        const dbPath = path.join(__dirname, 'PetSimulator99/ps99_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        console.log(`✅ Успешно сохранено питомцев: ${database.length} в PetSimulator99/ps99_database.json`);

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        process.exit(1);
    }
}

run();
