const { Server } = require("socket.io");
const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");

class KakaoGateway {
    constructor(httpServer, db, config) {
        this.io = new Server(httpServer);
        this.db = db;
        this.config = config;
        this.sm = new SessionManager(db);
        this.activeConnections = new Map(); // 세션별 LOCO 클라이언트 관리

        this.init();
    }

    init() {
        this.io.on("connection", (socket) => {
            console.log(`[Socket] New browser connected: ${socket.id}`);

            // 1. 세션 복구 및 로그인
            socket.on("auth:restore", async (sessionId) => {
                const session = await this.sm.restoreSession(sessionId);
                if (session) {
                    this.setupLocoConnection(socket, session);
                } else {
                    socket.emit("auth:required");
                }
            });

            // 2. 메시지 전송 이벤트
            socket.on("chat:send", (data) => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    loco.sendPacket("WRITE", {
                        chatId: data.chatId,
                        msg: data.message,
                        type: 1 // 텍스트 타입
                    });
                }
            });

            socket.on("disconnect", () => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    loco.disconnect(); // 소켓 자원 해제
                    this.activeConnections.delete(socket.id);
                }
                console.log(`[Socket] Browser disconnected: ${socket.id}`);
            });
        });
    }

    async setupLocoConnection(socket, session) {
        const loco = new LocoClient(this.config.kakao);
        
        // 카카오 서버 연결
        await loco.connect();
        
        // 로그인 패킷 전송
        loco.sendPacket("LOGINLIST", {
            authToken: session.AUTH_TOKEN,
            deviceUuid: session.DEVICE_UUID,
            revision: session.REVISION
        });

        // 카카오로부터 오는 데이터를 브라우저로 중계
        loco.on("packet", async (method, body) => {
            console.log(`[LOCO -> Web] Method: ${method}`);
            
            // 메시지 수신(MSG)인 경우 DB에 로깅 후 브라우저 전송
            if (method === "MSG") {
                await this.sm.logMessage(body.chatId, body.senderId, body.chatLog.msg);
                socket.emit("chat:receive", {
                    chatId: body.chatId,
                    sender: body.authorNickname,
                    message: body.chatLog.msg
                });
            } else {
                socket.emit(`loco:${method}`, body);
            }
        });

        this.activeConnections.set(socket.id, loco);
        socket.emit("auth:success", { userId: session.USER_ID });
    }
}

module.exports = KakaoGateway;
