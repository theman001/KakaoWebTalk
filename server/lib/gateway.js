const { Server } = require("socket.io");
const crypto = require("crypto");

const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");
const KakaoAuth = require("./kakaoAuth");

// 🔐 통합된 보안 모듈 참조 (uvcFactory가 기기 지문 및 무결성 역할을 수행)
const uvcFactory = require("../security/uvcFactory");

class KakaoGateway {
    constructor(httpServer, db, config) {
        // Socket.io 설정 (CORS 허용)
        this.io = new Server(httpServer, { cors: { origin: "*" } });
        this.db = db;
        this.config = config;

        this.sm = new SessionManager(db);
        this.activeConnections = new Map(); // socket.id -> LocoClient 인스턴스

        this.init();
    }

    init() {
        this.io.on("connection", (socket) => {
            console.log(`[Socket] Browser connected: ${socket.id}`);

            /**
             * 1️⃣ 세션 복구 (기존 브라우저 세션 ID로 DB 조회)
             */
            socket.on("auth:restore", async (sessionId) => {
                try {
                    const session = await this.sm.restoreSession(sessionId);

                    if (!session) {
                        socket.emit("auth:required");
                        return;
                    }

                    // DB에 저장된 AUTH_TOKEN과 DEVICE_UUID로 LOCO 재연결
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: session.AUTH_TOKEN,
                        DEVICE_UUID: session.DEVICE_UUID,
                        USER_ID: session.USER_ID,
                        REVISION: session.REVISION || 0
                    });

                    socket.emit("auth:success", {
                        sessionId,
                        userId: session.USER_ID
                    });

                } catch (err) {
                    console.error("[Restore Error]:", err);
                    socket.emit("auth:fail", { message: "세션 복구 실패" });
                }
            });

            /**
             * 2️⃣ 신규 로그인 (이메일/비번)
             */
            socket.on("auth:login", async (data) => {
                try {
                    // 🔐 uvcFactory는 내부적으로 Native/Abuse 암호화와 JSON 정렬을 처리하여 
                    // 별도의 가상 무결성 검증 레이어 없이도 서버 검증을 통과하게 합니다.
                    
                    const auth = new KakaoAuth(this.config);
                    const loginResult = await auth.login(data.email, data.password);

                    if (loginResult.status !== 0) {
                        throw new Error(loginResult.message || "카카오 로그인 실패");
                    }

                    // 3. 브라우저용 고유 세션 ID 생성
                    const browserSessionId = crypto.randomBytes(20).toString("hex");

                    // 4. DB에 세션 정보 영구 저장 (로그인 유지용)
                    await this.sm.saveSession(browserSessionId, {
                        userId: loginResult.userId,
                        authToken: loginResult.access_token, // 카카오 응답 필드에 맞춤
                        deviceUuid: loginResult.deviceUuid
                    });

                    // 5. LOCO 프로토콜 연결 수립
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: loginResult.access_token,
                        DEVICE_UUID: loginResult.deviceUuid,
                        USER_ID: loginResult.userId,
                        REVISION: 0
                    });

                    socket.emit("auth:success", {
                        sessionId: browserSessionId,
                        userId: loginResult.userId
                    });

                } catch (err) {
                    console.error("[Login Error]:", err);
                    socket.emit("auth:fail", {
                        message: err.message || "로그인 처리 중 오류 발생"
                    });
                }
            });

            /**
             * 3️⃣ 메시지 전송 (브라우저 -> 게이트웨이 -> 카카오 LOCO)
             */
            socket.on("chat:send", (data) => {
                const loco = this.activeConnections.get(socket.id);

                if (!loco || !loco.connected) {
                    return socket.emit("chat:error", { message: "카카오 서버와 연결되지 않았습니다." });
                }

                // LOCO WRITE 패킷 전송
                loco.sendPacket("WRITE", {
                    chatId: data.chatId,
                    msg: data.message,
                    type: 1 // 일반 텍스트
                });
            });

            /**
             * 4️⃣ 연결 해제
             */
            socket.on("disconnect", () => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    loco.socket.destroy(); // 소켓 강제 종료
                    this.activeConnections.delete(socket.id);
                }
                console.log(`[Socket] Disconnected: ${socket.id}`);
            });
        });
    }

    /**
     * LOCO 실시간 소켓 연결 및 이벤트 바인딩
     */
    async setupLocoConnection(socket, session) {
        // 기존 연결이 있다면 정리
        if (this.activeConnections.has(socket.id)) {
            const oldLoco = this.activeConnections.get(socket.id);
            oldLoco.socket.destroy();
        }

        const loco = new LocoClient(this.config.kakao);

        try {
            await loco.connect();

            // 1. LOCO 로그인 패킷 전송
            loco.sendPacket("LOGINLIST", {
                authToken: session.AUTH_TOKEN,
                deviceUuid: session.DEVICE_UUID,
                revision: session.REVISION || 0
            });

            // 2. 카카오로부터 오는 실시간 패킷 처리
            loco.on("packet", async (method, body) => {
                if (method === "MSG") {
                    // DB에 대화 기록 저장
                    try {
                        await this.sm.logMessage(body.chatId, body.senderId, body.chatLog.msg);
                    } catch (e) {
                        console.error("[DB Log Error]:", e.message);
                    }

                    // 브라우저로 실시간 전달
                    socket.emit("chat:receive", {
                        chatId: body.chatId,
                        sender: body.authorNickname || "알 수 없음",
                        message: body.chatLog.msg
                    });
                } else {
                    // 기타 패킷(로그인 결과 등) 전달
                    socket.emit(`loco:${method}`, body);
                }
            });

            loco.on("close", () => {
                socket.emit("loco:disconnected");
                this.activeConnections.delete(socket.id);
            });

            this.activeConnections.set(socket.id, loco);

        } catch (err) {
            console.error("[LOCO Setup Error]:", err);
            throw new Error("카카오 LOCO 서버 연결에 실패했습니다.");
        }
    }
}

module.exports = KakaoGateway;
