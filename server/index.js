const oracledb = require('oracledb');
const fs = require('fs');
const yaml = require('js-yaml');

const config = yaml.load(fs.readFileSync('../config.yaml', 'utf8'));

async function connectDB() {
    try {
        // Wallet 경로 지정하여 클라이언트 초기화
        await oracledb.initOracleClient({ configDir: config.database.walletPath });
        
        const connection = await oracledb.getConnection({
            user: config.database.user,
            password: config.database.password,
            connectString: config.database.connectString
        });
        console.log("OCI ATP DB 연결 성공 (Wallet 사용)");
        return connection;
    } catch (err) {
        console.error("DB 접속 에러:", err);
    }
}
