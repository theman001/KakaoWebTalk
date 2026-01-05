# 테스트 실행 가이드

## 🔬 복호화 모드 시뮬레이션 테스트

### 방법 1: 로컬 테스트 스크립트 실행

```bash
# KakaoWebTalk 디렉토리로 이동
cd KakaoWebTalk

# 테스트 스크립트 실행
node test_password_encryption.js
```

**예상 결과**:
- 일반 암호화 모드: ✅ 성공 (Base64URL 형식)
- 복호화 모드 시뮬레이션: ❌ 실패 (논리적으로 불가능)

### 방법 2: 실제 서버에서 테스트

#### 2-1. 일반 암호화 모드 테스트 (기본)

```bash
# 서버 시작 (기본 모드)
cd KakaoWebTalk
node server/index.js

# 또는 systemd 서비스 재시작
sudo systemctl restart webkakao
```

**로그 확인**:
```
[CRYPTO_STRICT] RawBytes: 16, Base64Len: 24, Base64URLLen: 22
password: tRcNpdoftAae_tjaXr-rNg
```

#### 2-2. 복호화 모드 시뮬레이션 테스트

```bash
# 환경 변수 설정 후 서버 시작
export USE_DECRYPT_MODE=true
cd KakaoWebTalk
node server/index.js
```

**또는 systemd 서비스 사용 시**:

```bash
# 서비스 파일 수정
sudo nano /etc/systemd/system/webkakao.service

# Environment 변수 추가
[Service]
Environment="USE_DECRYPT_MODE=true"

# 서비스 재시작
sudo systemctl daemon-reload
sudo systemctl restart webkakao
```

**로그 확인**:
```
[EXPERIMENTAL] Using decrypt mode simulation (APK .a() method)
[CRYPTO_ALTERNATIVE] RawBytes: ..., DecryptedBytes: ..., ResultLen: ...
```

### 방법 3: 웹 인터페이스에서 테스트

1. 브라우저에서 로그인 페이지 접속
2. 이메일과 비밀번호 입력
3. 로그인 시도
4. 서버 로그 확인

## 📊 테스트 결과 비교

### 테스트 케이스 1: 일반 암호화 모드 (Base64URL)

**설정**: `USE_DECRYPT_MODE` 미설정 또는 `false`

**예상 결과**:
- Password: Base64URL 형식 (22자)
- 로그인: status: -404 (현재 상태)

### 테스트 케이스 2: 복호화 모드 시뮬레이션

**설정**: `USE_DECRYPT_MODE=true`

**예상 결과**:
- Password: Base64URL 형식 (다른 값)
- 로그인: 성공 또는 다른 에러

## 🔍 로그 분석 포인트

### 성공 시 확인 사항

```
[KakaoAuth Success] HTTP 200 - User ID: [숫자]
```

### 실패 시 확인 사항

```
[KakaoAuth Warning] Message: [에러 메시지]
[Full Response]: {"message":"...","status":-404}
```

### Password 값 비교

**일반 암호화 모드**:
```
password: tRcNpdoftAae_tjaXr-rNg
```

**복호화 모드 시뮬레이션**:
```
password: [다른 값]
```

## ⚠️ 주의사항

1. **복호화 모드 시뮬레이션은 논리적으로 실패할 가능성이 높습니다**
   - 평문 비밀번호를 복호화 모드로 처리하는 것은 의미가 없음
   - 하지만 APK 코드가 실제로 이 방식을 사용한다면 성공할 수 있음

2. **테스트 후 원래 설정으로 복구**
   ```bash
   # 환경 변수 제거
   unset USE_DECRYPT_MODE
   
   # 또는 서비스 파일에서 Environment 제거
   sudo systemctl daemon-reload
   sudo systemctl restart webkakao
   ```

## 📝 결과 기록

테스트 결과를 다음 형식으로 기록하세요:

```markdown
## 테스트 결과

### 일반 암호화 모드
- Password 값: [값]
- 길이: [길이]
- 결과: [성공/실패]
- 에러: [에러 메시지]

### 복호화 모드 시뮬레이션
- Password 값: [값]
- 길이: [길이]
- 결과: [성공/실패]
- 에러: [에러 메시지]

### 비교
- 두 방식의 차이: [차이점]
```

