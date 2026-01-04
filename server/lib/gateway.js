const { Server } = require("socket.io");
const crypto = require("crypto");

const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");
const KakaoAuth = require("./kakaoAuth");

class KakaoGateway {
    constructor(httpServer, db, config) {
        this.io = new Server(httpServer, { cors: { origin: "*" } });
        this.db = db;
        this.config = config;

        // DB가 있을 때만 세션 매니저 활성화
        this.sm = db ? new SessionManager(db) : null;
        this.activeConnections = new Map(); // socket.id -> LocoClient

        this.init();
    }

    /**
     * DB가 나중에 연결되었을 때 게이트웨이 갱신
     */
    updateDatabase(db) {
        this.db = db;
        this.sm = new SessionManager(db);
        console.log("[Gateway] DB 객체가 주입되었습니다. 영구 저장 기능을 활성화합니다.");
    }

    init() {
        this.io.on("connection", (socket) => {
            console.log(`[Socket] 새 브라우저 연결: ${socket.id}`);

            // 1. 세션 복구
            socket.on("auth:restore", async (sessionId) => {
                if (!this.sm) {
                    return socket.emit("auth:required", { reason: "DB_NOT_CONNECTED" });
                }
                try {
                    const session = await this.sm.restoreSession(sessionId);
                    if (!session) return socket.emit("auth:required");

                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: session.AUTH_TOKEN,
                        DEVICE_UUID: session.DEVICE_UUID,
                        USER_ID: session.USER_ID
                    });
                    socket.emit("auth:success", { sessionId, userId: session.USER_ID });
                } catch (err) {
                    socket.emit("auth:fail", { message: "세션 복구 오류" });
                }
            });

            // 2. 신규 로그인
            socket.on("auth:login", async (data) => {
                try {
                    const auth = new KakaoAuth(this.config);
                    const loginResult = await auth.login(data.email, data.password);

                    if (loginResult.status !== 0) {
                        throw new Error(loginResult.message || "카카오 로그인 실패");
                    }

                    const browserSessionId = crypto.randomBytes(20).toString("hex");

                    // DB가 연결된 상태라면 세션 저장
                    if (this.sm) {
                        await this.sm.saveSession(browserSessionId, {
                            userId: loginResult.userId,
                            authToken: loginResult.access_token,
                            deviceUuid: loginResult.deviceUuid
                        });
                    }

                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: loginResult.access_token,
                        DEVICE_UUID: loginResult.deviceUuid,
                        USER_ID: loginResult.userId
                    });

                    socket.emit("auth:success", {
                        sessionId: browserSessionId,
                        userId: loginResult.userId,
                        dbStatus: !!this.db
                    });
                } catch (err) {
                    console.error("[Login Error]:", err.message);
                    socket.emit("auth:fail", { message: err.message });
                }
            });

            // 3. 메시지 전송
            socket.on("chat:send", (data) => {
                const loco = this.activeConnections.get(socket.id);
                if (!loco || !loco.connected) {
                    return socket.emit("chat:error", { message: "카카오 서버 연결 끊김" });
                }
                loco.sendPacket("WRITE", {
                    chatId: data.chatId,
                    msg: data.message,
                    type: 1
                });
            });

            socket.on("disconnect", () => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    loco.socket.destroy();
                    this.activeConnections.delete(socket.id);
                }
            });
        });
    }

    async setupLocoConnection(socket, session) {
        const loco = new LocoClient(this.config.kakao);
        try {
            await loco.connect();
            loco.sendPacket("LOGINLIST", {
                authToken: session.AUTH_TOKEN,
                deviceUuid: session.DEVICE_UUID,
                revision: 0
            });

            loco.on("packet", async (method, body) => {
                if (method === "MSG") {
                    // DB 저장 시도 (비동기, 실패해도 브라우저 전송은 진행)
                    if (this.sm) {
                        this.sm.logMessage(body.chatId, body.senderId, body.chatLog.msg)
                            .catch(e => console.error("[DB Log Error]:", e.message));
                    }

                    socket.emit("chat:receive", {
                        chatId: body.chatId,
                        sender: body.authorNickname || "알 수 없음",
                        message: body.chatLog.msg
                    });
                } else {
                    socket.emit(`loco:${method}`, body);
                }
            });

            this.activeConnections.set(socket.id, loco);
        } catch (err) {
            console.error("[LOCO Setup Error]:", err);
            socket.emit("chat:error", { message: "LOCO 연결 실패" });
        }
    }
}

module.exports = KakaoGateway;
