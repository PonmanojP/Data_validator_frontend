import { useState, useRef, useEffect } from "react";
import "./css/Dashboard.css";
import SideNavigation from "./SideNavigation";

export default function Dashboard() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [username, setUsername] = useState(""); // <-- NEW
  const [activePage, setActivePage] = useState("Dashboard");

  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  const maxFileSize = 10 * 1024 * 1024; // 10 MB

  // Handle file selection
  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter((file) => validateFile(file));
    if (newFiles.length === 0) return;

    const mapped = newFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: formatFileSize(file.size),
      preview: URL.createObjectURL(file),
    }));

    setFiles(mapped);
    startUpload(); // directly start upload
  };

  // Validation
  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      alert(`${file.name}: Only JPG, PNG, and GIF files are allowed.`);
      return false;
    }
    if (file.size > maxFileSize) {
      alert(`${file.name}: File size must be less than 10MB.`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    fetch("http://localhost:8000/api/user/", {
      method: "GET",
      credentials: "include", // <-- important for session cookie
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => setUsername(data.username))
      .catch(() => setUsername(""));
  }, []);

  // Upload simulation
  const startUpload = () => {
    setIsUploading(true);
    setProgress(0);
    setCompleted(false);

    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      if (current >= 100) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setCompleted(true);
        }, 500);
      } else {
        setProgress(current);
      }
    }, 300);
  };

  // Format size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Reset
  const resetUpload = () => {
    setFiles([]);
    setProgress(0);
    setCompleted(false);
    setIsUploading(false);
  };

  return (
    
      <div className="dashboard-layout">
      {/* Side / Bottom Navigation */}
      <SideNavigation onChange={setActivePage} />

      <main>
        {activePage === "Home" && (
          <div className="container">
      {!completed ? (
        <>
        <h1 className="greet">Hello {username || "Guest"}..Calculate Privacy Score Now..</h1>
        <div className="upload-container">
          
          <div
            className={`upload-box ${isUploading ? "uploading" : ""}`}
            onClick={() => fileInputRef.current.click()}
          >
            {!isUploading && (
              <div className="upload-content">
                <div className="upload-icon">⬆️</div>
                <h3 className="upload-title">
                  Drop files here or click to upload
                </h3>
                <p className="upload-subtitle">
                  Support for PNG, JPG and GIF files only.
                </p>
                <button
                  className="upload-button"
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                >
                  Choose Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              
            )}

            {isUploading && (
              <div className="upload-progress">
                <div className="progress-circle">
                  <span className="progress-text">{progress}%</span>
                </div>
                <p className="progress-label">Uploading files...</p>
              </div>
            )}
          </div>
        </div>
        </>
      ) : (
        <div className="upload-container">
          <div className="complete-header">
            <div className="success-icon">✓</div>
            <h3 className="complete-title">Your Privacy Score</h3>
            <p className="complete-subtitle">
              95%
            </p>
          </div>
          <div className="complete-actions">
            <button className="new-upload-btn" onClick={resetUpload}>
              Check Another
            </button>
            
          </div>
        </div>
      )}
    </div>
        )}
        {activePage === "Dashboard" && (
          <>
            {/* keep your upload UI here */}
          </>
        )}
        {activePage === "Explore" && (
          <h1 className="greet">Protect your data with AnonyMate</h1>
        )}
        {activePage === "Account" && (
          <></>
        )}
      </main>
    </div>
    
  );
}
