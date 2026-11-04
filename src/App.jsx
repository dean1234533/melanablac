import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SiteProvider } from './site/SiteContext.jsx';
import Layout from './site/Layout.jsx';
import { Home, Shop, Product, Cart, Checkout, OrderDone, About, Contact, NotFound } from './site/pages.jsx';
const Admin = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<div className="center pad muted">Loading…</div>}><Admin /></Suspense>} />
      <Route path="*" element={<SiteProvider><Site /></SiteProvider>} />
    </Routes>
  );
}
function Site() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:number" element={<OrderDone />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
