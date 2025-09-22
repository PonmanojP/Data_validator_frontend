import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Verify.css";
import logo from "/logo.png"; // Adjust path if needed

const Verify = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const navigate = useNavigate();

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length <= 1) {
      const newOtp = [...otp];
      newOtp[idx] = val;
      setOtp(newOtp);
      // Move to next input if value entered
      if (val && idx < 5) {
        document.getElementById(`otp-${idx + 1}`).focus();
      }
    }
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  const otpCode = otp.join(""); // convert array to string
  const email = localStorage.getItem("pendingEmail");

  const res = await fetch("https://pwbackend-1hax.onrender.com/api/verify/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp: otpCode }),
  });
  const data = await res.json();
  if (data.success) {
    alert("Account created successfully!");
    localStorage.removeItem("pendingEmail");
    navigate("/login");
  } else {
    alert(data.message);
  }
};


  return (
    <div className="verify-hero">
      <div className="verify-container">
        <form className="verify-form" onSubmit={handleSubmit}>
          <img
            src={logo}
            alt="Logo"
            className="verify-logo"
            style={{
              width: "150px",
              height: "50px",
              marginBottom: "1rem",
              display: "block",
            }}
          />
          <h2 className="verify-title">OTP Verification</h2>
          <p className="verify-desc">Enter the 6-digit code sent to your email</p>
          <div className="otp-inputs">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="otp-input"
                value={digit}
                onChange={(e) => handleChange(e, idx)}
                autoFocus={idx === 0}
              />
            ))}
          </div>
          <button type="submit" className="verify-btn-main">
            Create Account
          </button>
          <button
            type="button"
            className="home-btn"
            onClick={() => navigate("/")}
          >
            Home
          </button>
        </form>
      </div>
    </div>
  );
};

export default Verify;