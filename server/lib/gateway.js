const { Server } = require("socket.io");
const crypto = require("crypto");

const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");
const KakaoAuth = require("./kakaoAuth");

class KakaoGateway {
    constructor(httpServer, db, config) {
        // Socket.io 초기화
        this.io = new Server(httpServer, { 
            cors: { origin: "*" },
            allowEIO3: true // 호환성 유지
        });
        
        this.db = db;
        this.config = config;

        // DB 연결 상태에 따른 세션 매니저 초기화
        this.sm = db ? new SessionManager(db) : null;
        
        // 실시간 소켓 연결 관리 (socket.id -> LocoClient instance)
        this.activeConnections = new Map();

        this.init();
    }

    /**
     * DB가 백그라운드에서 연결 성공했을 때 호출됨
     * index.js에서 initializeDatabase().then() 내부에서 실행
     */
    updateDatabase(db) {
        this.db = db;
        this.sm = new SessionManager(db);
        console.log("[Gateway] Oracle DB 연동 완료. 세션 및 로그 저장 기능을 활성화합니다.");
    }

    init() {
        this.io.on("connection", (socket) => {
            console.log(`[Socket] 브라우저 연결됨: ${socket.id}`);

            /**
             * 1. 세션 복구 (브라우저 새로고침 시 /chat 페이지에서 호출)
             */
            socket.on("auth:restore", async (sessionId) => {
                if (!this.sm) {
                    // DB가 아직 연결 안 된 경우
                    return socket.emit("auth:required", { reason: "DB_PENDING" });
                }

                try {
                    const session = await this.sm.restoreSession(sessionId);
                    if (!session) {
                        console.log(`[Auth] 유효하지 않은 세션: ${sessionId}`);
                        return socket.emit("auth:required");
                    }

                    // LOCO 서버(카카오) 재연결
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: session.AUTH_TOKEN,
                        DEVICE_UUID: session.DEVICE_UUID,
                        USER_ID: session.USER_ID
                    });

                    socket.emit("auth:success", { 
                        sessionId, 
                        userId: session.USER_ID,
                        restored: true 
                    });
                } catch (err) {
                    console.error("[Restore Error]:", err.message);
                    socket.emit("auth:fail", { message: "세션 복구 중 오류가 발생했습니다." });
                }
            });

            /**
             * 2. 신규 로그인 (login.html에서 호출)
             */
            socket.on("auth:login", async (data) => {
                try {
                    console.log(`[Auth] 카카오 로그인 시도: ${data.email}`);
                    const auth = new KakaoAuth(this.config);
                    const loginResult = await auth.login(data.email, data.password);

                    if (loginResult.status !== 0) {
                        throw new Error(loginResult.message || "카카오 계정 정보가 일치하지 않습니다.");
                    }

                    // 서비스 내부용 고유 세션 ID 생성
                    const browserSessionId = crypto.randomBytes(20).toString("hex");

                    // DB가 연결된 상태라면 Oracle에 세션 영구 저장
                    if (this.sm) {
                        await this.sm.saveSession(browserSessionId, {
                            userId: loginResult.userId,
                            authToken: loginResult.access_token,
                            deviceUuid: loginResult.deviceUuid
                        });
                    }

                    // 카카오 톡 서버(LOCO) 연결 프로토콜 시작
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: loginResult.access_token,
                        DEVICE_UUID: loginResult.deviceUuid,
                        USER_ID: loginResult.userId
                    });

                    // 결과 전송 (클라이언트는 이를 받고 /chat으로 이동함)
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

            /**
             * 3. 실시간 메시지 전송
             */
            socket.on("chat:send", (data) => {
                const loco = this.activeConnections.get(socket.id);
                if (!loco || !loco.connected) {
                    return socket.emit("chat:error", { message: "카카오 서버와 연결이 끊겨 있습니다." });
                }

                // 카카오 WRITE 패킷 전송
                loco.sendPacket("WRITE", {
                    chatId: data.chatId,
                    msg: data.message,
                    type: 1
                });
            });

            /**
             * 4. 브라우저 접속 종료 시 처리
             */
            socket.on("disconnect", () => {
                const loco = this.activeConnections.get(socket.id);
                if (loco) {
                    console.log(`[Socket] 연결 종료로 인한 LOCO 소켓 해제: ${socket.id}`);
                    loco.socket.destroy();
                    this.activeConnections.delete(socket.id);
                }
            });
        });
    }

    /**
     * 카카오 LOCO 프로토콜 연결 및 패킷 핸들러 설정
     */
    async setupLocoConnection(socket, session) {
        const loco = new LocoClient(this.config.kakao);
        try {
            await loco.connect();
            
            // 로그인 리스트 요청 (카카오톡 세션 활성화)
            loco.sendPacket("LOGINLIST", {
                authToken: session.AUTH_TOKEN,
                deviceUuid: session.DEVICE_UUID,
                revision: 0
            });

            // 카카오 서버로부터 오는 실시간 패킷 처리
            loco.on("packet", async (method, body) => {
                // 새로운 메시지 수신 시
                if (method === "MSG") {
                    // DB가 연결되어 있다면 대화 로그 저장 (비동기 처리)
                    if (this.sm) {
                        this.sm.logMessage(body.chatId, body.senderId, body.chatLog.msg)
                            .catch(e => console.error("[DB Log Error]:", e.message));
                    }

                    // 브라우저 화면으로 메시지 전달
                    socket.emit("chat:receive", {
                        chatId: body.chatId,
                        sender: body.authorNickname || "User",
                        message: body.chatLog.msg,
                        time: new Date()
                    });
                } else {
                    // 기타 패킷(친구목록, 알림 등) 전달
                    socket.emit(`loco:${method}`, body);
                }
            });

            // 현재 활성화된 연결 맵에 저장
            this.activeConnections.set(socket.id, loco);

        } catch (err) {
            console.error("[LOCO Setup Error]:", err);
            socket.emit("chat:error", { message: "카카오 서버(LOCO) 연결에 실패했습니다." });
        }
    }
}

module.exports = KakaoGateway;
