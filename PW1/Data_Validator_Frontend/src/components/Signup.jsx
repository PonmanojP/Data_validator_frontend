import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/login.css";
import logo from "/logo.png"; // Adjust path if needed

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle signup logic here
  };

const handleVerify = async (e) => {
  e.preventDefault();
  if (username && email && password && confirmPassword && password === confirmPassword) {
    const res = await fetch("http://localhost:8000/api/signup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("pendingEmail", email);
      navigate("/verify");
    } else {
      alert(data.message);
    }
  }
};



  return (
    <div className="login-hero">
      <div className="login-container">
        <form className="login-form" onSubmit={handleVerify} style={{ minWidth: "400px" }}>
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
          <h2 className="login-title">Sign Up</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            required
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            required
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="login-input"
          />
          <button type="submit" onClick = {handleVerify} className="log-btn">
            Sign Up
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
              onClick={() => navigate("/login")}
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
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default Signup;