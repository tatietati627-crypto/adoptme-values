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
    console.log("🚀 Melanie Studio | Загрузка базы PS99...");

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
        
        // Универсальный поиск массива с данными питомцев в ответе API
        let rawItems = [];
        if (Array.isArray(json)) {
            rawItems = json;
        } else if (json.data) {
            if (Array.isArray(json.data)) {
                // Если data — это массив категорий, собираем все items из них
                json.data.forEach(group => {
                    if (group.items && Array.isArray(group.items)) {
                        rawItems.push(...group.items);
                    } else {
                        rawItems.push(group);
                    }
                });
            } else if (typeof json.data === 'object') {
                rawItems = Object.values(json.data);
            }
        }

        const database = [];
        let downloadedCount = 0;

        for (const item of rawItems) {
            const config = item.configData || item.config || {};
            const name = config.Name || item.name || item.category || item.text || "Unknown";

            // Пропускаем совсем пустые записи
            if (name === "Unknown" && !item.icon) continue;

            let category = "exotics";
            const lowerName = String(name).toLowerCase();
            if (lowerName.includes("huge")) category = "huge";
            else if (lowerName.includes("titanic")) category = "titanic";
            else if (lowerName.includes("exclusive")) category = "exclusive";

            const rawIcon = config.Icon || item.icon;
            const assetId = rawIcon ? String(rawIcon).replace('rbxassetid://', '') : null;
            const petId = item.id || item.category || Math.random().toString(36).substring(7);
            
            const fileName = `${String(petId).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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

        const dbPath = path.join(__dirname, 'PetSimulator99/ps99_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        console.log(`✅ Успешно! Питомцев в базе: ${database.length}, скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        process.exit(1);
    }
}

run();
