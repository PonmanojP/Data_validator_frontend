import React from 'react';
import '../components/css/Footer.css';
const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-text">
                    &copy; {new Date().getFullYear()} AnonyMate. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;