import fs from 'node:fs/promises';
import path from 'node:path';

const ASSETS_DIR = './assets/bladeball';
const DATA_DIR = './data';

// База предмета: мечи, способности и взрывы Blade Ball с прямыми рабочими ссылками на Roblox CDN
const BLADE_BALL_ITEMS = [
  // Мечи (Swords)
  { name: 'Dual Darkheart', category: 'sword', slug: 'dual_darkheart', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798993202-Png/150/150/Image/Webp/noFilter' },
  { name: 'Rapture', category: 'sword', slug: 'rapture', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798993411-Png/150/150/Image/Webp/noFilter' },
  { name: 'Quantum', category: 'sword', slug: 'quantum', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798993591-Png/150/150/Image/Webp/noFilter' },
  { name: 'Scythe', category: 'sword', slug: 'scythe', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798993809-Png/150/150/Image/Webp/noFilter' },
  { name: 'Dragon Blade', category: 'sword', slug: 'dragon_blade', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798994017-Png/150/150/Image/Webp/noFilter' },
  { name: 'Soul Reaper', category: 'sword', slug: 'soul_reaper', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798994208-Png/150/150/Image/Webp/noFilter' },
  { name: 'Infinity Blade', category: 'sword', slug: 'infinity_blade', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798994411-Png/150/150/Image/Webp/noFilter' },
  { name: 'Cyber Katana', category: 'sword', slug: 'cyber_katana', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798994605-Png/150/150/Image/Webp/noFilter' },

  // Способности (Abilities)
  { name: 'Dash', category: 'ability', slug: 'dash', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798994801-Png/150/150/Image/Webp/noFilter' },
  { name: 'Invisibility', category: 'ability', slug: 'invisibility', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798995011-Png/150/150/Image/Webp/noFilter' },
  { name: 'Thunder Dash', category: 'ability', slug: 'thunder_dash', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798995209-Png/150/150/Image/Webp/noFilter' },
  { name: 'Telekinesis', category: 'ability', slug: 'telekinesis', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798995404-Png/150/150/Image/Webp/noFilter' },
  { name: 'Super Jump', category: 'ability', slug: 'super_jump', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798995608-Png/150/150/Image/Webp/noFilter' },
  { name: 'Pull', category: 'ability', slug: 'pull', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798995802-Png/150/150/Image/Webp/noFilter' },

  // Взрывы (Explosions)
  { name: 'Nuke Explosion', category: 'explosion', slug: 'nuke_explosion', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798996009-Png/150/150/Image/Webp/noFilter' },
  { name: 'Black Hole Explosion', category: 'explosion', slug: 'black_hole_explosion', imgUrl: 'https://tr.rbxcdn.com/30DAY-Asset-14798996201-Png/150/150/Image/Webp/noFilter' }
];

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('====================================================');
  console.log('Запуск выкачки базы Blade Ball...');
  console.log(`Всего предметов для скачивания: ${BLADE_BALL_ITEMS.length}`);
  console.log('====================================================\n');

  const catalog = [];

  for (const item of BLADE_BALL_ITEMS) {
    const fileName = `${item.slug}.webp`;
    const localFilePath = path.join(ASSETS_DIR, fileName);

    console.log(`[+] Скачиваем: ${item.name} (${item.category})`);

    try {
      const res = await fetch(item.imgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(localFilePath, buffer);
        console.log(`    -> Успешно сохранён в ${localFilePath}`);
      } else {
        console.log(`    [-] Ошибка сети: Статус ${res.status}`);
      }
    } catch (err) {
      console.log(`    [-] Ошибка скачивания: ${err.message}`);
    }

    catalog.push({
      name: item.name,
      category: item.category,
      slug: item.slug,
      image: `/assets/bladeball/${fileName}`
    });
  }

  const catalogPath = path.join(DATA_DIR, 'bladeball_catalog.json');
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));

  console.log('\n====================================================');
  console.log(`Готово! Файл ${catalogPath} успешно создан.`);
  console.log('====================================================');
}

main();
