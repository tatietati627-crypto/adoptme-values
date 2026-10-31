const fs = require('fs');
const path = require('path');

async function downloadImage(url, filepath) {
    try {
        const response = await fetch(url);
        if (!response.ok) return false;
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filepath, Buffer.from(buffer));
        return true;
    } catch (e) {
        return false;
    }
}

async function run() {
    console.log("🚀 Melanie Studio | Загружаем базу PS99...");

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
        }
    });

    try {
        const response = await fetch('https://biggamesapi.io/api/collection/Pets', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const json = await response.json();
        if (!json || !json.data) {
            throw new Error("Не удалось получить данные от сервера.");
        }

        const database = [];
        let downloadedCount = 0;

        // Проходим по всем категориям и вытаскиваем реальные элементы из items
        const groups = json.data;
        for (const group of groups) {
            const items = group.items || [];
            for (const item of items) {
                const config = item.configData;
                if (!config || !config.Name) continue; // Пропускаем пустые заглушки

                const name = config.Name;
                let category = "exotics";
                const lowerName = name.toLowerCase();
                
                if (lowerName.includes("huge")) category = "huge";
                else if (lowerName.includes("titanic")) category = "titanic";
                else if (lowerName.includes("exclusive")) category = "exclusive";

                const rawIcon = config.Icon;
                const assetId = rawIcon ? String(rawIcon).replace('rbxassetid://', '') : null;
                const petId = item.category || name.replace(/[^a-zA-Z0-9]/g, '_');

                const fileName = `${petId}.png`;
                const localRelativePath = `PetSimulator99/images/${category}/${fileName}`;
                const localFullPath = path.join(__dirname, localRelativePath);

                let imageUrl = null;
                if (assetId) {
                    imageUrl = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png&isCircular=false`;
                    
                    if (!fs.existsSync(localFullPath)) {
                        try {
                            const thumbRes = await fetch(imageUrl);
                            const thumbJson = await thumbRes.json();
                            if (thumbJson && thumbJson.data && thumbJson.data[0] && thumbJson.data[0].imageUrl) {
                                const realImageUri = thumbJson.data[0].imageUrl;
                                const success = await downloadImage(realImageUri, localFullPath);
                                if (success) downloadedCount++;
                            }
                        } catch (err) {}
                    }
                }

                database.push({
                    id: petId,
                    name: name,
                    displayName: config.DisplayName || name,
                    category: category,
                    rarity: config.Rarity ? (config.Rarity.category || config.Rarity) : "Unknown",
                    assetId: assetId,
                    localPath: localRelativePath,
                    imageUrl: imageUrl
                });
            }
        }

        const dbPath = path.join(__dirname, 'PetSimulator99/ps99_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        console.log(`✅ Успешно! Записано нормальных питомцев: ${database.length}, скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        process.exit(1);
    }
}

run();
