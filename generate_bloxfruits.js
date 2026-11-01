const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function run() {
    console.log("🚀 Melanie Studio | Запуск Puppeteer для обхода Cloudflare...");

    const baseDir = path.join(__dirname, 'BloxFruits');
    const imagesDir = path.join(baseDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Запускаем виртуальный браузер
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        // Подменяем User-Agent на реальный iPad Safari
        await page.setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

        console.log("🌐 Открываем bloxfruitsvalues.gg/values...");
        await page.goto('https://bloxfruitsvalues.gg/values', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Ждем разгадки Cloudflare и появления элемента данных
        await page.waitForSelector('#__NEXT_DATA__', { timeout: 30000 });

        console.log("🔓 Защита пройдена! Извлекаем JSON-данные...");

        // Достаем JSON прямо из памяти загруженной страницы
        const nextDataRaw = await page.$eval('#__NEXT_DATA__', el => el.textContent);
        const nextData = JSON.parse(nextDataRaw);

        const pageProps = nextData?.props?.pageProps || {};
        const items = pageProps.items || pageProps.values || pageProps.initialData || [];

        console.log(`📦 Найдено реальных предметов на сайте: ${items.length}`);

        const database = [];
        let downloadedCount = 0;

        for (const item of items) {
            const name = item.name || item.title || "Unknown";
            const category = item.category || item.type || "Fruits";
            const value = item.value || item.price || 0;
            const demand = item.demand || "Normal";
            const imgPath = item.image || item.icon || item.imageUrl || null;

            const sanitizedId = String(name).toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${sanitizedId}.png`;
            const localFilePath = path.join(imagesDir, fileName);
            const localRelativePath = `BloxFruits/images/${fileName}`;

            let fullImgUrl = null;
            if (imgPath) {
                fullImgUrl = imgPath.startsWith('http') ? imgPath : `https://bloxfruitsvalues.gg${imgPath}`;
                
                try {
                    // Скачиваем картинку прямо через контекст браузера (с его куками и заголовками)
                    const imageBuffer = await page.evaluate(async (url) => {
                        const res = await fetch(url);
                        const buffer = await res.arrayBuffer();
                        return Array.from(new Uint8Array(buffer));
                    }, fullImgUrl);

                    fs.writeFileSync(localFilePath, Buffer.from(imageBuffer));
                    downloadedCount++;
                } catch (e) {
                    console.log(`⚠️ Не удалось скачать картинку для ${name}`);
                }
            }

            database.push({
                id: sanitizedId,
                name,
                category,
                value,
                demand,
                imageUrl: fullImgUrl,
                localPath: localRelativePath
            });
        }

        const dbPath = path.join(baseDir, 'bloxfruits_database.json');
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

        console.log(`✅ Парсинг успешно завершен! Сохранено: ${database.length} предметов. Скачано картинок: ${downloadedCount}`);

    } catch (error) {
        console.error("❌ ОШИБКА ПАРСИНГА:", error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

run();
