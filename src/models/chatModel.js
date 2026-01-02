const { getConnection } = require('../db');

const chatModel = {
  // 채팅방 정보를 DB와 동기화 (없으면 생성, 있으면 갱신)
  async upsertRooms(rooms) {
    let conn;
    try {
      conn = await getConnection();
      const sql = `
        MERGE INTO KAKAO_ROOMS r
        USING (SELECT :id as room_id, :name as room_name FROM dual) src
        ON (r.room_id = src.room_id)
        WHEN MATCHED THEN 
          UPDATE SET r.room_name = src.room_name
        WHEN NOT MATCHED THEN 
          INSERT (room_id, room_name) VALUES (src.room_id, src.room_name)
      `;

      for (const room of rooms) {
        // room.li.nm은 오픈채팅방, room.chatId는 기본 아이디
        const roomName = room.li ? room.li.nm : `Chat_${room.chatId}`;
        await conn.execute(sql, { 
          id: room.chatId.toString(), 
          name: roomName 
        });
      }
      await conn.commit();
    } catch (err) {
      console.error('[DB] upsertRooms Error:', err);
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  },

  // 메시지 데이터를 누적 저장 (Log)
  async saveMessage(roomId, sender, text) {
    let conn;
    try {
      conn = await getConnection();
      await conn.execute(
        `INSERT INTO MESSAGE_LOGS (CHAT_ROOM_ID, SENDER_NAME, MESSAGE_TEXT) VALUES (:r, :s, :m)`,
        { r: roomId, s: sender, m: text }
      );
      await conn.commit();
    } catch (err) {
      console.error('[DB] saveMessage Error:', err);
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
};

module.exports = chatModel;
