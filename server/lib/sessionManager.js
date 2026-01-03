const oracledb = require('oracledb');

class SessionManager {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // 1. 신규 세션 저장
    async saveSession(sessionId, kakaoData) {
        const sql = `
            INSERT INTO KAKAOWEB_SESSIONS (SESSION_ID, USER_ID, AUTH_TOKEN, DEVICE_UUID)
            VALUES (:sid, :uid, :token, :uuid)`;
        await this.db.execute(sql, {
            sid: sessionId,
            uid: kakaoData.userId,
            token: kakaoData.authToken,
            uuid: kakaoData.deviceUuid
        });
        await this.db.commit();
    }

    // 2. 세션 복구 (DB에서 토큰 로드)
    async restoreSession(sessionId) {
        const sql = `SELECT * FROM KAKAOWEB_SESSIONS WHERE SESSION_ID = :sid AND IS_VALID = 'Y'`;
        const result = await this.db.execute(sql, [sessionId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length > 0) {
            return result.rows[0]; // { AUTH_TOKEN, DEVICE_UUID, ... }
        }
        return null;
    }

    // 3. 메시지 저장
    async logMessage(chatId, senderId, msg) {
        const sql = `INSERT INTO KAKAOWEB_CHAT_LOGS (CHAT_ID, SENDER_ID, MESSAGE) VALUES (:1, :2, :3)`;
        await this.db.execute(sql, [chatId, senderId, msg]);
        await this.db.commit();
    }
}

module.exports = SessionManager;
