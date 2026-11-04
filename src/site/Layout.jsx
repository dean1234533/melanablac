import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSite } from './SiteContext.jsx';

export default function Layout() {
  const { t, count } = useSite();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  React.useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const links = [['/', 'Home'], ['/shop', 'Shop'], ['/about', 'The Artist'], ['/contact', 'Contact']];
  return (
    <>
      <header className="nav">
        <Link to="/" className="logo"><span>Melana</span>Blac</Link>
        <nav className={open ? 'open' : ''} aria-label="Main">
          {links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'}>{l}</NavLink>)}
          <Link to="/cart" className="cart-link" aria-label={`Basket, ${count} items`}>Basket{count > 0 && <b className="badge">{count}</b>}</Link>
        </nav>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /><i /></button>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="logo big"><span>Melana</span>Blac</div>
        <p>{t('site.footer')}</p>
        <div className="foot-links">
          <Link to="/shop">Shop</Link><Link to="/about">The Artist</Link><Link to="/contact">Contact</Link>
          {t('site.etsy') && <a href={t('site.etsy')} target="_blank" rel="noopener noreferrer">Etsy</a>}
          {t('site.instagram') && <a href={t('site.instagram')} target="_blank" rel="noopener noreferrer">Instagram</a>}
        </div>
        <small>© {new Date().getFullYear()} {t('site.name')}. All artwork is original and protected by copyright.</small>
      </footer>
    </>
  );
}
