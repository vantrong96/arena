const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const fs = require('fs');
const { unescape } = require('querystring');
const path = require('path');

async function main() {
    const inputFile = path.join(__dirname, 'api.txt'); // Tên tệp văn bản chứa dữ liệu
    const outputFile = path.join(__dirname, 'data.txt'); // Tệp để ghi kết quả

    try {
        // Đọc nội dung tệp văn bản
        const fileContent = fs.readFileSync(inputFile, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== ''); // Loại bỏ dòng trống

        // Duyệt qua từng dòng
        const results = [];
        for (const line of lines) {
            const [apiId, apiHash, sessionFilePath] = line.split('|').map(value => value.trim());
            if (apiId && apiHash && sessionFilePath) {
                try {
                    const absolutePath = path.resolve(sessionFilePath);
                    const queryId = await getQueryId(Number(apiId), apiHash, absolutePath);
                    console.log(`Query ID đã lấy được cho API ID ${apiId}: ${queryId}`);
                    results.push(encodeURI(`${queryId}`));
                } catch (error) {
                    console.error(`Lỗi khi lấy query ID cho API ID ${apiId}: ${error.message}`);
                    results.push(`API ID: ${apiId}, Lỗi: ${error.message}`);
                }
            } else {
                console.error(`Dòng không hợp lệ: ${line}`);
            }
        }

        // Ghi kết quả vào tệp
        fs.writeFileSync(outputFile, results.join('\n'));
        console.log(`Kết quả đã được ghi vào tệp: ${outputFile}`);
    } catch (error) {
        console.error(`Đã xảy ra lỗi: ${error.message}`);
    }
}
async function getQueryId(apiId, apiHash, sessionFilePath) {
    const sessionString = fs.readFileSync(sessionFilePath, 'utf-8');
    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
        connectionRetries: 5,
        logLevel: 'none',
        useWSS: true
    });

    try {
        await client.connect();
        
        const webViewResult = await client.invoke(
            new Api.messages.RequestWebView({
                peer: await client.getInputEntity('Arenavsbot'),
                bot: await client.getInputEntity('Arenavsbot'),
                platform: 'android',
                fromBotMenu: false,
                url: 'https://bot-coin.arenavs.com',
            })
        );
        
        const authUrl = webViewResult.url;
        const tgWebAppData = unescape(
            unescape(
                authUrl.split('tgWebAppData=')[1].split('&tgWebAppVersion')[0]
            )
        );
        console.log(`[*] Đã lấy được query_id: ${tgWebAppData}`);
        return tgWebAppData;
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    } finally {
        await client.disconnect();
        await client.destroy();
        console.log("[*] Đã ngắt kết nối telegram!");
    }
}

module.exports = {
    getQueryId
};

main();
