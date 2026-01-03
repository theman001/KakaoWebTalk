const socket = io();

// 로그인 버튼 이벤트 리스너
document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
    }

    console.log("[Socket] 로그인 요청 전송...");
    // 서버의 'login_request' 이벤트로 데이터 전송
    socket.emit('login_request', {
        userId: email,
        userPw: password
    });
});

// 서버로부터 로그인 결과 수신
socket.on('login_response', (data) => {
    if (data.success) {
        console.log("[Socket] 로그인 성공:", data.message);
        // 로그인 성공 시 채팅 페이지(/chat)로 이동
        window.location.href = '/chat';
    } else {
        console.error("[Socket] 로그인 실패:", data.message);
        alert("로그인 실패: " + data.message);
    }
});
