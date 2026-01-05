#!/bin/bash

# 빠른 테스트 스크립트
# 복호화 모드 시뮬레이션 테스트

echo "=========================================="
echo "Password 암호화 방식 테스트"
echo "=========================================="
echo ""

# 테스트 1: 일반 암호화 모드
echo "[테스트 1] 일반 암호화 모드 (Base64URL)"
echo "----------------------------------------"
unset USE_DECRYPT_MODE
node test_password_encryption.js 2>&1 | grep -A 5 "테스트 1"
echo ""

# 테스트 2: 복호화 모드 시뮬레이션
echo "[테스트 2] 복호화 모드 시뮬레이션"
echo "----------------------------------------"
export USE_DECRYPT_MODE=true
node test_password_encryption.js 2>&1 | grep -A 5 "테스트 2"
echo ""

echo "=========================================="
echo "테스트 완료"
echo "=========================================="

