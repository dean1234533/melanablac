import React, { useEffect, useState, useRef } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { api, uploadImage, uploadVideo } from "../api.js";
import { CONTENT_FIELDS, formatPrice } from "../shared/contentSchema.js";
import { InstallSteps, _d } from "./InstallBanner.jsx";
import "./admin.css";
import {
  registerSW,
  enablePush,
  disablePush,
  currentSub,
  pushSupported,
} from "./push.js";

function useNoIndex() {
  useEffect(() => {
    document.title = "MelanaBlac Studio";
    let m = document.querySelector("link[rel=manifest]");
    if (!m) {
      m = document.createElement("link");
      m.rel = "manifest";
      m.href = "/admin/manifest.webmanifest";
      document.head.appendChild(m);
    }
    let a = document.querySelector("link[rel=apple-touch-icon]");
    if (!a) {
      a = document.createElement("link");
      a.rel = "apple-touch-icon";
      a.href = "/admin/apple-touch-icon.png";
      document.head.appendChild(a);
    }
    let robots = document.querySelector('meta[name="robots"]');
    const createdRobots = !robots;
    const previousRobots = robots?.getAttribute("content");
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex,nofollow");
    document.body.classList.add("admin-body");
    return () => {
      document.body.classList.remove("admin-body");
      if (createdRobots) robots.remove();
      else if (previousRobots === null) robots.removeAttribute("content");
      else robots.setAttribute("content", previousRobots);
    };
  }, []);
}

function Flash({ msg, kind = "ok" }) {
  return msg ? (
    <p
      className={kind === "ok" ? "ok" : "err"}
      role={kind === "ok" ? "status" : "alert"}
    >
      {msg}
    </p>
  ) : null;
}

export default function AdminApp() {
  useNoIndex();
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    registerSW();
    const verify = () =>
      api("admin/me")
        .then((r) => setMe(r.email))
        .catch((e) => {
          if (e.status === 401) setMe(null);
          else setMe((current) => (current === undefined ? null : current));
        });
    const expire = () => setMe(null);
    verify();
    window.addEventListener("focus", verify);
    window.addEventListener("mb-admin-session-expired", expire);
    return () => {
      window.removeEventListener("focus", verify);
      window.removeEventListener("mb-admin-session-expired", expire);
    };
  }, []);
  if (me === undefined) return <div className="center pad muted">Loading…</div>;
  return (
    <div className="admin-workspace">
      <Routes>
        <Route path="forgot" element={<Forgot />} />
        <Route path="reset" element={<Reset />} />
        <Route path="login" element={<Login onLogin={setMe} />} />
        <Route
          path="*"
          element={
            me ? (
              <Shell me={me} onLogout={() => setMe(null)} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}

function AdminIcon({ name = "grid" }) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    image: "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M8 7h.01",
    slides: "M4 4h16v16H4z M1 7v10 M23 7v10",
    text: "M4 5h16 M12 5v15 M8 20h8",
    search: "M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    bag: "M5 7h14l1 14H4z M8 7V6a4 4 0 0 1 8 0v1",
    mail: "M3 5h18v14H3z M3 5l9 8 9-8",
    lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    plus: "M12 5v14 M5 12h14",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
function AuthBox({ title, children }) {
  return (
    <div className="auth">
      <section className="auth-story">
        <Link to="/" aria-label="MelanaBlac home">
          <img src="/logo.png" alt="MelanaBlac" width="220" height="50" />
        </Link>
        <div>
          <p className="admin-eyebrow">THE MELANABLAC STUDIO</p>
          <h2>
            A space for
            <br />
            your <em>creative world.</em>
          </h2>
          <p>
            Your artwork, your stories, your business.
            <br />
            All together, beautifully.
          </p>
        </div>
        <span>COLOUR. CULTURE. COURAGE.</span>
      </section>
      <section className="auth-form-area">
        <Link to="/" className="auth-back">
          Back to the gallery
        </Link>
        <div className="auth-card">
          <span className="auth-lock">
            <AdminIcon name="lock" />
          </span>
          <p className="admin-eyebrow">PRIVATE STUDIO ACCESS</p>
          <h1>{title}</h1>
          {children}
          <p className="auth-security">
            <AdminIcon name="lock" /> Password protected · Private to your
            account
          </p>
        </div>
        <small>
          © {new Date().getFullYear()} MelanaBlac. Made to mean more.
        </small>
      </section>
    </div>
  );
}

function Login({ onLogin }) {
  const nav = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api("admin/login", { method: "POST", body: f });
      onLogin(r.email);
      nav("/admin/", { replace: true });
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <AuthBox title="Welcome back.">
      <p className="muted">
        Sign in to manage your collection and the moments it creates.
      </p>
      <Flash msg={location.state?.message} />
      <form className="form" onSubmit={submit} aria-busy={busy}>
        <label>
          Username
          <input
            type="text"
            required
            autoComplete="username"
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value })}
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              required
              maxLength="200"
              autoComplete="current-password"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <Flash msg={err} kind="err" />
        <button className="btn gold auth-signin admin-button-effect" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="center">
          <Link to="/admin/forgot">Forgot password?</Link>
        </p>
      </form>
    </AuthBox>
  );
}

function Forgot() {
  const [email, setEmail] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      setRes(await api("admin/forgot", { method: "POST", body: { email } }));
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };
  return (
    <AuthBox title="Reset your password">
      {res ? (
        <>
          <Flash msg={res.message} />
          {res.devLink && (
            <p className="small">
              Dev mode link: <a href={res.devLink}>{res.devLink}</a>
            </p>
          )}
          <p className="center">
            <Link to="/admin/login">Back to sign in</Link>
          </p>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="muted">
            Enter your admin email and we will email you a link to set a new
            password.
          </p>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Flash msg={err} kind="err" />
          <button className="btn gold" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="center">
            <Link to="/admin/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthBox>
  );
}

function Reset() {
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("Passwords do not match.");
    try {
      await api("admin/reset", {
        method: "POST",
        body: { token: q.get("token"), password: pw },
      });
      setDone(true);
      setTimeout(() => nav("/admin/login"), 1800);
    } catch (x) {
      setErr(x.message);
    }
  };
  return (
    <AuthBox title="Choose a new password">
      {done ? (
        <Flash msg="Password updated. Redirecting to sign in…" />
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            New password (10+ characters)
            <input
              type="password"
              minLength="10"
              required
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              minLength="10"
              required
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </label>
          <Flash msg={err} kind="err" />
          <button className="btn gold">Update password</button>
        </form>
      )}
    </AuthBox>
  );
}

function Shell({ me, onLogout }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [menu, setMenu] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const nav = useNavigate();
  const location = useLocation();
  const loadStats = () => {
    setStatsError("");
    api("admin/stats")
      .then(setStats)
      .catch((e) => {
        if (e.status === 401) onLogout();
        else setStatsError(e.message);
      });
  };
  useEffect(loadStats, [location.pathname]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const logout = async () => {
    setLogoutError("");
    try {
      await api("admin/logout", { method: "POST" });
      onLogout();
      nav("/admin/login");
    } catch (e) {
      setLogoutError(e.message);
    }
  };
  const links = [
    ["", "Overview", "grid"],
    ["products", "Artwork", "image"],
    ["slides", "Slides", "slides"],
    ["content", "Site text", "text"],
    ["seo", "SEO", "search"],
    ["orders", "Orders", "bag"],
    ["messages", "Messages", "mail"],
    ["settings", "Settings", "lock"],
  ];
  const current =
    links.find(
      ([path]) => path && location.pathname.startsWith("/admin/" + path),
    )?.[1] || "Overview";
  return (
    <div className="shell">
      {menu && (
        <button
          className="admin-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside id="studio-nav" className={"side" + (menu ? " open" : "")}>
        <Link
          className="side-logo"
          to="/admin/"
          aria-label="MelanaBlac Studio home"
        >
          <img src="/logo-dark.png" alt="MelanaBlac" width="170" height="38" />
        </Link>
        <p className="admin-eyebrow side-caption">THE STUDIO</p>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Studio navigation">
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={"/admin/" + to} end={!to}>
              <AdminIcon name={icon} />
              <span>{label}</span>
              {label === "Orders" && stats?.newOrders > 0 && (
                <b className="badge">{stats.newOrders}</b>
              )}
              {label === "Messages" && stats?.unread > 0 && (
                <b className="badge">{stats.unread}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="side-gallery">
          <p>
            Your creative world,
            <br />
            <em>out in the world.</em>
          </p>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <AdminIcon name="eye" /> View your gallery
          </a>
        </div>
        <div className="side-foot">
          <span className="account-avatar">M</span>
          <div>
            <b>Studio owner</b>
            <small>{me}</small>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="burger"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="studio-nav"
            onClick={() => setMenu(!menu)}
          >
            <i />
            <i />
          </button>
          <p>
            <span>Studio</span>
            <span aria-hidden="true">/</span>
            {current}
          </p>
          <div className="topbar-actions">
            <span className="secure-label">
              <AdminIcon name="lock" /> Private workspace
            </span>
            <button className="link" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content" id="studio-content">
          <Flash msg={logoutError} kind="err" />
          <Flash msg={statsError} kind="err" />
          {statsError && (
            <button className="btn small" onClick={loadStats}>
              Retry overview
            </button>
          )}
          <Routes>
            <Route index element={<Dashboard stats={stats} />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="slides" element={<Slides />} />
            <Route
              path="content"
              element={
                <ContentEditor
                  groups={(g) => !g.startsWith("SEO")}
                  title="Site text"
                />
              }
            />
            <Route
              path="seo"
              element={
                <ContentEditor
                  groups={(g) => g.startsWith("SEO")}
                  title="SEO settings"
                  note="Per-artwork SEO title and description are set on each artwork's edit page."
                />
              }
            />
            <Route path="orders" element={<Orders />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
          <footer className="studio-footer">
            <span>MelanaBlac Studio</span>
            <span>A little art. A lasting feeling.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ stats }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    Promise.all([
      api("admin/notifications"),
      api("admin/orders"),
      api("admin/products"),
    ])
      .then(([notes, orders, products]) => setData({ notes, orders, products }))
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  const cards = stats
    ? [
        [
          "Published artwork",
          stats.published,
          `${stats.products} pieces in your collection`,
          "products",
          "image",
        ],
        [
          "New orders",
          stats.newOrders,
          "Ready for your attention",
          "orders",
          "bag",
        ],
        [
          "Sales revenue",
          formatPrice(stats.revenue),
          "Paid, shipped & completed orders",
          "orders",
          "grid",
        ],
        [
          "Unread messages",
          stats.unread,
          "Conversations waiting for you",
          "messages",
          "mail",
        ],
      ]
    : [];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="admin-eyebrow">YOUR STUDIO, AT A GLANCE</p>
          <h1>Studio overview</h1>
          <p className="muted">A little organisation. More room to create.</p>
        </div>
        <Link className="btn gold admin-button-effect" to="/admin/products/new">
          Add artwork
        </Link>
      </div>
      <div className="studio-welcome">
        <div>
          <p className="admin-eyebrow">MAKE SOMETHING MEANINGFUL</p>
          <h2>
            Your next story
            <br />
            <em>starts here.</em>
          </h2>
          <p>
            Share a new piece, celebrate a moment,
            <br />
            and keep your creative world moving.
          </p>
          <Link to="/admin/products/new" className="btn">
            Add to your collection
          </Link>
        </div>
        <img
          src="/art/cards/becoming-her-curls-and-gold.webp"
          alt="Illustrated portrait from the MelanaBlac collection"
        />
      </div>
      {!stats ? (
        <p role="status" className="muted">
          Loading your studio…
        </p>
      ) : (
        <div className="stats">
          {cards.map(([label, value, detail, to, icon]) => (
            <Link key={label} to={"/admin/" + to} className="stat">
              <span>
                {label}
                <AdminIcon name={icon} />
              </span>
              <b>{value}</b>
              <small>{detail}</small>
            </Link>
          ))}
        </div>
      )}
      <Flash msg={error} kind="err" />
      {error && (
        <button className="btn small" onClick={load}>
          Try again
        </button>
      )}
      <div className="dashboard-columns">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <p className="admin-eyebrow">THE LATEST</p>
              <h2>Recent orders</h2>
            </div>
            <Link to="/admin/orders">View all orders</Link>
          </div>
          {!data ? (
            <p className="muted">
              {error ? "Orders could not be loaded." : "Loading orders…"}
            </p>
          ) : !data.orders.length ? (
            <div className="admin-empty">
              <AdminIcon name="bag" />
              <h3>Your next chapter is on its way.</h3>
              <p>New orders will appear here, ready to be made special.</p>
            </div>
          ) : (
            <div className="recent-orders">
              {data.orders.slice(0, 5).map((order) => (
                <Link to="/admin/orders" key={order.id}>
                  <span>
                    <b>{order.number}</b>
                    <small>{order.name}</small>
                  </span>
                  <span className={"order-status status-" + order.status}>
                    {order.status.replaceAll("_", " ")}
                  </span>
                  <strong>{formatPrice(order.total_pence)}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="admin-panel studio-checklist">
          <p className="admin-eyebrow">A LITTLE HOUSEKEEPING</p>
          <h2>Studio essentials</h2>
          <Link to="/admin/products">
            <span>Low stock artwork</span>
            <b>{stats?.lowStock ?? "—"}</b>
          </Link>
          <Link to="/admin/settings">
            <span>Password protection</span>
            <b className="status-good">Active</b>
          </Link>
          <Link to="/admin/settings">
            <span>Order emails</span>
            <b
              className={
                stats?.emailConfigured ? "status-good" : "status-pending"
              }
            >
              {stats ? (stats.emailConfigured ? "Connected" : "Set up") : "—"}
            </b>
          </Link>
          <Link to="/admin/settings">
            <span>Card payments</span>
            <b
              className={
                stats?.stripeConfigured ? "status-good" : "status-pending"
              }
            >
              {stats ? (stats.stripeConfigured ? "Connected" : "Set up") : "—"}
            </b>
          </Link>
          <p className="muted small">
            Manage your password and notifications in Settings.
          </p>
        </section>
      </div>
      <section className="admin-panel collection-preview">
        <div className="panel-heading">
          <div>
            <p className="admin-eyebrow">YOUR CREATIVE WORLD</p>
            <h2>In the collection</h2>
          </div>
          <Link to="/admin/products">Manage artwork</Link>
        </div>
        {data?.products.length ? (
          <div className="admin-art-grid">
            {data.products.slice(0, 4).map((p) => (
              <Link key={p.id} to={"/admin/products/" + p.id}>
                <div>
                  <img src={p.images[0]} alt={p.title} loading="lazy" />
                </div>
                <h3>{p.title}</h3>
                <span>
                  {p.category} · {formatPrice(p.price_pence)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            {data
              ? "Add your first artwork to begin your collection."
              : "Loading collection…"}
          </p>
        )}
      </section>
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>Recent activity</h2>
          <Link to="/admin/messages">View messages</Link>
        </div>
        {data?.notes.length ? (
          <ul className="activity-list">
            {data.notes.slice(0, 4).map((n) => (
              <li key={n.id}>
                <AdminIcon name="mail" />
                <div>
                  <Link to={n.url}>{n.title}</Link>
                  <p>{n.body}</p>
                </div>
                <time>{n.created_at}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {data
              ? "Your studio activity will appear here."
              : "Loading activity…"}
          </p>
        )}
      </section>
    </>
  );
}

const emptyP = {
  title: "",
  description: "",
  price_pence: 0,
  category: "Gallery",
  images: [],
  stock: 1,
  status: "published",
  featured: 0,
  seo_title: "",
  seo_description: "",
  sort: 0,
};

function Products() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const load = () =>
    api("admin/products")
      .then(setList)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  const del = async (p) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await api("admin/products/" + p.id, { method: "DELETE" });
    load();
  };
  return (
    <>
      <div className="row">
        <h1>Artwork</h1>
        <Link className="btn gold admin-button-effect" to="/admin/products/new">
          + Add artwork
        </Link>
      </div>
      <div className="inventory-toolbar">
        <label>
          Search artwork
          <input
            type="search"
            placeholder="Search title or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All artwork</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </label>
      </div>
      <Flash msg={err} kind="err" />
      {!list ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No artwork yet. Add your first piece.</p>
      ) : (
        <div className="table">
          {list
            .filter(
              (p) =>
                (status === "all" || p.status === status) &&
                (p.title + " " + p.category)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((p) => (
              <div className="trow" key={p.id}>
                <img src={p.images[0]} alt="" />
                <div className="grow">
                  <b>{p.title}</b>
                  <br />
                  <span className="muted">
                    {p.category} · {formatPrice(p.price_pence)} · stock{" "}
                    {p.stock} · {p.status}
                    {p.featured ? " · featured" : ""}
                  </span>
                </div>
                <Link className="btn small" to={`/admin/products/${p.id}`}>
                  Edit
                </Link>
                <button className="btn small danger" onClick={() => del(p)}>
                  Delete
                </button>
              </div>
            ))}
          {list.length > 0 &&
            !list.some(
              (p) =>
                (status === "all" || p.status === status) &&
                (p.title + " " + p.category)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            ) && <p className="muted">No artwork matches your search.</p>}
        </div>
      )}
    </>
  );
}

function ImageUploader({ images, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setErr("");
    try {
      const urls = [];
      for (const f of files) urls.push((await uploadImage(f)).url);
      onChange([...images, ...urls]);
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };
  const move = (i, d) => {
    const a = [...images];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  return (
    <div>
      <div className="imgs">
        {images.map((u, i) => (
          <div className="img-tile" key={u + i}>
            <img src={u} alt={`Image ${i + 1}`} />
            <div>
              <button
                type="button"
                className="link"
                onClick={() => move(i, -1)}
                aria-label="Move earlier"
              >
                Earlier
              </button>
              <button
                type="button"
                className="link"
                onClick={() => move(i, 1)}
                aria-label="Move later"
              >
                Later
              </button>
              <button
                type="button"
                className="link"
                onClick={() => onChange(images.filter((_, k) => k !== i))}
              >
                Remove
              </button>
            </div>
            {i === 0 && <span className="tag">Main</span>}
          </div>
        ))}
      </div>
      <label className="btn small file">
        {busy ? "Compressing & uploading…" : "+ Upload images"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={pick}
          disabled={busy}
          hidden
        />
      </label>
      <Flash msg={err} kind="err" />
    </div>
  );
}

function ProductEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(id ? null : emptyP);
  const [price, setPrice] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (id)
      api("admin/products").then((l) => {
        const f = l.find((x) => String(x.id) === id);
        if (f) {
          setP(f);
          setPrice((f.price_pence / 100).toFixed(2));
        } else setErr("Artwork not found");
      });
  }, [id]);
  if (!p)
    return (
      <>
        <Flash msg={err} kind="err" />
        {!err && <p className="muted">Loading…</p>}
      </>
    );
  const set = (k) => (e) =>
    setP({
      ...p,
      [k]:
        e.target.type === "checkbox"
          ? e.target.checked
            ? 1
            : 0
          : e.target.value,
    });
  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    const pence = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(pence) || pence < 0) {
      setErr("Enter a valid price, e.g. 85.00");
      setBusy(false);
      return;
    }
    if (
      !p.images.length &&
      !confirm("This artwork has no images. Save anyway?")
    ) {
      setBusy(false);
      return;
    }
    try {
      const body = { ...p, price_pence: pence };
      if (id) {
        await api("admin/products/" + id, { method: "PUT", body });
        setOk("Saved.");
      } else {
        await api("admin/products", { method: "POST", body });
        nav("/admin/products");
      }
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };
  return (
    <form className="form wide artwork-editor" onSubmit={save}>
      <div className="row">
        <div>
          <h1>{id ? "Edit artwork" : "Add artwork"}</h1>
          <p className="editor-intro">Add the details and images customers will see in your shop.</p>
        </div>
        <Link to="/admin/products">Back to artwork</Link>
      </div>
      <fieldset>
        <legend>Artwork details</legend>
        <label>
          Artwork title
          <input required value={p.title} onChange={set("title")} maxLength="200" placeholder="Give your artwork a name" />
        </label>
        <label>
          Description
          <textarea rows="5" value={p.description} onChange={set("description")} placeholder="Describe the artwork, its size, materials and what is included." />
          <small className="field-help">This is the description customers read on the artwork page.</small>
        </label>
        <label>
          Category
          <input list="cats" value={p.category} onChange={set("category")} />
          <datalist id="cats">
            <option>Birthday Cards</option>
            <option>Christmas Cards</option>
            <option>Inspirational Cards</option>
            <option>Mother's Day Cards</option>
            <option>Nativity Cards</option>
            <option>Gallery</option>
            <option>Prints</option>
          </datalist>
          <small className="field-help">Choose an existing category or type a new one.</small>
        </label>
      </fieldset>
      <fieldset>
        <legend>Artwork images</legend>
        <p className="field-help">Upload one or more photos. The first image is the main shop image. Images are compressed automatically.</p>
        <ImageUploader images={p.images} onChange={(images) => setP({ ...p, images })} />
      </fieldset>
      <fieldset>
        <legend>Price & availability</legend>
        <div className="two">
          <label>
            Price (£)
            <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4.50" />
          </label>
          <label>
            Quantity available
            <input type="number" min="0" value={p.stock} onChange={set("stock")} />
          </label>
        </div>
        <label>
          Visibility
          <select value={p.status} onChange={set("status")}>
            <option value="published">Visible in the shop</option>
            <option value="draft">Draft (hidden from the shop)</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={!!p.featured} onChange={set("featured")} />
          Feature on home page
        </label>
      </fieldset>
      <details className="editor-options">
        <summary>Optional settings <span>Google search & display order</span></summary>
        <div className="editor-options-body">
          <p className="field-help">You can skip this section. Google search details use your artwork title and description automatically unless you enter something different here.</p>
          <label>
            Google search title
            <input value={p.seo_title} onChange={set("seo_title")} maxLength="120" placeholder={`${p.title || "Artwork title"} | MelanaBlac`} />
            <small className={p.seo_title.length > 60 ? "warn" : "field-help"}>Optional · aim for up to 60 characters{p.seo_title ? ` (${p.seo_title.length} entered)` : ""}</small>
          </label>
          <label>
            Google search summary
            <textarea rows="3" value={p.seo_description} onChange={set("seo_description")} maxLength="320" placeholder={p.description.slice(0, 155) || "Your artwork description will be used automatically."} />
            <small className={p.seo_description.length > 160 ? "warn" : "field-help"}>Optional · aim for up to 160 characters{p.seo_description ? ` (${p.seo_description.length} entered)` : ""}</small>
          </label>
          <label>
            Display position
            <input type="number" value={p.sort} onChange={set("sort")} />
            <small className="field-help">Smaller numbers appear first in the shop. Leave at 0 if the order does not matter.</small>
          </label>
        </div>
      </details>
      <Flash msg={err} kind="err" />
      <Flash msg={ok} />
      <div className="editor-actions">
        <button className="btn gold admin-button-effect" disabled={busy}>{busy ? "Saving…" : "Save artwork"}</button>
        <Link to="/admin/products">Cancel</Link>
      </div>
    </form>
  );
}

function Slides() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const load = () =>
    api("admin/slides")
      .then(setList)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { url } = await uploadImage(f);
      await api("admin/slides", {
        method: "POST",
        body: {
          image: url,
          title: "",
          subtitle: "",
          link: "/shop",
          sort: list?.length || 0,
        },
      });
      load();
    } catch (x) {
      setErr(x.message);
    }
  };
  const upd = (s, patch) =>
    setList(list.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
  const save = async (s) => {
    try {
      await api("admin/slides/" + s.id, { method: "PUT", body: s });
      setErr("");
      load();
    } catch (x) {
      setErr(x.message);
    }
  };
  const del = async (s) => {
    if (confirm("Delete this slide?")) {
      await api("admin/slides/" + s.id, { method: "DELETE" });
      load();
    }
  };
  return (
    <>
      <div className="row">
        <h1>Home slides</h1>
        <label className="btn gold file">
          + Add slide
          <input type="file" hidden accept="image/*" onChange={add} />
        </label>
      </div>
      <Flash msg={err} kind="err" />
      {!list ? (
        <p className="muted">Loading…</p>
      ) : (
        list.map((s) => (
          <div className="slide-edit" key={s.id}>
            <img src={s.image} alt="" />
            <div className="form">
              <label>
                Title
                <input
                  value={s.title}
                  onChange={(e) => upd(s, { title: e.target.value })}
                />
              </label>
              <label>
                Subtitle
                <input
                  value={s.subtitle}
                  onChange={(e) => upd(s, { subtitle: e.target.value })}
                />
              </label>
              <div className="two">
                <label>
                  Link (e.g. /shop)
                  <input
                    value={s.link}
                    onChange={(e) => upd(s, { link: e.target.value })}
                  />
                </label>
                <label>
                  Order
                  <input
                    type="number"
                    value={s.sort}
                    onChange={(e) => upd(s, { sort: e.target.value })}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn small gold" onClick={() => save(s)}>
                  Save
                </button>
                <button className="btn small danger" onClick={() => del(s)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function VideoUpload({ onUpload, disabled, setUploading }) {
  const input = useRef(null);
  const preview = useRef(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    setProgress("Preparing video…");
    try {
      const result = await uploadVideo(file, setProgress, preview.current);
      onUpload(result.url);
      setProgress("Compressed video ready. Save changes to publish it.");
    } catch (e) {
      setError(e.message);
      setProgress("");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="video-upload">
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
        hidden
        onChange={pick}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn small"
        onClick={() => input.current.click()}
        disabled={disabled}
      >
        Upload video
      </button>
      <small className="muted">
        Compressed automatically. Clips up to 30 seconds.
      </small>
      {progress && (
        <p role="status" className="muted small">
          {progress}
        </p>
      )}
      <div className="compression-preview" ref={preview} />
      <Flash msg={error} kind="err" />
    </div>
  );
}

function ContentEditor({ groups, title, note }) {
  const fields = CONTENT_FIELDS.filter((f) => groups(f.group));
  const [vals, setVals] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    api("admin/content")
      .then(setVals)
      .catch((e) => setErr(e.message));
  }, []);
  if (!vals)
    return (
      <>
        <Flash msg={err} kind="err" />
        <p className="muted">Loading…</p>
      </>
    );
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const body = {};
      fields.forEach((f) => (body[f.key] = vals[f.key]));
      await api("admin/content", { method: "PUT", body });
      setOk("Saved. Changes are live on the site.");
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };
  const names = [...new Set(fields.map((f) => f.group))];
  return (
    <form className="form wide" onSubmit={save}>
      <h1>{title}</h1>
      {note && <p className="muted">{note}</p>}
      {names.map((g) => (
        <fieldset key={g}>
          <legend>{g}</legend>
          {fields
            .filter((f) => f.group === g)
            .map((f) => {
              const isT = f.key.endsWith(".title"),
                isD = f.key.endsWith(".description");
              const L = vals[f.key]?.length || 0;
              return (
                <div key={f.key}>
                  <label>
                    {f.label}
                    {f.multiline ? (
                      <textarea
                        rows="4"
                        value={vals[f.key] || ""}
                        onChange={(e) =>
                          setVals({ ...vals, [f.key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        value={vals[f.key] || ""}
                        onChange={(e) =>
                          setVals({ ...vals, [f.key]: e.target.value })
                        }
                      />
                    )}
                    {((isT && f.group.startsWith("SEO")) ||
                      (isD && f.group.startsWith("SEO"))) && (
                      <small
                        className={L > (isT ? 60 : 160) ? "warn" : "muted"}
                      >
                        {L}/{isT ? 60 : 160} recommended
                      </small>
                    )}
                  </label>
                  {[
                    "video.hero",
                    "video.welcome",
                    "video.why",
                    "video.pause",
                    "video.motionList",
                  ].includes(f.key) && (
                    <VideoUpload
                      disabled={busy || uploading}
                      setUploading={setUploading}
                      onUpload={(url) =>
                        setVals((current) => ({
                          ...current,
                          [f.key]:
                            f.key === "video.motionList"
                              ? [current[f.key], url].filter(Boolean).join("\n")
                              : url,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
        </fieldset>
      ))}
      <Flash msg={err} kind="err" />
      <Flash msg={ok} />
      <button className="btn gold" disabled={busy || uploading}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Orders() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const load = () =>
    api("admin/orders")
      .then(setList)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  const setStatus = async (o, status) => {
    try {
      await api("admin/orders/" + o.id, { method: "PUT", body: { status } });
      load();
    } catch (x) {
      setErr(x.message);
    }
  };
  return (
    <>
      <h1>Orders</h1>
      <Flash msg={err} kind="err" />
      {!list ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        list.map((o) => (
          <div className="order" key={o.id}>
            <div className="row">
              <b>{o.number}</b>
              <span className="muted">{o.created_at}</span>
              <span className="grow" />
              <select
                aria-label={`Status for ${o.number}`}
                value={o.status}
                onChange={(e) => setStatus(o, e.target.value)}
              >
                {[
                  "new",
                  "awaiting_payment",
                  "paid",
                  "shipped",
                  "completed",
                  "cancelled",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <p>
              {o.name} · <a href={`mailto:${o.email}`}>{o.email}</a>
            </p>
            <p className="muted">
              {[
                o.address.line1,
                o.address.line2,
                o.address.city,
                o.address.postcode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <ul className="plain">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.qty} × {i.title} — {formatPrice(i.price_pence * i.qty)}
                </li>
              ))}
            </ul>
            <b>Total {formatPrice(o.total_pence)}</b>
          </div>
        ))
      )}
    </>
  );
}

function Messages() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const load = () =>
    api("admin/messages")
      .then(setList)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  const read = async (m) => {
    await api("admin/messages/" + m.id, { method: "PUT" });
    load();
  };
  const del = async (m) => {
    if (confirm("Delete this message?")) {
      await api("admin/messages/" + m.id, { method: "DELETE" });
      load();
    }
  };
  return (
    <>
      <h1>Messages</h1>
      <Flash msg={err} kind="err" />
      {err && (
        <button
          className="btn"
          onClick={() => {
            setErr("");
            load();
          }}
        >
          Try again
        </button>
      )}
      {!list ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No messages yet.</p>
      ) : (
        list.map((m) => (
          <div className={"order" + (m.is_read ? "" : " unread")} key={m.id}>
            <div className="row">
              <b>{m.name}</b> <a href={`mailto:${m.email}`}>{m.email}</a>
              <span className="grow" />
              <span className="muted">{m.created_at}</span>
            </div>
            <p className="pre">{m.body}</p>
            <div className="row">
              {!m.is_read && (
                <button className="btn small" onClick={() => read(m)}>
                  Mark read
                </button>
              )}
              <button className="btn small danger" onClick={() => del(m)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function Settings() {
  const nav = useNavigate();
  const [sub, setSub] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pmsg, setPmsg] = useState("");
  const [perr, setPerr] = useState("");
  useEffect(() => {
    currentSub().then(setSub);
  }, []);
  const on = async () => {
    setErr("");
    setMsg("");
    try {
      setSub(await enablePush());
      setMsg("Push notifications enabled on this device.");
    } catch (x) {
      setErr(x.message);
    }
  };
  const off = async () => {
    await disablePush();
    setSub(null);
    setMsg("Push notifications turned off for this device.");
  };
  const test = async () => {
    setErr("");
    try {
      const r = await api("admin/push/test", { method: "POST" });
      setMsg(
        r.pushed
          ? `Sent to ${r.pushed} device(s).`
          : "Saved, but no device was reachable. Is push configured?",
      );
    } catch (x) {
      setErr(x.message);
    }
  };
  const chg = async (e) => {
    e.preventDefault();
    setPerr("");
    setPmsg("");
    try {
      await api("admin/password", { method: "POST", body: pw });
      window.dispatchEvent(new Event("mb-admin-session-expired"));
      nav("/admin/login", {
        replace: true,
        state: { message: "Password updated. Sign in with your new password." },
      });
    } catch (x) {
      setPerr(x.message);
    }
  };
  const install = async () => {
    if (_d) {
      await _d.prompt();
      await _d.userChoice;
    }
  };
  return (
    <>
      <h1>Settings</h1>
      <fieldset className="form wide">
        <legend>Push notifications</legend>
        <p className="muted">
          Get a notification on this device when an order or message arrives.
        </p>
        {!pushSupported() && (
          <p className="warn">
            This browser does not support push. On iPhone/iPad, add the app to
            your Home Screen first (iOS 16.4+).
          </p>
        )}
        <div className="row">
          {sub ? (
            <button className="btn" onClick={off}>
              Turn off
            </button>
          ) : (
            <button className="btn gold" onClick={on}>
              Enable notifications
            </button>
          )}
          <button className="btn" onClick={test}>
            Send test
          </button>
        </div>
        <p className="muted small">
          Status: {sub ? "on for this device" : "off"}
        </p>
        <Flash msg={msg} />
        <Flash msg={err} kind="err" />
      </fieldset>
      <fieldset className="form wide">
        <legend>Install the app</legend>
        <InstallSteps onInstall={install} />
      </fieldset>
      <form className="form wide" onSubmit={chg}>
        <fieldset>
          <legend>Change password</legend>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </label>
          <label>
            New password (10+ characters)
            <input
              type="password"
              minLength="10"
              autoComplete="new-password"
              required
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </label>
          <Flash msg={pmsg} />
          <Flash msg={perr} kind="err" />
          <button className="btn gold">Change password</button>
        </fieldset>
      </form>
    </>
  );
}
