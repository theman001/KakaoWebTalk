const nativeCipher = require('./cipher');
const abuseDetect = require('./abuse');

/**
 * 최종 uvc3 생성기 및 데이터 정렬기
 */
class UvcFactory {
    /**
     * @param {Object} data - 기기 및 앱 정보 객체
     */
    generate(data) {
        // 1. 서버 검증 통과를 위한 JSON 키 순서 강제 정렬 (보고서 2.2절 기준)
        const sortedJson = this.getDeterministicJson(data);

        // 2. Layer 1 암호화 (AES-256)
        const l1Output = nativeCipher.encrypt(sortedJson);

        // 3. Layer 2 암호화 (AES-128)
        const finalUvc = abuseDetect.encrypt(l1Output);

        // 4. Base64.NO_WRAP 처리 (줄바꿈 제거)
        return finalUvc.replace(/\n|\r/g, "");
    }

    getDeterministicJson(obj) {
        // 분석된 필드 순서 (서버는 이 순서대로 직렬화된 문자열을 기대할 가능성이 높음)
        const fieldOrder = [
            "va", "installReferrer", "apkChecksum", "appHierarchy", 
            "cpuName", "cpuPlatform", "cpuCore", "cpuAbi",
            "batteryPct", "batteryStatus", "batteryHealth", "powerSource",
            "brightness", "screenSize", "screenDensity", "screenPpi", "screenRefreshRate",
            "isMultiWindow", "volume", "totalMemory", "webviewVersion",
            "network_operator", "is_roaming", "supportMultiSim", "sims"
        ];

        const sorted = {};
        fieldOrder.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sorted[key] = obj[key];
            }
        });

        // 나머지 정의되지 않은 키가 있다면 뒤에 붙임
        Object.keys(obj).forEach(key => {
            if (!fieldOrder.includes(key)) {
                sorted[key] = obj[key];
            }
        });

        return JSON.stringify(sorted);
    }
}

module.exports = new UvcFactory();
