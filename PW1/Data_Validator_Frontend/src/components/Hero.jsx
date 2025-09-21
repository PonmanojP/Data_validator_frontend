import Navbar from "./Navbar"
import './css/Hero.css'

export default function Hero() {
    const handleGetStarted = () => {
        window.location.href = "/signup";
    };

    return (
        <div className="hero" id="hero" style={{ position: "relative", overflow: "hidden" }}>
            <Navbar />
            <div className="hero-container">
                <div className="pop1"><img src="https://cdn3d.iconscout.com/3d/premium/thumb/privacy-3d-icon-png-download-8342338.png" alt="" /></div>
                <div className="hero-center">
                    <h1>Protect What Matters: Identities,<br /> Trust, and Compliance.</h1>
                    <div className="hero-subline">
                        Protect What Matters: Identities, Trust, and Compliance.
                    </div>
                    <button className="get-started" onClick={handleGetStarted}>Get Started</button>
                </div>
                <div className="pop2"><img src="https://cdn3d.iconscout.com/3d/premium/thumb/privacy-3d-icon-png-download-8342338.png" alt="" /></div>
            </div>
        </div>
    )
}
