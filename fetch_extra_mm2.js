  // --- 1. ВЫГРУЗКА SETS С ИХ ЦЕЛЬНЫМИ КАРТИНКАМИ ---
  console.log('📦 1. Загружаем MM2 СЕТЫ и их оригинальные арты...');
  const setsData = await fetchApi('sets');
  const setsList = setsData?.sets || setsData?.items || setsData || [];
  const processedSets = [];

  console.log(`Найдено сетов: ${Array.isArray(setsList) ? setsList.length : 0}`);

  if (Array.isArray(setsList)) {
    for (const set of setsList) {
      const slug = set.slug || set.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const imgName = `${slug}.png`;
      const imgPath = path.join(SETS_IMG_DIR, imgName);

      // Запрашиваем детали сета по слагу, чтобы забрать точный URL готового арта
      const setDetail = await fetchApi(`sets/${encodeURIComponent(slug)}`);
      const setObj = setDetail?.set || setDetail || set;

      // Возможные поля, где лежит прямая ссылка на скомпонованную картинку
      let setImgUrl = setObj.image_url || setObj.imageUrl || setObj.image || set.image_url;

      // Если в JSON прямая ссылка не пришла, берём с их официального CDN сетов
      if (!setImgUrl) {
        setImgUrl = `https://cdn.un6107617.dev/rblxvalue/sets/${slug}.webp`;
      }

      let downloaded = false;
      if (setImgUrl) {
        downloaded = await downloadFile(setImgUrl, imgPath);
        // Если webp не подошёл, пробуем png
        if (!downloaded && setImgUrl.includes('.webp')) {
          downloaded = await downloadFile(setImgUrl.replace('.webp', '.png'), imgPath);
        }
      }

      processedSets.push({
        name: set.name,
        slug: slug,
        total_value: setObj.total_value || setObj.value || set.value || 0,
        demand: setObj.demand || set.demand || 'High Demand',
        items: setObj.items || set.items || [],
        image: downloaded ? `/images/sets/${imgName}` : `/images/sets/${slug}.png`
      });

      console.log(`✨ [СЕТ] ${set.name} -> ${downloaded ? '✅ Арт скачан' : '⚠️ Ссылка: ' + setImgUrl}`);
      await new Promise(r => setTimeout(r, 80));
    }

    fs.writeFileSync(SETS_JSON_PATH, JSON.stringify(processedSets, null, 2), 'utf8');
    console.log(`🎉 Сохранено сетов в mm2_sets.json: ${processedSets.length}`);
  }
