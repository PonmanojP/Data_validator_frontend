import './css/Navbar.css';

function Navbar() {
  const handleScroll = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleSignup = () => {
    window.location.href = '/signup';
  };

  return (
    <nav className="navbar">
      <div className='logo'><img src="./logo.png" alt="" /></div>
      <ul className="links">
        <li onClick={() => handleScroll('hero')}>Home</li>
        <li onClick={() => handleScroll('about')}>About</li>
        <li onClick={() => handleScroll('faqs')}>FAQs</li>
      </ul>
      <div className='btn-group'>
        <button className='login-btn' onClick={handleLogin}>Login</button>
        <button className='signup-btn' onClick={handleSignup}>Get Started</button>
      </div>
    </nav>
  );
}

export default Navbar;