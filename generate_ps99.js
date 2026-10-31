const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
    console.log("🚀 Melanie Studio | Клонирование иконки и генерация базы PS99...");

    const baseDir = path.join(__dirname, 'PetSimulator99');
    const imagesDir = path.join(baseDir, 'images');
    
    // Создаем базовые директории
    ['huge', 'titanic', 'exclusive', 'exotics'].forEach(cat => {
        const d = path.join(imagesDir, cat);
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, '.gitkeep'), '');
    });

    try {
        // 1. Скачиваем официальные иконки напрямую через git sparse-checkout из их репозитория
        const tempRepoDir = path.join(__dirname, 'temp_api_docs');
        if (fs.existsSync(tempRepoDir)) {
            fs.rmSync(tempRepoDir, { recursive: true, force: true });
        }

        console.log("📥 Загружаем официальные иконки с GitHub...");
        execSync(`git clone --depth 1 --filter=blob:none --sparse https://github.com/BIG-Games-LLC/ps99-public-api-docs.git "${tempRepoDir}"`, { stdio: 'ignore' });
        execSync(`git -C "${tempRepoDir}" sparse-checkout set "Pet Icons"`, { stdio: 'ignore' });

        const iconsSourcePath = path.join(tempRepoDir, 'Pet Icons');

        // 2. Запрашиваем JSON с данными питомцев
        console.log("📊 Загружаем данные API питомцев...");
        const response = await fetch('https://biggamesapi.io/api/collection/Pets', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        const json = await response.json();
        const rawItems = json.data || [];

        const database = [];
        let copiedCount = 0;

        // Рекурсивная функция для поиска файла иконки в папках docs
        function findIconFile(dir, filename) {
            if (!fs.existsSync(dir)) return null;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const found = findIconFile(fullPath, filename);
                    if (found) return found;
                } else if (entry.name.toLowerCase() === filename.toLowerCase()) {
                    return fullPath;
                }
            }
            return null;
        }

        for (const item of rawItems) {
            const config = item.configData || {};
            const name = config.Name || item.configName || "Unknown";

            let category = "exotics";
            const lowerName = String(name).toLowerCase();
            const lowerCat = String(item.category || "").toLowerCase();

            if (lowerName.includes("huge") || lowerCat.includes("huge")) category = "huge";
            else if (lowerName.includes("titanic") || lowerCat.includes("titanic")) category = "titanic";
            else if (lowerName.includes("exclusive") || lowerCat.includes("exclusive")) category = "exclusive";

            const petId = item.configName || item.category || name.replace(/[^a-zA-Z0-9]/g, '_');
            const sanitizedPetId = String(petId).replace(/[^a-zA-Z0-9]/g, '_');
            
            const fileNamePng = `${sanitizedPetId}.png`;
            const localRelativePath = `PetSimulator99/images/${category}/${fileNamePng}`;
            const localFullPath = path.join(__dirname, localRelativePath);

            // Ищем соответствующую иконку в скачанной документации по имени или ID
            let foundSourceIcon = null;
            if (fs.existsSync(iconsSourcePath)) {
                // Пробуем искать по точному имени файла или ID
                foundSourceIcon = findIconFile(iconsSourcePath, `${name}.png`) || 
                                  findIconFile(iconsSourcePath, `${petId}.png`);
            }

            if (foundSourceIcon && fs.existsSync(foundSourceIcon)) {
                fs.copyFileSync(foundSourceIcon, localFullPath);
                copiedCount++;
            }

            database.push({
                id: petId,
                name: name,
                displayName: config.DisplayName || name,
                category: category,
                rarity: config.Rarity ? (config.Rarity.category || config.Rarity) : "Unknown",
                localPath: localRelativePath
            });
        }

        // Очищаем временную папку с репозиторием
        if (fs.existsSync(tempRepoDir)) {
            fs.rmSync(tempRepoDir, { recursive: true, force: true });
        }

        const dbPath = path.join(baseDir, 'ps99_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        
        console.log(`✅ Готово! Записано питомцев: ${database.length}, скопировано иконок из репозитория: ${copiedCount}`);

    } catch (error) {
        console.error("❌ Критическая ошибка:", error.message);
        process.exit(1);
    }
}

run();
