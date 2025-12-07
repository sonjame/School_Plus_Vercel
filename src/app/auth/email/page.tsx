"use client";

import { useState } from "react";

export default function EmailVerifyPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<"success" | "error" | "">("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [manualMode, setManualMode] = useState(false);

    const emailDomains = [
        "gmail.com",
        "naver.com",
        "kakao.com",
        "daum.net",
        "nate.com",
    ];

    const sendCode = async () => {
        const res = await fetch("/api/auth/email/send", {
            method: "POST",
            body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (data.success) {
            setSent(true);
            setStatus("success");
        } else {
            setStatus("error");
        }
    };

    const verifyCode = async () => {
        const res = await fetch("/api/auth/email/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
        });

        const data = await res.json();

        if (data.success) {
            // 서버가 보내준 redirect 주소로 이동
            window.location.href = data.redirect;
        } else {
            setStatus("error");
        }
    };


    const handleEmailChange = (v: string) => {
        setEmail(v);
        setStatus("");

        if (!manualMode) {
            if (v.includes("@")) setShowDropdown(true);
            else setShowDropdown(false);
        }
    };

    const chooseDomain = (domain: string) => {
        const [id] = email.split("@");
        setEmail(`${id}@${domain}`);
        setShowDropdown(false);
    };

    return (
        <div className="container">
            <div className="card">
                <h2 className="title">📧 이메일 인증</h2>
                <p className="subtitle">회원가입을 위해 이메일을 인증해주세요.</p>

                {!sent ? (
                    <>
                        <div className="input-wrapper">
                            <input
                                className="input"
                                placeholder="이메일 주소를 입력하세요"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                onFocus={() => email.includes("@") && setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            />

                            {/* 🔽 이메일 자동완성 */}
                            {showDropdown && email.includes("@") && (
                                <ul className="dropdown">
                                    {emailDomains.map((dom) => (
                                        <li key={dom} onClick={() => chooseDomain(dom)}>
                                            {email.split("@")[0]}@{dom}
                                        </li>
                                    ))}
                                    <li
                                        className="manual"
                                        onClick={() => {
                                            setManualMode(true);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        직접 입력
                                    </li>
                                </ul>
                            )}
                        </div>

                        {status === "error" && (
                            <p className="error">올바른 이메일을 입력해주세요.</p>
                        )}

                        <button onClick={sendCode} className="btn primary">
                            인증코드 보내기
                        </button>
                    </>
                ) : (
                    <>
                        <input
                            className="input"
                            placeholder="이메일로 받은 인증코드를 입력하세요"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                setStatus("");
                            }}
                        />

                        {status === "error" && (
                            <p className="error">인증코드가 올바르지 않습니다.</p>
                        )}

                        <button onClick={verifyCode} className="btn primary">
                            인증하기
                        </button>

                        <button onClick={sendCode} className="btn resend">
                            코드 다시 보내기 🔄
                        </button>
                    </>
                )}
            </div>

            {/* 스타일 */}
            <style jsx>{`
        .container {
          min-height: 100vh;
          background: #e3f2fd;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .card {
          width: 420px;
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          animation: fadeIn 0.3s ease-out;
          text-align: center;
        }

        .title {
          font-size: 22px;
          font-weight: 700;
          color: #4fc3f7;
        }

        .subtitle {
          font-size: 14px;
          color: #555;
          margin-top: 4px;
          margin-bottom: 20px;
        }

        .input-wrapper {
  position: relative;
  width: 100%; /* 🔥 드롭다운 위치도 정확해짐 */
}

        .input {
  width: 100%;
  padding: 12px;
  border: 1.5px solid #ccc;
  border-radius: 10px;
  font-size: 15px;
  outline-color: #4FC3F7;
  box-sizing: border-box; /* 🔥 칸 정확하게 맞추는 핵심 */
  margin-bottom: 8px; /* 아래 여백 추가 */
}

        /* 🔽 드롭다운 */
        .dropdown {
          position: absolute;
          top: 48px;
          left: 0;
          width: 100%;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          list-style: none;
          padding: 0;
          margin: 6px 0 0;
          z-index: 10;
        }

        .dropdown li {
          padding: 10px 12px;
          cursor: pointer;
        }

        .dropdown li:hover {
          background: #f1f1f1;
        }

        .dropdown .manual {
          color: #4fc3f7;
          font-weight: 600;
        }

        .btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          margin-top: 20px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .primary {
          background: #4fc3f7;
          color: white;
        }

        .resend {
          background: #e3f2fd;
          border: 1px solid #90caf9;
          color: #1976d2;
        }

        .error {
          font-size: 13px;
          color: #d32f2f;
          margin-top: 8px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    );
}
