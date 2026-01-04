const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function initializeDatabase() {
    let connection;
    const startTime = Date.now();
    
    try {
        console.log(`[DEBUG] 1. 초기화 시작 (T: +0ms)`);
        const configPath = path.resolve(__dirname, '../../config.yaml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const dbConfig = config.database;
        const walletAbsPath = path.resolve(dbConfig.walletPath);

        console.log(`[DEBUG] 2. 설정 로드 완료 (T: +${Date.now() - startTime}ms)`);
        console.log(`   - 접속 유저: ${dbConfig.user}`);
        console.log(`   - 접속 문자열: ${dbConfig.connectString}`);
        console.log(`   - 지갑 경로: ${walletAbsPath}`);

        // 지갑 폴더 내 파일 리스트 출력 (파일 누락 확인용)
        const files = fs.readdirSync(walletAbsPath);
        console.log(`[DEBUG] 3. 지갑 파일 목록: [${files.join(', ')}]`);

        if (!files.includes('cwallet.sso') || !files.includes('tnsnames.ora')) {
            throw new Error("필수 지갑 파일(cwallet.sso 또는 tnsnames.ora)이 없습니다.");
        }

        console.log(`[DEBUG] 4. getConnection 시도 직전...`);

        // 10초 타임아웃 강제 적용
        connection = await oracledb.getConnection({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            configDir: walletAbsPath,
            walletLocation: walletAbsPath,
            walletPassword: "",
            connectTimeout: 10 
        });

        console.log(`[DEBUG] 5. 접속 성공! (소요시간: ${Date.now() - startTime}ms)`);

        // 테이블 생성 로직 생략 (기존과 동일)
        // ... 생략 ...

        return connection;

    } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`\n[!!! DEBUG ERROR !!!] (발생시점: +${duration}ms)`);
        console.error(`에러 타입: ${err.name}`);
        console.error(`에러 내용: ${err.message}`);
        
        // 상세 에러 가이드
        if (err.message.includes("NJS-511") || err.message.includes("NJS-516")) {
            console.error("💡 원인: 접속 문자열(tnsnames.ora) 인식 불가 혹은 포트 차단");
        } else if (err.message.includes("NJS-517")) {
            console.error("💡 원인: 호스트 이름을 찾을 수 없습니다 (DNS 문제)");
        }
        
        throw err;
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
}

module.exports = initializeDatabase;
