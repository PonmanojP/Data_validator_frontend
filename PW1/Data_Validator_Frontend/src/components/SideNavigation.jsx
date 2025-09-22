// SideNavigation.jsx
import { useState } from "react";
import "./css/SideNavigation.css"; // move your nav CSS here

const navItems = [
  { label: "Dashboard", icon: "dashboard", color: "#fbbc05" },
  { label: "Home", icon: "lock", color: "#ea4335" },
  { label: "Explore", icon: "shield", color: "#34a853" },
  { label: "Account", icon: "account_box", color: "#4285f4" },
];

export default function SideNavigation({ onChange }) {
  const [active, setActive] = useState("Dashboard");

  const handleClick = (item) => {
    setActive(item.label);
    document.documentElement.style.setProperty("--color-main", item.color);
    onChange?.(item.label); // optional callback for parent
  };

  return (
    <nav className="bottom-navigation">
      {navItems.map((item) => (
        <section
          key={item.label}
          className={`bottom-navigation-destination ${
            active === item.label ? "active" : ""
          }`}
          data-destination-color={item.color}
          onClick={() => handleClick(item)}
        >
          <i className="material-icons">{item.icon}</i>
          <span className="bottom-navigation-label">{item.label}</span>
        </section>
      ))}
    </nav>
  );
}
