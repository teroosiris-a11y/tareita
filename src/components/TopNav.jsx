import { NavLink } from "react-router-dom";
import "./TopNav.css";

export default function TopNav({ links, title = "", rightSlot = "" }) {
  return (
    <header className="topnav">
      <div className="topnav__logo-slot" aria-label="Espacio de logo izquierda">
        {title || "LOGO"}
      </div>

      <nav className="topnav__links" aria-label="Navegación principal">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `topnav__link ${isActive ? "topnav__link--active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="topnav__logo-slot topnav__logo-slot--right" aria-label="Espacio de logo derecha">
        {rightSlot || "LOGO"}
      </div>
    </header>
  );
}
