"use client";

import { useState } from "react";

export default function FindIdPage() {
    const [method, setMethod] = useState("");                // 가입 방식 선택
    const [email, setEmail] = useState("");                  // 이메일 가입 / 구글 가입
    const [foundId, setFoundId] = useState("");

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "14px",
        borderRadius: "12px",
        border: "1.5px solid #d0d7e2",
        fontSize: "15px",
        boxSizing: "border-box",
        marginTop: "14px",
    };

    const findId = () => {
        const users = JSON.parse(localStorage.getItem("users") || "[]");

        if (method === "email") {
            const user = users.find((u: any) => u.email === email);
            if (!user) return alert("해당 이메일로 가입한 회원이 없습니다.");
            setFoundId(user.username);
        }

        if (method === "google") {
            const user = users.find((u: any) => u.googleEmail === email);
            if (!user) return alert("해당 구글 계정으로 가입한 회원이 없습니다.");
            setFoundId(user.username);
        }

        if (method === "kakao") {
            alert("카카오 로그인 회원은 카카오 로그인을 통해 아이디를 확인하세요.");
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
                    🔍 아이디 찾기
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

                {/* 입력칸 조건부 렌더링 */}
                {method === "email" && (
                    <input
                        type="email"
                        placeholder="가입한 이메일을 입력하세요"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                    />
                )}

                {method === "google" && (
                    <input
                        type="email"
                        placeholder="구글 계정을 입력하세요"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                    />
                )}

                {method && (
                    <button
                        onClick={findId}
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
                        아이디 찾기
                    </button>
                )}

                {/* 찾은 아이디 표시 */}
                {foundId && (
                    <div
                        style={{
                            marginTop: 20,
                            padding: 16,
                            background: "#E3F2FD",
                            borderRadius: 12,
                            textAlign: "center",
                            fontWeight: 600,
                            border: "1px solid #bcdcff",
                        }}
                    >
                        ✔ 가입된 아이디: <b>{foundId}</b>
                    </div>
                )}
            </div>
        </div>
    );
}
