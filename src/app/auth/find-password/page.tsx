"use client";

import { useState } from "react";

export default function FindPasswordPage() {
    const [method, setMethod] = useState("");  // 가입 방식
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [tempPw, setTempPw] = useState("");

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "14px",
        borderRadius: "12px",
        border: "1.5px solid #d0d7e2",
        fontSize: "15px",
        boxSizing: "border-box",
        marginTop: "14px",
    };

    const findPassword = () => {
        const users = JSON.parse(localStorage.getItem("users") || "[]");

        // 이메일 가입
        if (method === "email") {
            const idx = users.findIndex(
                (u: any) => u.username === username && u.email === email
            );

            if (idx === -1) {
                alert("아이디 또는 이메일이 일치하지 않습니다.");
                return;
            }

            // 임시 비밀번호 생성
            const newPw = "SC" + Math.floor(1000 + Math.random() * 9000);
            users[idx].password = newPw;

            localStorage.setItem("users", JSON.stringify(users));
            setTempPw(newPw);
        }

        // 구글 가입
        if (method === "google") {
            alert("구글 회원은 비밀번호가 없으며 구글 로그인을 이용해야 합니다.");
            return;
        }

        // 카카오 가입
        if (method === "kakao") {
            alert("카카오 회원은 비밀번호가 없으며 카카오 로그인을 이용해야 합니다.");
            return;
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#E3F2FD",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
            }}
        >
            <div
                style={{
                    width: "420px",
                    background: "white",
                    padding: "40px 30px",
                    borderRadius: 20,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
            >
                <h2
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#4FC3F7",
                        textAlign: "center",
                        marginBottom: 10,
                    }}
                >
                    🔐 비밀번호 찾기
                </h2>

                {/* 가입 방식 선택 */}
                <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    style={inputStyle}
                >
                    <option value="">가입 방식을 선택하세요</option>
                    <option value="email">📧 이메일로 가입</option>
                    <option value="google">🔵 구글로 가입</option>
                    <option value="kakao">🟡 카카오로 가입</option>
                </select>

                {/* 이메일 가입일 경우 입력칸 2개 */}
                {method === "email" && (
                    <>
                        <input
                            type="text"
                            placeholder="아이디를 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={inputStyle}
                        />

                        <input
                            type="email"
                            placeholder="가입한 이메일을 입력하세요"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                        />
                    </>
                )}

                {/* 버튼 */}
                {method && (
                    <button
                        onClick={findPassword}
                        style={{
                            width: "100%",
                            marginTop: 20,
                            padding: 14,
                            background: "#4FC3F7",
                            color: "white",
                            border: "none",
                            borderRadius: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        임시 비밀번호 발급
                    </button>
                )}

                {/* 결과창 */}
                {tempPw && (
                    <div
                        style={{
                            marginTop: 20,
                            padding: 16,
                            background: "#E3F2FD",
                            borderRadius: 12,
                            textAlign: "center",
                            border: "1px solid #bcdcff",
                            fontWeight: 600,
                        }}
                    >
                        ✔ 임시 비밀번호: <b>{tempPw}</b>
                        <br />
                        로그인 후 비밀번호를 꼭 변경하세요.
                    </div>
                )}
            </div>
        </div>
    );
}
