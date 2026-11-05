import React, { useState, useRef } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useSite } from "./SiteContext.jsx";
import "./storefront.css";

function BrandLogo() {
  return (
    <img
      className="brand-logo"
      src="/logo-dark.png"
      alt="MelanaBlac"
      width="1000"
      height="226"
    />
  );
}
export default function Layout() {
  const { t, count } = useSite();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const logoClicks = useRef({ count: 0, last: 0 });
  const openStudio = (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const now = performance.now();
    const clicks = logoClicks.current;
    clicks.count = now - clicks.last <= 1200 ? clicks.count + 1 : 1;
    clicks.last = now;
    if (clicks.count === 3) {
      event.preventDefault();
      clicks.count = 0;
      navigate("/admin/login");
    }
  };
  React.useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  React.useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <div className="storefront">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        Art with a story. Cards with meaning.{" "}
        <span>
          Discover the MelanaBlac collection
        </span>
      </div>
      <header className="nav">
        <Link
          to="/"
          className="logo"
          aria-label="MelanaBlac home"
          onClick={openStudio}
        >
          <BrandLogo />
        </Link>
        <nav id="main-nav" className={open ? "open" : ""} aria-label="Main">
          {[
            ["/", "Home"],
            ["/shop", "The Collection"],
            ["/about", "Our Story"],
            ["/contact", "Get in Touch"],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <Link
            to="/cart"
            className="cart-link"
            aria-label={`Basket, ${count} items`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              aria-hidden="true"
            >
              <path d="M5 7h14l1 14H4L5 7Z" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" />
            </svg>
            <span>Bag ({count})</span>
          </Link>
          <button
            className="burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="main-nav"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <i />
            <i />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-top">
          <div>
            <p className="eyebrow">A little art. A lasting feeling.</p>
            <h2>
              Make room for
              <br />
              <em>something meaningful.</em>
            </h2>
            <Link className="text-link" to="/shop">
              Explore the collection
            </Link>
          </div>
          <div className="footer-navigation">
            <div>
              <p className="eyebrow">Explore</p>
              <Link to="/shop">The Collection</Link>
              <Link to="/about">Our Story</Link>
              <Link to="/contact">Get in Touch</Link>
              <Link to="/cart">Your Bag</Link>
            </div>
            <div>
              <p className="eyebrow">Connect</p>
              <Link to="/contact">
                Enquiries & commissions
              </Link>
              {t("site.instagram") && (
                <a
                  href={t("site.instagram")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              )}
              <p>{t("site.footer")}</p>
            </div>
          </div>
        </div>
        <div className="footer-brand">
          <Link to="/" aria-label="MelanaBlac home">
            <BrandLogo />
          </Link>
          <span>Colour. Culture. Courage.</span>
        </div>
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} {t("site.name")}. All rights reserved.
          </small>
          <small>All artwork is original and protected by copyright.</small>
          <small>Made to mean more.</small>
        </div>
      </footer>
    </div>
  );
}
