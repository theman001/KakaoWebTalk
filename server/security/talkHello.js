const crypto = require('crypto');

/**
 * TalkHello.encrypt() Node.js 구현
 * 분석 기반: libtalkand_aes_v11.3.0.so (Ghidra)
 */
class TalkHello {
    constructor() {
        // AES-256 키 (32 bytes)
        this.KEY = Buffer.from(
            '3add51cf49f15ac4204b0e3a4315542bd317b436ed44dd2a47c65ba922ea39c0',
            'hex'
        );
        
        // IV (16 bytes)
        this.IV = Buffer.from(
            'df2f3c57286470abb46ca0c59ae4aa0a',
            'hex'
        );
    }

    /**
     * 카카오톡 기기 인증(UVC3) 문자열 암호화
     */
    encrypt(input) {
        try {
            const data = typeof input === 'string' ? input : JSON.stringify(input);
            
            // AES-256-CBC 암호화 설정
            const cipher = crypto.createCipheriv('aes-256-cbc', this.KEY, this.IV);
            cipher.setAutoPadding(true); // PKCS#7 패딩 적용

            // ✅ 수정: 바이너리(Buffer) 단위로 합산 후 마지막에 Base64 변환
            let part1 = cipher.update(data, 'utf8'); // Buffer 반환
            let part2 = cipher.final();              // Buffer 반환
            
            const encryptedBuffer = Buffer.concat([part1, part2]);
            return encryptedBuffer.toString('base64');
            
        } catch (error) {
            console.error('[Security Error] Encryption failed:', error.message);
            throw error;
        }
    }
}

module.exports = new TalkHello();
