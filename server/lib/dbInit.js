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

        console.log(`[DB] 연결 시도 중... (Wallet: ${walletAbsPath})`);

        connection = await oracledb.getConnection({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            configDir: walletAbsPath,
            walletLocation: walletAbsPath,
            walletPassword: "" // SSO 지갑 해독을 위한 빈 문자열
        });

        console.log("[DB] Oracle Database 연결 성공.");
        
        // 테이블 생성 쿼리 로직 (생략 - 기존과 동일)
        // ...

        return connection;

    } catch (err) {
        console.error("[DB] 초기화 에러 상세:");
        console.error(` > 코드: ${err.code}`);
        console.error(` > 메시지: ${err.message}`);
        
        if (err.message.includes("bad decrypt")) {
            console.error("💡 조치: 서비스 파일에 openssl-legacy-provider 옵션을 추가하거나 지갑을 재발급하세요.");
        }
        throw err;
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
}

module.exports = initializeDatabase;
