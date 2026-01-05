# 테스트 가이드

## 🔬 복호화 모드 시뮬레이션 테스트

### 환경 변수 설정

복호화 모드 시뮬레이션을 테스트하려면 환경 변수를 설정하세요:

```bash
# Windows (PowerShell)
$env:USE_DECRYPT_MODE="true"
node server.js

# Linux/Mac
export USE_DECRYPT_MODE=true
node server.js
```

### 테스트 시나리오

1. **일반 암호화 모드 테스트** (기본)
   ```bash
   # 환경 변수 설정 안 함
   node server.js
   ```

2. **복호화 모드 시뮬레이션 테스트**
   ```bash
   # 환경 변수 설정
   export USE_DECRYPT_MODE=true
   node server.js
   ```

### 예상 결과

**복호화 모드 시뮬레이션**:
- 논리적으로 실패할 가능성이 높음
- 하지만 APK 코드가 실제로 이 방식을 사용한다면 성공할 수 있음

**로그 확인**:
```
[EXPERIMENTAL] Using decrypt mode simulation (APK .a() method)
```

## 📊 테스트 결과 비교

### 테스트 1: 일반 암호화 모드 (Base64URL)
- Password 형식: Base64URL
- 결과: status: -404

### 테스트 2: 복호화 모드 시뮬레이션
- Password 형식: [테스트 필요]
- 결과: [테스트 필요]

## 🔍 디버깅 팁

### 로그 확인

```bash
# 서버 로그에서 확인
[CRYPTO_STRICT] RawBytes: 16, Base64Len: 24, Base64URLLen: 22
[EXPERIMENTAL] Using decrypt mode simulation (APK .a() method)
```

### Password 값 비교

로그에서 Password 값을 확인하고, 실제 APK 값과 비교하세요.

