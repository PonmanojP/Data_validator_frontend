import React, { useRef, useEffect, useState } from "react";
import "./css/About.css";

const About = () => {
  const contentRef = useRef(null);
  const [disableRadius, setDisableRadius] = useState(false);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        setDisableRadius(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  return (
    <div className="about-section" id="about">
      <div className={`about-circle${disableRadius ? " no-radius" : ""}`}>
        <div className={`about-content${disableRadius ? " rise" : ""}`} ref={contentRef}>
          <h2>About Us</h2>
          <p>
            AnonyMate is a cutting-edge platform designed to help organizations
            meet modern data privacy and security challenges. Our technology is
            built on a foundation of robust, industry-standard de-identification
            techniques, fully aligned with the principles of ISO/IEC 20889:2018.
            <br />
            <br />
            By leveraging advanced anonymization and de-identification methods,
            AnonyMate transforms sensitive data into a secure, privacy-compliant
            format. This allows for safe use in analytics, research, and machine
            learning without compromising individual privacy. We provide a
            comprehensive framework to reduce re-identification risk, ensuring
            your data remains both useful and secure.
            <br />
            <br />
            By leveraging advanced anonymization and de-identification methods,
            AnonyMate transforms sensitive data into a secure, privacy-compliant
            format. This allows for safe use in analytics, research, and machine
            learning without compromising individual privacy. We provide a
            comprehensive framework to reduce re-identification risk, ensuring
            your data remains both useful and secure.
            <br />
            <br />
            By leveraging advanced anonymization and de-identification methods,
            AnonyMate transforms sensitive data into a secure, privacy-compliant
            format. This allows for safe use in analytics, research, and machine
            learning without compromising individual privacy. We provide a
            comprehensive framework to reduce re-identification risk, ensuring
            your data remains both useful and secure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;