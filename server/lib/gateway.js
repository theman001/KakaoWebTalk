const { Server } = require("socket.io");
const crypto = require("crypto");

const LocoClient = require("./locoClient");
const SessionManager = require("./sessionManager");
const KakaoAuth = require("./kakaoAuth");

// 🔐 보안 계층
const { CryptoService } = require("../security/crypto");
const { validateIntegrity } = require("../security/integrity");
const { buildDeviceFingerprint } = require("../security/fingerprint");

const cryptoService = new CryptoService();

class KakaoGateway {

    constructor(httpServer, db, config) {

        this.io = new Server(httpServer, { cors: { origin: "*" } });
        this.db = db;
        this.config = config;

        this.sm = new SessionManager(db);
        this.activeConnections = new Map();

        this.init();
    }

    init() {

        this.io.on("connection", (socket) => {

            console.log(`[Socket] Browser connected: ${socket.id}`);

            /**
             * ==========================
             * 1️⃣ 세션 복구 시도
             * ==========================
             */
            socket.on("auth:restore", async (sessionId) => {

                try {
                    const session = await this.sm.restoreSession(sessionId);

                    if (!session) {
                        socket.emit("auth:required");
                        return;
                    }

                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: session.authToken,
                        DEVICE_UUID: session.deviceUuid,
                        USER_ID: session.userId,
                        REVISION: 0
                    });

                    socket.emit("auth:success", {
                        sessionId,
                        userId: session.userId
                    });

                } catch (err) {
                    console.error(err);
                    socket.emit("auth:fail", { message: "세션 복구 실패" });
                }
            });

            /**
             * ==========================
             * 2️⃣ 신규 로그인
             * ==========================
             */
            socket.on("auth:login", async (data) => {

                try {
                    // 🔐 1. 무결성 검증
                    if (!validateIntegrity(data.clientEnv)) {
                        return socket.emit("auth:fail", { message: "무결성 검증 실패" });
                    }

                    // 🔐 2. 디바이스 Fingerprint 생성
                    const fingerprint = buildDeviceFingerprint(data.device);

                    // 🔐 3. 보안 토큰 생성
                    const secureToken = cryptoService.encrypt({
                        fp: fingerprint,
                        ts: Date.now()
                    });

                    // 4. 실제 로그인
                    const auth = new KakaoAuth(this.config);

                    const loginResult = await auth.login(
                        data.email,
                        data.password,
                        secureToken // ← 보안 토큰 사용(가정)
                    );

                    // 5. 브라우저 세션 ID 발급
                    const browserSessionId = crypto.randomBytes(20).toString("hex");

                    await this.sm.saveSession(browserSessionId, {
                        userId: loginResult.userId,
                        authToken: loginResult.authToken,
                        deviceUuid: this.config.kakao.deviceUuid,
                        fingerprint
                    });

                    // 6. LOCO 연결
                    await this.setupLocoConnection(socket, {
                        AUTH_TOKEN: loginResult.authToken,
                        DEVICE_UUID: this.config.kakao.deviceUuid,
                        USER_ID: loginResult.userId,
                        REVISION: 0
                    });

                    socket.emit("auth:success", {
                        sessionId: browserSessionId,
                        userId: loginResult.userId
                    });

                } catch (err) {

                    console.error("Login Error:", err);

                    socket.emit("auth:fail", {
                        message: err?.message ?? "로그인 실패"
                    });
                }
            });

            /**
             * ==========================
             * 3️⃣ 메시지 전송
             * ==========================
             */
            socket.on("chat:send", (data) => {

                const loco = this.activeConnections.get(socket.id);

                if (!loco || !loco.connected) {
                    return socket.emit("chat:error", { message: "서버와 연결되지 않았습니다." });
                }

                loco.sendPacket("WRITE", {
                    chatId: data.chatId,
                    msg: data.message,
                    type: 1
                });
            });

            /**
             * ==========================
             * 4️⃣ 연결 해제 처리
             * ==========================
             */
            socket.on("disconnect", () => {

                const loco = this.activeConnections.get(socket.id);

                if (loco) {
                    loco.disconnect();
                    this.activeConnections.delete(socket.id);
                }

                console.log(`[Socket] Disconnected: ${socket.id}`);
            });
        });
    }

    /**
     * ==========================
     * LOCO 연결 세팅
     * ==========================
     */
    async setupLocoConnection(socket, session) {

        if (this.activeConnections.has(socket.id)) {
            this.activeConnections.get(socket.id).disconnect();
        }

        const loco = new LocoClient(this.config.kakao);

        try {
            await loco.connect();

            loco.sendPacket("LOGINLIST", {
                authToken: session.AUTH_TOKEN,
                deviceUuid: session.DEVICE_UUID,
                revision: session.REVISION ?? 0
            });

            loco.on("packet", async (method, body) => {

                if (method === "MSG") {

                    await this.sm.logMessage(
                        body.chatId,
                        body.senderId,
                        body.chatLog.msg
                    );

                    socket.emit("chat:receive", {
                        chatId: body.chatId,
                        sender: body.authorNickname,
                        message: body.chatLog.msg
                    });

                } else {
                    socket.emit(`loco:${method}`, body);
                }
            });

            loco.on("close", () => {
                socket.emit("loco:disconnected");
                this.activeConnections.delete(socket.id);
            });

            this.activeConnections.set(socket.id, loco);

        } catch (err) {

            console.error("LOCO Connection Error:", err);

            throw new Error("카카오 서버 연결 실패");
        }
    }
}

module.exports = KakaoGateway;
