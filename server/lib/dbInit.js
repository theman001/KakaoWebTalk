const oracledb = require('oracledb');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

async function initializeDatabase() {
    let connection;
    try {
        // 1. 설정 파일 로드 (경로를 절대 경로로 명확히 함)
        const configPath = path.resolve(__dirname, '../../config.yaml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

        // 2. Wallet 경로를 절대 경로로 변환
        const walletPath = path.resolve(config.database.walletPath);
        
        console.log(`[DB] Wallet 경로 확인: ${walletPath}`);
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet 경로가 존재하지 않습니다: ${walletPath}`);
        }

        console.log("[DB] Oracle Thin 모드 접속 시도 중...");

        // 3. 커넥션 맺기 
        // Thin 모드에서 Wallet을 인식시키는 가장 확실한 방법입니다.
        connection = await oracledb.getConnection({
            user: config.database.user,
            password: config.database.password,
            connectString: config.database.connectString,
            // Thin 모드에서는 아래 속성으로 Wallet(tnsnames.ora) 위치를 찾습니다.
            walletLocation: walletPath
        });

        console.log("[DB] 연결 성공.");

        // ... (테이블 생성 로직 생략)
        console.log("[DB] 데이터베이스 초기화 완료.");

    } catch (err) {
        console.error("[DB] 초기화 에러 상세:", err);
        throw err;
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
}

module.exports = initializeDatabase;
