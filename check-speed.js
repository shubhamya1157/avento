const http = require('http');

async function fetchVehicles() {
    return new Promise((resolve) => {
        const start = Date.now();
        http.get('http://localhost:3000/api/vehicles', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve(Date.now() - start);
            });
        }).on('error', (err) => {
            resolve(-1);
        });
    });
}

async function run() {
    console.log("Checking api response times...");
    for (let i = 0; i < 5; i++) {
        const ms = await fetchVehicles();
        console.log(`Request ${i + 1}: ${ms} ms`);
    }
}

run();
