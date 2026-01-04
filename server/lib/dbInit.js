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

        console.log("=========================================");
        console.log("[DB] 스크립트 기반 최종 경로 주입");
        console.log(` > USER: ${dbConfig.user}`);
        console.log(` > TNS: ${dbConfig.connectString}`);
        console.log(` > CONFIG_DIR: ${walletAbsPath}`);
        console.log("=========================================");

        // NJS-516 에러 해결을 위해 configDir를 반드시 포함해야 합니다.
        connection = await oracledb.getConnection({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            // 지갑 폴더 안에 tnsnames.ora가 있으므로 아래 설정이 필수입니다.
            configDir: walletAbsPath, 
            walletLocation: walletAbsPath,
            walletPassword: "" 
        });

        console.log(" ✅ [DB] Oracle Database 연결 성공!");

        // ... (테이블 생성 로직 생략) ...
        return connection;

    } catch (err) {
        console.error("\n❌ [DB 접속 에러]");
        console.error(`메시지: ${err.message}`);
        throw err;
    }
}

module.exports = initializeDatabase;
