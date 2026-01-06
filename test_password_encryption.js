/**
 * Password 암호화 방식 비교 테스트
 * 
 * 일반 암호화 모드 vs 복호화 모드 시뮬레이션 비교
 */

const kakaoCrypto = require('./server/security/kakaoCrypto');

const testPassword = 'xodnr123';

console.log('='.repeat(60));
console.log('Password 암호화 방식 비교 테스트');
console.log('='.repeat(60));
console.log(`테스트 비밀번호: ${testPassword}\n`);

// 테스트 1: 일반 암호화 모드 (Base64URL)
console.log('[테스트 1] 일반 암호화 모드 (Base64URL)');
console.log('-'.repeat(60));
const encrypted1 = kakaoCrypto.encryptPassword(testPassword);
if (encrypted1) {
    console.log(`✅ 성공`);
    console.log(`결과: ${encrypted1}`);
    console.log(`길이: ${encrypted1.length}자`);
    console.log(`형식: Base64URL (+, / → -, _ 변환, 패딩 = 제거)`);
} else {
    console.log(`❌ 실패`);
}
console.log('');

// 테스트 2: 복호화 모드 시뮬레이션
console.log('[테스트 2] 복호화 모드 시뮬레이션 (APK .a() 메서드)');
console.log('-'.repeat(60));
const encrypted2 = kakaoCrypto.encryptPasswordAlternative(testPassword);
if (encrypted2) {
    console.log(`✅ 성공`);
    console.log(`결과: ${encrypted2}`);
    console.log(`길이: ${encrypted2.length}자`);
    console.log(`형식: Base64URL`);
} else {
    console.log(`❌ 실패 (예상됨 - 논리적으로 복호화 모드로 평문 처리 불가)`);
}
console.log('');

// 비교
console.log('[비교]');
console.log('-'.repeat(60));
if (encrypted1 && encrypted2) {
    if (encrypted1 === encrypted2) {
        console.log('⚠️  두 방식의 결과가 동일합니다!');
    } else {
        console.log('✅ 두 방식의 결과가 다릅니다.');
        console.log(`차이: ${Math.abs(encrypted1.length - encrypted2.length)}자`);
    }
} else if (encrypted1 && !encrypted2) {
    console.log('✅ 일반 암호화 모드만 성공');
    console.log('❌ 복호화 모드 시뮬레이션 실패 (예상됨)');
} else {
    console.log('❌ 두 방식 모두 실패');
}

console.log('\n' + '='.repeat(60));
console.log('테스트 완료');
console.log('='.repeat(60));



