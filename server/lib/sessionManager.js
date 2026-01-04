const oracledb = require('oracledb');

/**
 * SessionManager
 * Oracle Cloud DB를 사용하여 브라우저 세션 및 채팅 로그 관리
 */
class SessionManager {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    /**
     * 1. 신규 세션 저장
     * 브라우저 sessionId와 카카오 인증 데이터를 매핑하여 저장
     */
    async saveSession(sessionId, kakaoData) {
        // dbInit.js의 컬럼명에 맞춰 USER_ID, AUTH_TOKEN, DEVICE_UUID 저장
        const sql = `
            INSERT INTO KAKAOWEB_SESSIONS (SESSION_ID, USER_ID, AUTH_TOKEN, DEVICE_UUID)
            VALUES (:sid, :uid, :token, :uuid)`;
        
        try {
            await this.db.execute(sql, {
                sid: sessionId,
                uid: kakaoData.userId.toString(), // ID가 숫자일 경우 대비해 문자열 변환
                token: kakaoData.authToken,
                uuid: kakaoData.deviceUuid
            });
            await this.db.commit();
            // console.log(`[Session] 세션 저장 완료: ${sessionId}`);
        } catch (err) {
            console.error(`[Session Error] saveSession 실패: ${err.message}`);
            throw err;
        }
    }

    /**
     * 2. 세션 복구
     * 브라우저 쿠키/로컬스토리지의 sessionId로 DB에서 카카오 토큰 로드
     */
    async restoreSession(sessionId) {
        // IS_VALID는 dbInit.js에서 기본값 'Y'로 설정됨
        const sql = `
            SELECT USER_ID, AUTH_TOKEN, DEVICE_UUID, REVISION 
            FROM KAKAOWEB_SESSIONS 
            WHERE SESSION_ID = :sid AND IS_VALID = 'Y'
            ORDER BY LAST_LOGIN DESC`;
            
        try {
            const result = await this.db.execute(
                sql, 
                { sid: sessionId }, 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            if (result.rows && result.rows.length > 0) {
                // gateway.js에서 대문자 필드를 기대하므로 그대로 반환하거나 매핑
                return result.rows[0]; 
            }
            return null;
        } catch (err) {
            console.error(`[Session Error] restoreSession 실패: ${err.message}`);
            return null;
        }
    }

    /**
     * 3. 실시간 메시지 로그 저장
     * LOCO로부터 받은 메시지를 기록
     */
    async logMessage(chatId, senderId, msg) {
        const sql = `
            INSERT INTO KAKAOWEB_CHAT_LOGS (CHAT_ID, SENDER_ID, MESSAGE) 
            VALUES (:1, :2, :3)`;
            
        try {
            // CLOB 대응을 위해 msg가 매우 길 경우를 고려한 바인딩
            await this.db.execute(sql, [
                chatId.toString(), 
                senderId.toString(), 
                msg
            ]);
            await this.db.commit();
        } catch (err) {
            // 메시지 저장이 실패해도 서비스가 죽지 않도록 에러만 출력
            console.error(`[DB Error] 메시지 로그 기록 실패: ${err.message}`);
        }
    }
}

module.exports = SessionManager;
