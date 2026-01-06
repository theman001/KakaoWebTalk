// public/app.js
alert("app.js loaded!"); // Debugging: 스크립트 로드 확인
const socket = io();

// DOM이 완전히 로드된 후 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    function tryLogin() {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert("이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }

        console.log("[Socket] 로그인 요청 전송...");
        // 규격 변경: login_request -> auth:login
        socket.emit('auth:login', {
            email: email,
            password: password
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', tryLogin);
    }

    // 엔터키 지원
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                tryLogin();
            }
        });
    }
});

// 규격 변경: login_response -> auth:success
socket.on('auth:success', (data) => {
    console.log("[Socket] 로그인 성공");
    // 서버 미들웨어 통과를 위해 쿠키 설정 (유효기간 1일)
    const d = new Date();
    d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = "kakao_session=" + data.sessionId + ";" + expires + ";path=/";

    // 페이지 이동
    window.location.href = '/chat';
});

socket.on('auth:fail', (data) => {
    console.error("로그인 실패:", data);
    alert("로그인 실패: " + data.message);
});

socket.on('connect', () => {
    console.log("[Socket] 서버에 연결되었습니다.");
});

socket.on('disconnect', () => {
    console.log("[Socket] 서버와 연결이 끊어졌습니다.");
});
