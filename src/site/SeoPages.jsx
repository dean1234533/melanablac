import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useSite, useSEO } from "./SiteContext.jsx";
import { ProductCard, Loading, NotFound } from "./pages.jsx";
import { SEO_BY_PATH, SEO_PAGES, SITE_FAQ, matchesProduct } from "../shared/seoPages.js";

function Faq({ faqs }) {
  if (!faqs?.length) return null;
  return (
    <section className="seo-faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">Frequently asked questions</h2>
      {faqs.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </section>
  );
}

function Crumbs({ items }) {
  return (
    <nav className="seo-crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={it.path}>
          {i > 0 && " / "}
          {i < items.length - 1 ? <Link to={it.path}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SeoPage({ path }) {
  const page = SEO_BY_PATH[path];
  const { categories } = useSite();
  const [products, setProducts] = useState(null);
  useSEO(page?.title, page?.description);
  useEffect(() => {
    if (!page || page.kind === "guide" || page.kind === "hub") return;
    let active = true;
    api("products" + (page.category ? `?category=${encodeURIComponent(page.category)}` : ""))
      .then((all) => active && setProducts(all.filter((p) => matchesProduct(page, p))))
      .catch(() => active && setProducts([]));
    return () => { active = false; };
  }, [path]);
  if (!page) return <NotFound />;
  const related = (page.related || []).map((r) => SEO_BY_PATH[r]).filter(Boolean);
  const crumbs = [{ name: "Home", path: "/" }, ...(page.kind === "hub" || page.kind === "guide" ? [] : [{ name: "Cards", path: "/cards" }]), { name: page.h1, path }];
  const wantsProducts = page.kind === "category" || page.kind === "filter";
  return (
    <section className="section seo-page">
      <Crumbs items={crumbs} />
      <p className="eyebrow center">{page.kind === "guide" ? "GUIDE" : "THE MELANABLAC COLLECTION"}</p>
      <h1 className="section-title">{page.h1}</h1>
      <div className="seo-prose">
        {page.intro.map((t) => <p key={t}>{t}</p>)}
      </div>
      {wantsProducts && (products === null ? <Loading /> : products.length === 0 ? <p className="center muted">New designs are coming soon.</p> : <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>)}
      {page.kind === "hub" && (
        <div className="seo-prose">
          <h2>Shop by occasion</h2>
          <ul className="seo-links">
            {SEO_PAGES.filter((p) => p.kind === "category").map((p) => <li key={p.path}><Link to={p.path}>{p.h1}</Link><span>{p.description}</span></li>)}
          </ul>
          <h2>Guides</h2>
          <ul className="seo-links">
            {SEO_PAGES.filter((p) => p.kind === "guide").map((p) => <li key={p.path}><Link to={p.path}>{p.h1}</Link><span>{p.description}</span></li>)}
          </ul>
        </div>
      )}
      {page.sections.map((s) => (
        <div className="seo-prose" key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((t) => <p key={t}>{t}</p>)}
          {s.links && <ul className="seo-links inline">{s.links.map((l) => <li key={l.path}><Link to={l.path}>{l.label}</Link></li>)}</ul>}
        </div>
      ))}
      <Faq faqs={page.faqs} />
      {related.length > 0 && (
        <div className="seo-prose">
          <h2>You might also like</h2>
          <ul className="seo-links inline">
            {related.map((r) => <li key={r.path}><Link to={r.path}>{r.h1}</Link></li>)}
            <li><Link to="/shop">Shop all cards</Link></li>
          </ul>
        </div>
      )}
    </section>
  );
}

export function FaqPage() {
  const { t } = useSite();
  useSEO(`FAQ | ${t("site.name")}`, "Card size, what is inside, delivery, commissions and how to contact MelanaBlac.");
  return (
    <section className="section seo-page">
      <Crumbs items={[{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]} />
      <p className="eyebrow center">HELP</p>
      <h1 className="section-title">Frequently asked questions</h1>
      <Faq faqs={SITE_FAQ(t)} />
      <p className="center"><Link className="text-link" to="/contact">Still have a question? Get in touch</Link></p>
    </section>
  );
}
