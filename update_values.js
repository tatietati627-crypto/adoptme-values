const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const LOCAL_JSON_PATH = path.join(__dirname, 'adoptme_values.json');

async function run() {
  let browser;
  try {
    console.log('🔄 Читаем adoptme_values.json...');
    const raw = fs.readFileSync(LOCAL_JSON_PATH, 'utf8');
    let localData = JSON.parse(raw);

    // Удаляем любые следы рекламы, если они остались
    localData = localData.filter(i => i.name && !i.name.includes('Playwire') && !i.name.includes('Audience'));

    console.log('🚀 Запускаем Chromium...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('🌐 Переходим на elvebredd.com/adopt-me-calculator...');
    await page.goto('https://elvebredd.com/adopt-me-calculator', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Ждем загрузки интерфейса...');
    await new Promise(r => setTimeout(r, 7000));

    console.log('🔍 Извлекаем объекты питомцев из JS-контекста страницы...');
    const extracted = await page.evaluate(() => {
      // Ищем данные в глобальных переменных сборщика сайта
      const keys = Object.keys(window);
      for (const k of keys) {
        try {
          const val = window[k];
          if (Array.isArray(val) && val.length > 50 && val[0].name && (val[0].rarity || val[0].value)) {
            return val;
          }
        } catch (e) {}
      }

      // Если в window нет, ищем карточки в HTML
      const results = [];
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        // Ищем блоки, у которых есть имя и ценность
        const text = el.innerText || '';
        if (el.children.length === 0 && text.length > 1 && text.length < 30) {
          // Базовый сбор
        }
      }
      return null;
    });

    await browser.close();

    if (!extracted || extracted.length === 0) {
      console.log('⚠️ Данные через прямой JS не отдались, сайт защищен сборщиком.');
      console.log('Сохраняем очищенный файл.');
      fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(localData, null, 2), 'utf8');
      return;
    }

    console.log(`🎯 Найдено настоящих питомцев: ${extracted.length}`);

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

run();
