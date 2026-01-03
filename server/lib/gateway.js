const { Server } = require("socket.io");
const crypto = require("crypto"); // 세션 ID 생성을 위해 필요
const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");
const KakaoAuth = require("./kakaoAuth"); // 로그인 처리를 위해 필요

class KakaoGateway {
    constructor(httpServer, db, config) {
        this.io = new Server(httpServer);
        this.db = db;
        this.config = config;
        this.sm = new SessionManager(db);
        this.activeConnections = new Map(); // socket.id -> LocoClient

        this.init();
    }

    init() {
        this.io.on("connection", (socket) => {
            console.log(`[Socket] New browser connected: ${socket.id}`);

            // 1. 세션 복구 (기존 로그인 정보가 있을 때)
            socket.on("auth:restore", async (sessionId) => {
                try {
                    const session = await this.sm.restoreSession(sessionId);
                    if (session) {
                        await this.setupLocoConnection(socket, session);
                    } else {
                        socket.emit("auth:required");
                    }
                } catch (err) {
                    console.error("Restore Error:", err);
                    socket.emit("auth:fail", { message: "세션 복구 중 오류 발생" });
                }
            });

            // 2. 신규 로그인 (아이디/비번)
            socket.on("auth:login", async (data) => {
                try {
                    const auth = new KakaoAuth(this.config);
                    const loginResult = await auth.login(data.email, data.password);
            
                    // DB에 저장할 브라우저용 세션 ID 생성
                    const browserSessionId = crypto.randomBytes(20).toString('hex');
                    await this.sm.saveSession(browserSessionId, {
                        userId: loginResult.userId,
                        authToken: loginResult.authToken,
                        deviceUuid: this.config.kakao.deviceUuid
                    });
            
                    // LOCO 연결
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: loginResult.authToken,
                        DEVICE_UUID: this.config.kakao.deviceUuid,
                        REVISION: 0,
                        USER_ID: loginResult.userId
                    });
            
                    // 클라이언트에게 세션 ID 전달
                    socket.emit("auth:success", { 
                        sessionId: browserSessionId,
                        userId: loginResult.userId 
                    });
            
                } catch (err) {
                    console.error("Login Error:", err);
                    socket.emit("auth:fail", { message: err.message });
                }
            });

            // 3. 메시지 전송
            socket.on("chat:send", (data) => {
                const loco = this.activeConnections.get(socket.id);
                if (loco && loco.connected) {
                    loco.sendPacket("WRITE", {
                        chatId: data.chatId,
                        msg: data.message,
                        type: 1
                    });
                } else {
                    socket.emit("chat:error", { message: "카카오 서버와 연결이 끊겨 있습니다." });
                }
            });

            // 4. 연결 해제
            socket.on("disconnect", () => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    loco.disconnect(); 
                    this.activeConnections.delete(socket.id);
                }
                console.log(`[Socket] Browser disconnected: ${socket.id}`);
            });
        });
    }

    async setupLocoConnection(socket, session) {
        // 기존에 연결된 게 있다면 먼저 정리 (중복 방지)
        if (this.activeConnections.has(socket.id)) {
            this.activeConnections.get(socket.id).disconnect();
        }

        const loco = new LocoClient(this.config.kakao);
        
        try {
            await loco.connect();
            
            loco.sendPacket("LOGINLIST", {
                authToken: session.AUTH_TOKEN,
                deviceUuid: session.DEVICE_UUID,
                revision: session.REVISION || 0
            });

            loco.on("packet", async (method, body) => {
                // MSG 패킷 처리
                if (method === "MSG") {
                    try {
                        await this.sm.logMessage(body.chatId, body.senderId, body.chatLog.msg);
                        socket.emit("chat:receive", {
                            chatId: body.chatId,
                            sender: body.authorNickname,
                            message: body.chatLog.msg
                        });
                    } catch (dbErr) {
                        console.error("Message Log Error:", dbErr);
                    }
                } else {
                    socket.emit(`loco:${method}`, body);
                }
            });

            // 카카오 서버에서 소켓이 강제로 닫혔을 때 대응
            loco.on("close", () => {
                socket.emit("loco:disconnected");
                this.activeConnections.delete(socket.id);
            });

            this.activeConnections.set(socket.id, loco);
        } catch (err) {
            console.error("Loco Connection Error:", err);
            throw new Error("카카오 서버 연결 실패");
        }
    }
}

module.exports = KakaoGateway;
