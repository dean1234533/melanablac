import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api.js";
import { optimizedImage } from "../shared/mediaPolicy.js";
import { useSite, useSEO } from "./SiteContext.jsx";
import Gallery, { Lightbox } from "./Gallery.jsx";
import Video from "./Video.jsx";

const Loading = () => (
  <div className="center muted pad" role="status">
    Preparing the collection…
  </div>
);

export function Home() {
  const { t, featured, categories, loaded, error } = useSite();
  useSEO(t("seo.home.title"), t("seo.home.description"));
  const [feels, setFeels] = useState("");
  const reservedFilms = new Set([
    t("video.hero"),
    t("video.why"),
    t("video.pause"),
  ]);
  const motion = [
    ...new Set(
      t("video.motionList")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].filter((src) => !reservedFilms.has(src));
  const curated = [];
  const usedImages = new Set();
  const usedCategories = new Set();
  // Lead with different occasions, then fill remaining spaces with unique artwork.
  for (const diverse of [true, false]) {
    for (const product of featured) {
      const image = product.images?.[0];
      if (
        curated.length >= 4 ||
        !image ||
        usedImages.has(image) ||
        (diverse && usedCategories.has(product.category))
      )
        continue;
      curated.push(product);
      usedImages.add(image);
      usedCategories.add(product.category);
    }
  }
  const collectionCovers = {
    "Birthday Cards": [
      "happy-30th-birthday-silver-headwrap",
      "happy-21st-birthday-tune-in",
    ],
    "Christmas Cards": [
      "christmas-holiday-season-blessings",
      "christmas-a-season-of-grace",
    ],
    "Inspirational Cards": [
      "becoming-her-curls-and-gold",
      "becoming-her-locs-and-gold",
    ],
    "Mother's Day Cards": [
      "mother-s-day-the-original-queen",
      "mother-s-day-icon-of-grace",
    ],
    "Nativity Cards": [
      "nativity-emmanuel",
      "nativity-holy-family-by-starlight",
    ],
  };
  const collections = (
    categories.length ? categories : Object.keys(collectionCovers)
  ).map((name) => {
    const candidates = [
      ...(collectionCovers[name] || []).map(
        (slug) => "/art/cards/" + slug + ".webp",
      ),
      ...featured.filter((p) => p.category === name).map((p) => p.images?.[0]),
    ];
    const image = candidates.find((src) => src && !usedImages.has(src));
    if (image) usedImages.add(image);
    return { name, image };
  });
  return (
    <>
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="gold-rule" />
            {t("home.kicker")}
          </p>
          <h1>
            {t("home.title").toLowerCase() === "art beyond boundaries" ? (
              <>
                Art beyond
                <br />
                <em>boundaries.</em>
              </>
            ) : (
              t("home.title")
            )}
          </h1>
          <p className="hero-description">{t("home.tagline")}</p>
          <Link to="/shop" className="btn primary">
            {t("home.cta")}
          </Link>
          <div className="hero-footnote">
            <span className="mini-mark">m.</span>
            <p>
              Rooted in culture.
              <br />
              <strong>Created to be felt.</strong>
            </p>
          </div>
        </div>
        <div className="hero-art">
          {t("video.hero") ? (
            <Video
              src={t("video.hero")}
              lazy={false}
              label="Inside the MelanaBlac gallery"
            />
          ) : (
            <img
              src="/video/welcome.webp"
              alt="A contemporary gallery of black and gold artwork"
            />
          )}
          <div className="hero-art-caption">
            <span>THE MELANABLAC WORLD</span>
            <span>Art. Identity. Expression.</span>
          </div>
        </div>
      </section>
      <div className="brand-values">
        <span>Original illustration</span>
        <b aria-hidden="true">✦</b>
        <span>Rooted in culture</span>
        <b aria-hidden="true">✦</b>
        <span>Made for meaningful moments</span>
        <b aria-hidden="true">✦</b>
        <span>Independent creativity</span>
      </div>
      <section className="section selected-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / THE CURATED EDIT</p>
            <h2>
              Small pieces.
              <br />
              <em>Powerful stories.</em>
            </h2>
          </div>
          <div>
            <p>
              For the milestones, the everyday moments,
              <br />
              and the people who mean everything.
            </p>
            <Link to="/shop" className="text-link">
              View the collection
            </Link>
          </div>
        </div>
        {error ? (
          <div className="collection-error" role="alert">
            <p>We couldn’t load the collection. Please try again shortly.</p>
            <Link to="/shop" className="text-link">
              Try the collection
            </Link>
          </div>
        ) : loaded ? (
          curated.length ? (
            <div className="curated-grid">
              {curated.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <p className="muted">
              New pieces are on their way. Come back soon.
            </p>
          )
        ) : (
          <Loading />
        )}
      </section>
      <section className="artist-editorial">
        <div className="artist-media">
          {t("video.why") ? (
            <Video
              src={t("video.why")}
              label="Art and expression in the MelanaBlac studio"
            />
          ) : (
            <img
              src="/video/why.webp"
              alt="Inside the MelanaBlac creative world"
              loading="lazy"
            />
          )}
          <span className="image-note">THE STORY BEHIND THE ART</span>
        </div>
        <div className="artist-copy">
          <p className="eyebrow">02 / COLOUR. CULTURE. COURAGE.</p>
          <h2>
            More than art.
            <br />
            <em>A way of being.</em>
          </h2>
          <p>{t("home.welcomeBody")}</p>
          <div className="artist-quote">
            <span aria-hidden="true">“</span>
            <p>{t("home.whyBody")}</p>
          </div>
          <Link to="/about" className="text-link">
            Meet the artist
          </Link>
        </div>
      </section>
      <section className="section collections-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / SOMETHING FOR EVERY STORY</p>
            <h2>
              A moment worth
              <br />
              <em>celebrating.</em>
            </h2>
          </div>
          <Link to="/shop" className="text-link">
            Shop all cards
          </Link>
        </div>
        <div className="collection-tiles">
          {collections.map(({ name: category, image }, i) => (
            <Link
              to={"/shop?category=" + encodeURIComponent(category)}
              className="collection-tile"
              key={category}
            >
              <div>
                {image ? (
                  <img
                    src={image}
                    loading="lazy"
                    alt={category + " illustrated collection"}
                  />
                ) : (
                  <span className="collection-monogram" aria-hidden="true">
                    M.
                  </span>
                )}
                <span className="tile-number">0{i + 1}</span>
              </div>
              <h3>
                {category}
              </h3>
            </Link>
          ))}
        </div>
      </section>
      {motion.length > 0 && (
        <section className="section motion-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / STEP INSIDE</p>
              <h2>{t("video.motionTitle")}</h2>
            </div>
            <p>
              A different perspective.
              <br />
              The same unmistakable soul.
            </p>
          </div>
          <div className="motion-grid">
            {motion.map((src, i) => (
              <div key={src}>
                <Video src={src} label={"Gallery film " + (i + 1)} />
                <p>
                  <span>0{i + 1}</span> A study in expression
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="pause-editorial">
        <p className="eyebrow">A MOMENT, JUST FOR YOU</p>
        {t("video.pause") && (
          <div className="pause-art">
            <Video
              src={t("video.pause")}
              label="A moment to pause and reflect"
            />
          </div>
        )}
        <h2>{t("home.pauseTitle")}</h2>
        <p>{t("home.pauseBody")}</p>
        <div
          className="feels"
          role="group"
          aria-label="How does the art make you feel?"
        >
          {["Empowered", "Seen", "Calm", "Curious", "Moved"].map((f) => (
            <button
              key={f}
              className={"chip" + (feels === f ? " on" : "")}
              aria-pressed={feels === f}
              onClick={() => setFeels(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {feels && (
          <p role="status" className="feeling-response">
            Art that makes you feel {feels.toLowerCase()} belongs in your world.{" "}
            <Link to="/shop">Find your piece</Link>
          </p>
        )}
      </section>
    </>
  );
}

export function Shop() {
  const { t, categories } = useSite();
  useSEO(t("seo.shop.title"), t("seo.shop.description"));
  const [params, setParams] = useSearchParams();
  const cat = params.get("category") || "";
  const [products, setProducts] = useState(null);
  const [view, setView] = useState("grid");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    setProducts(null);
    api("products" + (cat ? `?category=${encodeURIComponent(cat)}` : ""))
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [cat]);
  return (
    <section className="section">
      <p className="eyebrow center">THE MELANABLAC COLLECTION</p>
      <h1 className="section-title">{t("shop.title")}</h1>
      <p className="center lead">{t("shop.intro")}</p>
      <div className="filters">
        <button
          className={"chip" + (!cat ? " on" : "")}
          aria-pressed={!cat}
          onClick={() => setParams({})}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={"chip" + (cat === c ? " on" : "")}
            aria-pressed={cat === c}
            onClick={() => setParams({ category: c })}
          >
            {c}
          </button>
        ))}
        <span className="spacer" />
        <button
          className={"chip" + (view === "grid" ? " on" : "")}
          aria-pressed={view === "grid"}
          onClick={() => setView("grid")}
        >
          Shop view
        </button>
        <button
          className={"chip" + (view === "gallery" ? " on" : "")}
          aria-pressed={view === "gallery"}
          onClick={() => setView("gallery")}
        >
          Gallery view
        </button>
      </div>
      {error && <p className="err center">{error}</p>}
      {error ? (
        <p className="center">
          <button className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>
        </p>
      ) : !products ? (
        <Loading />
      ) : view === "gallery" ? (
        <Gallery products={products} />
      ) : products.length === 0 ? (
        <p className="center muted">Nothing in this category yet.</p>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProductCard({ p }) {
  const { money, add } = useSite();
  const [added, setAdded] = useState(false);
  return (
    <article className="card">
      <Link to={`/product/${p.slug}`} className="card-img">
        <img src={p.images[0]} alt={p.title} loading="lazy" />
        {p.stock <= 0 && <span className="sold">Sold out</span>}
      </Link>
      <div className="card-body">
        <p className="card-category">{p.category}</p>
        <h3>
          <Link to={`/product/${p.slug}`}>{p.title}</Link>
        </h3>
        <p className="price">{money(p.price_pence)}</p>
        <button
          className="btn small"
          disabled={p.stock <= 0}
          onClick={() => {
            add(p);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
        >
          {p.stock <= 0 ? "Sold out" : added ? "Added ✓" : "Add to basket"}
        </button>
      </div>
    </article>
  );
}

export function Product() {
  const { slug } = useParams();
  const { money, add, t } = useSite();
  const [p, setP] = useState(undefined);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    setP(undefined);
    setImg(0);
    api("products/" + slug)
      .then(setP)
      .catch(() => setP(null));
  }, [slug]);
  useSEO(
    p ? p.seo_title || `${p.title} | ${t("site.name")}` : "Artwork",
    p ? p.seo_description || p.description.slice(0, 155) : "",
  );
  if (p === undefined) return <Loading />;
  if (!p)
    return (
      <section className="section center">
        <h1 className="section-title">Artwork not found</h1>
        <Link className="btn" to="/shop">
          Back to shop
        </Link>
      </section>
    );
  const imgs = p.images.length ? p.images : [];
  return (
    <section className="section product">
      <div className="p-gallery">
        <button
          className="p-main"
          onClick={() => imgs.length && setZoom(true)}
          aria-label="Enlarge image"
        >
          {imgs[img] ? (
            <img src={imgs[img]} alt={p.title} />
          ) : (
            <div className="noimg">No image</div>
          )}
        </button>
        {imgs.length > 1 && (
          <div className="thumbs">
            {imgs.map((s, k) => (
              <button
                key={s}
                className={k === img ? "on" : ""}
                onClick={() => setImg(k)}
                aria-label={`Image ${k + 1}`}
              >
                <img src={s} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-info">
        <p className="kicker">{p.category}</p>
        <h1>{p.title}</h1>
        <p className="price big">{money(p.price_pence)}</p>
        <p className="desc">{p.description}</p>
        <p className="muted">
          {p.stock > 0
            ? p.stock <= 3
              ? `Only ${p.stock} left`
              : "In stock"
            : "Sold out"}
        </p>
        {p.stock > 0 && (
          <div className="buy">
            <label>
              Qty{" "}
              <input
                type="number"
                min="1"
                max={p.stock}
                value={qty}
                onChange={(e) =>
                  setQty(
                    Math.max(
                      1,
                      Math.min(p.stock, parseInt(e.target.value) || 1),
                    ),
                  )
                }
              />
            </label>
            <button
              className="btn gold"
              onClick={() => {
                add(p, qty);
                setAdded(true);
              }}
            >
              {added ? "Added ✓" : "Add to basket"}
            </button>
            {added && (
              <button className="btn" onClick={() => nav("/cart")}>
                View basket
              </button>
            )}
          </div>
        )}
        <p className="muted small">{t("shop.shipping")}</p>
      </div>
      {zoom && (
        <Lightbox
          items={imgs.map((s) => ({ image: s, title: p.title }))}
          start={img}
          onClose={() => setZoom(false)}
        />
      )}
    </section>
  );
}

export function Cart() {
  const { cart, setQty, remove, total, money } = useSite();
  useSEO("Your basket | MelanaBlac", "");
  if (!cart.length)
    return (
      <section className="section center">
        <h1 className="section-title">Your basket is empty</h1>
        <Link to="/shop" className="btn gold">
          Browse the gallery
        </Link>
      </section>
    );
  return (
    <section className="section narrow">
      <h1 className="section-title">Your basket</h1>
      {cart.map((i) => (
        <div className="cart-row" key={i.id}>
          <img src={optimizedImage(i.image)} alt="" />
          <div>
            <Link to={`/product/${i.slug}`}>{i.title}</Link>
            <p className="muted">{money(i.price_pence)}</p>
          </div>
          <input
            type="number"
            min="1"
            max={i.stock || 10}
            value={i.qty}
            aria-label={`Quantity for ${i.title}`}
            onChange={(e) => setQty(i.id, parseInt(e.target.value) || 1)}
          />
          <b>{money(i.price_pence * i.qty)}</b>
          <button
            className="link"
            onClick={() => remove(i.id)}
            aria-label={`Remove ${i.title}`}
          >
            Remove
          </button>
        </div>
      ))}
      <p className="total">
        Total <b>{money(total)}</b>
      </p>
      <p className="right">
        <Link to="/checkout" className="btn gold">
          Checkout
        </Link>
      </p>
    </section>
  );
}

export function Checkout() {
  const { cart, total, money, clear } = useSite();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    postcode: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useSEO("Checkout | MelanaBlac", "");
  if (!cart.length)
    return (
      <section className="section center">
        <h1 className="section-title">Your basket is empty</h1>
        <Link to="/shop" className="btn">
          Shop
        </Link>
      </section>
    );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("checkout", {
        method: "POST",
        body: {
          name: f.name,
          email: f.email,
          address: {
            line1: f.line1,
            line2: f.line2,
            city: f.city,
            postcode: f.postcode,
          },
          items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        },
      });
      clear();
      if (r.redirect) window.location.href = r.redirect;
      else nav("/order/" + r.number);
    } catch (e2) {
      setError(e2.message);
      setBusy(false);
    }
  };
  return (
    <section className="section narrow">
      <h1 className="section-title">Checkout</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Full name
          <input
            required
            value={f.name}
            onChange={set("name")}
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={f.email}
            onChange={set("email")}
            autoComplete="email"
          />
        </label>
        <label>
          Address line 1
          <input
            required
            value={f.line1}
            onChange={set("line1")}
            autoComplete="address-line1"
          />
        </label>
        <label>
          Address line 2
          <input
            value={f.line2}
            onChange={set("line2")}
            autoComplete="address-line2"
          />
        </label>
        <div className="two">
          <label>
            Town / city
            <input
              required
              value={f.city}
              onChange={set("city")}
              autoComplete="address-level2"
            />
          </label>
          <label>
            Postcode
            <input
              required
              value={f.postcode}
              onChange={set("postcode")}
              autoComplete="postal-code"
            />
          </label>
        </div>
        <p className="total">
          Order total <b>{money(total)}</b>
        </p>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button className="btn gold" disabled={busy}>
          {busy ? "Placing order…" : "Place order"}
        </button>
      </form>
    </section>
  );
}

export function OrderDone() {
  const { number } = useParams();
  const { money } = useSite();
  const [o, setO] = useState(undefined);
  useSEO("Order confirmed | MelanaBlac", "");
  useEffect(() => {
    api("order/" + number)
      .then(setO)
      .catch(() => setO(null));
  }, [number]);
  if (o === undefined) return <Loading />;
  if (!o)
    return (
      <section className="section center">
        <h1 className="section-title">Order not found</h1>
      </section>
    );
  return (
    <section className="section narrow center">
      <h1 className="section-title">Thank you, {o.name.split(" ")[0]}!</h1>
      <p className="lead">
        Order <b>{o.number}</b> is{" "}
        {o.status === "awaiting_payment"
          ? "awaiting payment confirmation"
          : "confirmed"}
        . Total {money(o.total_pence)}.
      </p>
      <ul className="plain">
        {o.items.map((i) => (
          <li key={i.id}>
            {i.qty} × {i.title}
          </li>
        ))}
      </ul>
      <Link to="/shop" className="btn">
        Keep browsing
      </Link>
    </section>
  );
}

export function About() {
  const { t } = useSite();
  useSEO(t("seo.about.title"), t("seo.about.description"));
  const placeholder = t("about.body").startsWith("Write your story here");
  const body = placeholder
    ? t("home.welcomeBody") + "\n" + t("home.whyBody")
    : t("about.body");
  return (
    <>
      <section className="section story-heading">
        <p className="eyebrow">THE MELANABLAC STORY</p>
        <h1>
          Rooted in culture.
          <br />
          <em>Created with soul.</em>
        </h1>
        <p>Art is a way of seeing. A way of feeling. A way of being seen.</p>
      </section>
      <section className="artist-editorial about-editorial">
        <div className="artist-media">
          <img src="/video/why.webp" alt="Art in the MelanaBlac gallery" />
        </div>
        <div className="artist-copy">
          <p className="eyebrow">COLOUR. CULTURE. COURAGE.</p>
          <h2>{t("about.title")}</h2>
          {body
            .split("\n")
            .filter(Boolean)
            .map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          <Link className="text-link" to="/shop">
            Explore the collection
          </Link>
        </div>
      </section>
      <section className="pause-editorial">
        <p className="eyebrow">LET’S CREATE A CONNECTION</p>
        <h2>
          Every story starts
          <br />
          <em>with a conversation.</em>
        </h2>
        <Link className="btn" to="/contact">
          Get in touch
        </Link>
      </section>
    </>
  );
}

export function Contact() {
  const { t } = useSite();
  useSEO(t("seo.contact.title"), t("seo.contact.description"));
  const [f, setF] = useState({ name: "", email: "", body: "", website: "" });
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: false, error: "" });
    try {
      await api("contact", { method: "POST", body: f });
      setState({ busy: false, done: true, error: "" });
      setF({ name: "", email: "", body: "", website: "" });
    } catch (er) {
      setState({ busy: false, done: false, error: er.message });
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="section narrow">
      <p className="eyebrow center">ENQUIRIES & COMMISSIONS</p>
      <h1 className="section-title">{t("contact.title")}</h1>
      <p className="center lead">{t("contact.body")}</p>
      {state.done ? (
        <p className="center ok" role="status">
          Thank you. Your message has been sent.
        </p>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            Name
            <input required value={f.name} onChange={set("name")} />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={f.email}
              onChange={set("email")}
            />
          </label>
          <label>
            Message
            <textarea required rows="6" value={f.body} onChange={set("body")} />
          </label>
          <input
            className="hp"
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
            value={f.website}
            onChange={set("website")}
          />
          {state.error && (
            <p className="err" role="alert">
              {state.error}
            </p>
          )}
          <button className="btn gold" disabled={state.busy}>
            {state.busy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}

export const NotFound = () => (
  <section className="section center">
    <h1 className="section-title">Page not found</h1>
    <Link className="btn" to="/">
      Home
    </Link>
  </section>
);
