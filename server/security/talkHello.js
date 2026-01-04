const crypto = require('crypto');

/**
 * TalkHello.encrypt() Node.js 구현
 * 분석 기반: libtalkand_aes_v11.3.0.so (Ghidra 분석 결과 반영)
 * 기능: uvc3 생성을 위한 1단계 하드웨어 정보 암호화
 */
class TalkHello {
    constructor() {
        // [분석 결과] AES-256 키 (32 bytes)
        this.KEY = Buffer.from(
            '3add51cf49f15ac4204b0e3a4315542bd317b436ed44dd2a47c65ba922ea39c0',
            'hex'
        );
        
        // [분석 결과] IV (16 bytes)
        this.IV = Buffer.from(
            'df2f3c57286470abb46ca0c59ae4aa0a',
            'hex'
        );
    }

    /**
     * 카카오톡 기기 인증(UVC3) 문자열 1차 암호화
     * @param {string|object} input - 암호화할 데이터 (객체일 경우 JSON으로 변환)
     * @returns {string} - Base64 인코딩된 암호문
     */
    encrypt(input) {
        try {
            // 1. 입력 데이터 처리
            const data = typeof input === 'string' ? input : JSON.stringify(input);
            
            // 2. AES-256-CBC 암호화 설정
            const cipher = crypto.createCipheriv('aes-256-cbc', this.KEY, this.IV);
            
            // 3. PKCS#7 자동 패딩 활성화 (Java의 기본값과 동일)
            cipher.setAutoPadding(true);

            // 4. 암호화 수행 (중요: 바이너리 무결성을 위해 Buffer로 합산)
            // 인코딩 인자를 생략하여 Buffer 객체를 직접 반환받습니다.
            let part1 = cipher.update(data, 'utf8'); 
            let part2 = cipher.final(); 
            
            // 5. 바이너리 합치기 및 최종 Base64 인코딩
            const encryptedBuffer = Buffer.concat([part1, part2]);
            
            return encryptedBuffer.toString('base64');
            
        } catch (error) {
            console.error('[Security Error] TalkHello Encryption failed:', error.message);
            throw error;
        }
    }
}

// 싱글톤 인스턴스로 수출
module.exports = new TalkHello();
