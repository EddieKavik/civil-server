const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = path.join(os.homedir(), '.config', 'civil-server.json');
let port = 4567; // default

try {
    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        port = parseInt(config.port) || 4567;
    }
} catch (error) {
    console.log('Using default port 4567 due to config error:', error.message);
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Civil Server Test</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    background: #2c3e50; 
                    color: white; 
                    text-align: center; 
                    padding: 50px;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #34495e;
                    padding: 30px;
                    border-radius: 10px;
                }
                h1 { color: #3498db; }
                .status { 
                    background: #27ae60; 
                    padding: 10px; 
                    border-radius: 5px; 
                    margin: 20px 0;
                }
                .port-info {
                    background: #e74c3c;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Civil Server Test Page</h1>
                <div class="status">Server is running!</div>
                <div class="port-info">Serving on port ${port}</div>
                <p>If you see this page, the Civil Server started successfully.</p>
            </div>
        </body>
        </html>
    `);
});

server.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}/`);
});
