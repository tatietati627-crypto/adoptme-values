const https = require('https');

async function check() {
  const url = 'https://rblxvalue.com/api/v1/items?category=godly';
  console.log('Проверяем запрос к:', url);

  const req = https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  }, (res) => {
    console.log('HTTP Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      console.log('Длина ответа:', raw.length);
      console.log('Первые 300 символов:', raw.slice(0, 300));
    });
  });

  req.on('error', (e) => {
    console.error('Ошибка сети:', e.message);
  });
}

check();
