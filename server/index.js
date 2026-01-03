const http = require("http");
const express = require("express");
const KakaoGateway = require("./lib/gateway");
const initializeDatabase = require("./lib/dbInit");
const fs = require("fs");
const yaml = require("js-yaml");

// 설정 로드
const config = yaml.load(fs.readFileSync("../config.yaml", "utf8"));

const app = express();
const server = http.createServer(app);

// 정적 파일 서빙
app.use(express.static("../public"));

async function startServer() {
    // 1. DB 초기화 (테이블 생성 등)
    const db = await initializeDatabase(config);
    
    // 2. Socket.io 게이트웨이 시작
    new KakaoGateway(server, db, config);

    // 3. 포트 리스닝
    const PORT = config.server.port || 80;
    server.listen(PORT, () => {
        console.log(`KakaoWebTalk server running on port ${PORT}`);
    });
}

startServer();
