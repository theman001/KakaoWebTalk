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
    console.log("웹 서버 시작 시도 중 (Port 80)...");

    // DB 초기화를 비동기로 실행하거나, 에러 처리를 해서 웹 서버 구동을 방해하지 않게 함
    initializeDatabase()
        .then(() => console.log("[성공] DB 연결 및 테이블 확인 완료"))
        .catch(err => console.error("[실패] DB 초기화 중 에러 발생:", err));

    // DB 연결 여부와 상관없이 웹 서버는 즉시 실행
    http.listen(80, '0.0.0.0', () => {
        console.log(">>> 웹 서버가 80번 포트에서 가동되었습니다!");
    });
}

startServer();
