import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/login.css";
import logo from "/logo.png"; // Adjust path if needed

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  const res = await fetch("http://localhost:8000/api/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // important!
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    // wait 100ms to ensure cookie is set
    setTimeout(() => navigate("/dashboard"), 100);
  } else {
    alert(data.message);
  }
};



  return (
    <div className="login-hero">
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit} style={{ minWidth: "400px" }}>
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "150px",
              height: "50px",
              marginBottom: "1rem",
              display: "block",
            }}
          />
          <h2 className="login-title">Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
          <button type="submit" className="log-btn">
            Login
          </button>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "1.5rem",
              width: "100%",
            }}
          >
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/")}
              style={{
                flex: 1,
                padding: "0.75rem 0",
                fontSize: "1rem",
                borderRadius: "8px",
                border: "none",
                background: "#CCCECD",
                color: "#303030",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
                transition: "background 0.2s",
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="signup-btn"
              onClick={() => navigate("/signup")}
              style={{
                flex: 1,
                padding: "0.75rem 0",
                fontSize: "1rem",
                borderRadius: "8px",
                border: "none",
                background: "#29543D",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
                transition: "background 0.2s",
              }}
            >
              Signup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;