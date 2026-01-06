// public/app.js
console.log("[app.js] 스크립트 시작");

const socket = io();

socket.on('connect', () => {
    console.log(`[Socket] 서버 연결 성공: ${socket.id}`);
});

socket.on('disconnect', () => {
    console.log("[Socket] 서버 연결 끊김");
});

// 로그인 함수
function tryLogin() {
    console.log("[Login] 시도 함수 진입");
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
        console.error("[Login] 입력창을 찾을 수 없습니다.");
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
    }

    console.log(`[Login] 요청 전송: ${email}`);
    socket.emit('auth:login', {
        email: email,
        password: password
    });
}

// 이벤트 위임 사용 (동적 요소/타이밍 문제 해결의 만능열쇠)
document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'loginBtn') {
        console.log("[Click] 로그인 버튼 클릭 감지됨");
        event.preventDefault(); // 기본 동작(혹시 모를 submit) 방지
        tryLogin();
    }
});

// 엔터키 지원 (이벤트 위임)
document.addEventListener('keypress', (event) => {
    if (event.target && event.target.id === 'password' && event.key === 'Enter') {
        console.log("[Key] 비밀번호 창 엔터 감지됨");
        tryLogin();
    }
});

// 서버 응답 핸들러
socket.on('auth:success', (data) => {
    console.log("[Login] 성공!", data);
    const d = new Date();
    d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = `kakao_session=${data.sessionId};${expires};path=/`;
    window.location.href = '/chat';
});

socket.on('auth:fail', (data) => {
    console.error("[Login] 실패:", data);
    alert(`로그인 실패: ${data.message}`);
});
