# 🚀 지금 바로 테스트하기

## 빠른 테스트 방법

### 1️⃣ 복호화 모드 시뮬레이션 테스트

서버에서 다음 명령어를 실행하세요:

```bash
# 서버 디렉토리로 이동
cd /path/to/KakaoWebTalk

# 복호화 모드 활성화 후 서버 시작
export USE_DECRYPT_MODE=true
node server/index.js
```

또는 systemd 서비스를 사용하는 경우:

```bash
# 서비스 파일 수정
sudo nano /etc/systemd/system/webkakao.service

# [Service] 섹션에 추가:
Environment="USE_DECRYPT_MODE=true"

# 서비스 재시작
sudo systemctl daemon-reload
sudo systemctl restart webkakao

# 로그 확인
sudo journalctl -u webkakao -f
```

### 2️⃣ 로그인 시도

브라우저에서 로그인 페이지에 접속하여 로그인을 시도하세요.

### 3️⃣ 로그 확인

서버 로그에서 다음을 확인하세요:

**복호화 모드 활성화 확인**:
```
[EXPERIMENTAL] Using decrypt mode simulation (APK .a() method)
```

**Password 암호화 결과**:
```
[CRYPTO_ALTERNATIVE] RawBytes: ..., DecryptedBytes: ..., ResultLen: ...
```

**로그인 결과**:
```
[KakaoAuth Success] HTTP 200 - User ID: [값]
또는
[KakaoAuth Warning] Message: [에러 메시지]
```

### 4️⃣ 결과 비교

**일반 모드 (Base64URL)**:
- Password: `tRcNpdoftAae_tjaXr-rNg`
- 결과: status: -404

**복호화 모드 시뮬레이션**:
- Password: `[다른 값]`
- 결과: `[확인 필요]`

## 📊 예상 시나리오

### 시나리오 A: 복호화 모드 실패
```
[CRYPTO_ALTERNATIVE] Error: [에러 메시지]
password: null
```
→ 논리적으로 예상되는 결과

### 시나리오 B: 복호화 모드 성공하지만 로그인 실패
```
[CRYPTO_ALTERNATIVE] RawBytes: ..., ResultLen: ...
password: [값]
[KakaoAuth Warning] Message: 올바르지 않은 접근입니다.
```
→ Password 값은 생성되었지만 서버 검증 실패

### 시나리오 C: 복호화 모드로 로그인 성공
```
[CRYPTO_ALTERNATIVE] RawBytes: ..., ResultLen: ...
password: [값]
[KakaoAuth Success] HTTP 200 - User ID: [숫자]
```
→ ✅ 성공! 복호화 모드가 실제로 사용되는 방식

## 🔄 원래 설정으로 복구

테스트 후 원래 설정으로 복구:

```bash
# 환경 변수 제거
unset USE_DECRYPT_MODE

# 또는 서비스 파일에서 Environment 제거 후
sudo systemctl daemon-reload
sudo systemctl restart webkakao
```

## 📝 결과 기록

테스트 결과를 `kakao/TEST_RESULTS_TEMPLATE.md`를 참고하여 기록하세요.



