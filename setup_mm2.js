const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const MM2_JSON_PATH = path.join(__dirname, 'mm2_values.json');
const WEAPONS_DIR = path.join(__dirname, 'images', 'weapons');

// Функция безопасного скачивания картинок
function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // Поддержка редиректов
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) return resolve(false);

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
    }).on('error', () => resolve(false));
  });
}

async function run() {
  let browser;
  try {
    if (!fs.existsSync(WEAPONS_DIR)) {
      fs.mkdirSync(WEAPONS_DIR, { recursive: true });
    }

    console.log('🚀 Запуск Chromium для парсинга Supreme Values...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Маскируем User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('🌐 Переходим на Supreme Values (список Godlies/Ancients/Vintages)...');
    await page.goto('https://supremevaluelist.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Ожидаем прогрузки элементов каталога...');
    await new Promise(r => setTimeout(r, 6000));

    console.log('📜 Прокручиваем страницы каталога вниз...');
    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, 1000);
        await new Promise(res => setTimeout(res, 200));
      }
    });

    console.log('📥 Извлекаем оружие, характеристики и прозрачные PNG...');
    const rawItems = await page.evaluate(() => {
      const results = [];
      // Находим карточки предметов на сайте Supreme
      const cards = document.querySelectorAll('div[class*="item"], div[class*="card"], div[class*="weapon"]');

      cards.forEach(card => {
        const img = card.querySelector('img');
        const textElements = Array.from(card.querySelectorAll('p, span, h3, h4, div'))
          .map(el => el.innerText ? el.innerText.trim() : '')
          .filter(t => t.length > 0);

        if (img && textElements.length >= 2) {
          const name = textElements[0];
          
          // Ищем значение стоимости (Value)
          const valStr = textElements.find(t => /^[\d,]+(\.\d+)?$/.test(t.replace(/[^0-9.]/g, '')));
          const val = valStr ? parseFloat(valStr.replace(/,/g, '')) : 0;

          // Ищем показатель спроса / demand (если есть)
          const demandStr = textElements.find(t => /demand|спрос/i.test(t));
          const demandVal = demandStr ? parseInt(demandStr.replace(/[^0-9]/g, '')) : 5;

          const lowerName = name.toLowerCase();
          if (
            val > 0 &&
            !lowerName.includes('ad') &&
            !lowerName.includes('menu') &&
            !lowerName.includes('close') &&
            !lowerName.includes('search')
          ) {
            results.push({
              name: name,
              value: val,
              demand: demandVal || 5,
              imageUrl: img.src
            });
          }
        }
      });

      return results;
    });

    await browser.close();

    console.log(`🎯 Найдено предметов на странице: ${rawItems.length}`);

    // Убираем возможные дубликаты
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const key = item.name.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    const mm2Data = [];
    let idCounter = 1;

    console.log(`📥 Начинаем загрузку идеальных прозрачных PNG и формирование mm2_values.json...`);

    for (const [key, item] of uniqueMap) {
      const safeFileName = item.name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      const localFilePath = path.join(WEAPONS_DIR, safeFileName);

      // Скачиваем прозрачный PNG
      if (item.imageUrl && item.imageUrl.startsWith('http')) {
        await downloadImage(item.imageUrl, localFilePath);
      }

      // Определяем тип (gun, knife или pet)
      let itemType = 'knife';
      const lower = item.name.toLowerCase();
      if (lower.includes('gun') || lower.includes('blaster') || lower.includes('revolver') || lower.includes('luger') || lower.includes('harvester')) {
        itemType = 'gun';
      } else if (lower.includes('pet') || lower.includes('bear') || lower.includes('dog') || lower.includes('cat')) {
        itemType = 'pet';
      }

      // Определяем категорию редкости
      let category = 'godly';
      if (lower.includes('chroma')) category = 'chroma';
      else if (['harvester', 'bat', 'icebreaker', 'swirly gun', 'icepiercer'].some(w => lower.includes(w))) category = 'ancient';
      else if (['ghost', 'shadow', 'blood', 'phaser', 'prince', 'laser', 'cowboy'].some(w => lower.includes(w))) category = 'vintage';

      mm2Data.push({
        id: idCounter++,
        name: item.name,
        type: itemType,
        category: category,
        value: item.value,
        demand: item.demand,
        image: `/images/weapons/${safeFileName}`
      });

      console.log(`✨ [MM2] ${item.name} | Value: ${item.value} | Category: ${category}`);
    }

    fs.writeFileSync(MM2_JSON_PATH, JSON.stringify(mm2Data, null, 2), 'utf8');
    console.log(`\n🎉 ГОТОВО! Сохранено ${mm2Data.length} предметов MM2 в mm2_values.json`);
    console.log(`📁 Все прозрачные иконки скачаны в images/weapons/`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
