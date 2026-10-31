const fs = require('fs');
const path = require('path');

// Функция для скачивания картинок с обработкой ошибок
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
    console.log("🚀 Melanie Studio | Запуск полного парсера базы PS99...");

    // Создаем необходимые директории
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
        // Делаем запрос к официальному эндпоинту коллекций питомцев
        const response = await fetch('https://biggamesapi.io/api/collection/Pets', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        if (json.status !== "ok" || !json.data) {
            throw new Error("API вернул ошибку или неверную структуру данных.");
        }

        const database = [];
        let downloadedCount = 0;

        // Согласно документации API, данные разбиты по группам в массиве data
        const groups = Array.isArray(json.data) ? json.data : [json.data];

        for (const group of groups) {
            const items = group.items || [];
            
            for (const item of items) {
                const config = item.configData;
                // Пропускаем записи без конфига или имени, чтобы избежать пустышек
                if (!config || !config.Name) continue;

                const name = config.Name;
                const categoryRaw = (item.category || "").toLowerCase();

                // Распределяем по категориям в соответствии с требованиями
                let category = "exotics";
                const lowerName = name.toLowerCase();
                if (lowerName.includes("huge") || categoryRaw.includes("huge")) {
                    category = "huge";
                } else if (lowerName.includes("titanic") || categoryRaw.includes("titanic")) {
                    category = "titanic";
                } else if (lowerName.includes("exclusive") || categoryRaw.includes("exclusive")) {
                    category = "exclusive";
                }

                // Извлекаем Asset ID иконки из конфига
                const rawIcon = config.Icon;
                const assetId = rawIcon ? String(rawIcon).replace('rbxassetid://', '') : null;
                const petId = item.category || name.replace(/[^a-zA-Z0-9]/g, '_');

                const fileName = `${petId}.png`;
                const localRelativePath = `PetSimulator99/images/${category}/${fileName}`;
                const localFullPath = path.join(__dirname, localRelativePath);

                let imageUrl = null;
                if (assetId) {
                    imageUrl = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png&isCircular=false`;
                    
                    // Скачиваем картинку локально, если её ещё нет
                    if (!fs.existsSync(localFullPath)) {
                        try {
                            const thumbRes = await fetch(imageUrl);
                            const thumbJson = await thumbRes.json();
                            if (thumbJson && thumbJson.data && thumbJson.data[0] && thumbJson.data[0].imageUrl) {
                                const realImageUri = thumbJson.data[0].imageUrl;
                                const success = await downloadImage(realImageUri, localFullPath);
                                if (success) downloadedCount++;
                            }
                        } catch (err) {
                            // Ошибку сети при скачивании конкретной иконки пропускаем, чтобы не ронять весь процесс
                        }
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

        // Записываем итоговую базу данных в JSON
        const dbPath = path.join(__dirname, 'PetSimulator99/ps99_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        
        console.log(`✅ Успешно сгенерировано! Питомцев в базе: ${database.length}, скачано новых картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ Критическая ошибка парсинга:", error.message);
        process.exit(1);
    }
}

run();
