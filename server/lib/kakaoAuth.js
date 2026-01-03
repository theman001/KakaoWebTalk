const axios = require('axios');
const crypto = require('crypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authUrl = "https://auth.kakao.com/v1/auth/login"; // 예시 URL
    }

    // 아이디/비번으로 체크인 및 토큰 획득
    async login(email, password) {
        try {
            // 1. 기기 고유값 및 패스워드 해싱 (카카오 보안 요구사항에 맞게 처리)
            // 실제 구현 시에는 카카오의 암호화 방식(RSA/AES)을 준수해야 합니다.
            
            const response = await axios.post(this.authUrl, {
                email: email,
                password: password,
                device_uuid: this.config.kakao.deviceUuid,
                app_version: this.config.kakao.appVersion,
                os: "win32"
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data.status === 0) {
                console.log(">>> 카카오 인증 성공");
                return {
                    authToken: response.data.access_token,
                    userId: response.data.userId,
                    locoHost: response.data.server_ip,
                    locoPort: response.data.server_port
                };
            } else {
                throw new Error(`인증 실패: ${response.data.message}`);
            }
        } catch (error) {
            console.error("Login Error:", error.message);
            throw error;
        }
    }
}

module.exports = KakaoAuth;
