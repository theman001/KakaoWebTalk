const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function initializeDatabase() {
    let connection;
    try {
        const configPath = path.resolve(__dirname, '../../config.yaml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const dbConfig = config.database;
        const walletAbsPath = path.resolve(dbConfig.walletPath);

        // 1. [핵심] Thick 모드 활성화 (시스템 라이브러리 사용)
        // Oracle Instant Client가 설치된 경로를 지정합니다.
        // 보통 /usr/lib/oracle/... 또는 /opt/oracle/... 에 위치합니다.
        try {
            oracledb.initOracleClient(); 
            console.log("[DB] Thick Mode 활성화 완료 (System Library 사용)");
        } catch (err) {
            // 이미 초기화된 경우 에러가 날 수 있으므로 무시하거나 로그만 남김
        }

        console.log("=========================================");
        console.log("[DB] 스크립트 검증 기반 접속 시도");
        console.log(` > USER: ${dbConfig.user}`);
        console.log(` > TNS: ${dbConfig.connectString}`);
        console.log(` > WALLET: ${walletAbsPath}`);
        console.log("=========================================");

        // 2. 접속 시도 (Thin 모드 파라미터 대신 TNS_ADMIN 환경변수 스타일 활용)
        connection = await oracledb.getConnection({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString
            // Thick 모드에서는 환경 변수나 sqlnet.ora를 우선하므로 
            // 복잡한 wallet 파라미터를 최소화합니다.
        });

        console.log(" ✅ [DB] Oracle Database 연결 성공!");

        // 테이블 생성 로직 (생략 - 기존과 동일)
        return connection;

    } catch (err) {
        console.error("\n❌ [DB 접속 에러]");
        console.error(`메시지: ${err.message}`);
        throw err;
    }
}

module.exports = initializeDatabase;
