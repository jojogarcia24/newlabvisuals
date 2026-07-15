import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.ATR_CONFIG;
const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
const app = document.getElementById("app");
const topRight = document.getElementById("topRight");

let me = null;        // profile row
let session = null;

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kindLabel = { photo: "Photo", video: "Video", matterport: "Matterport", document: "Document", other: "File" };
function toast(msg, isErr) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " toast--err" : "");
  setTimeout(() => (t.className = "toast"), 3200);
}
function spinner() { return `<div class="spinner"></div>`; }
function fmtBytes(b) { if (!b) return ""; const u = ["B", "KB", "MB", "GB"]; let i = 0; while (b >= 1024 && i < 3) { b /= 1024; i++; } return b.toFixed(b < 10 && i ? 1 : 0) + " " + u[i]; }
function guessKind(file) {
  const t = file.type || "";
  if (t.startsWith("image/")) return "photo";
  if (t.startsWith("video/")) return "video";
  return t.includes("pdf") || t.includes("document") ? "document" : "other";
}
function modal(title, bodyHTML, onSave, saveLabel = "Save") {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><h2 class="serif">${esc(title)}</h2>
    <div id="modalBody">${bodyHTML}</div>
    <div class="modal__foot">
      <button class="btn btn--ghost btn--sm" id="mCancel">Cancel</button>
      <button class="btn btn--accent btn--sm" id="mSave">${esc(saveLabel)}</button>
    </div></div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelector("#mCancel").onclick = close;
  root.querySelector(".modal-backdrop").addEventListener("click", (e) => { if (e.target.classList.contains("modal-backdrop")) close(); });
  root.querySelector("#mSave").onclick = async () => {
    const btn = root.querySelector("#mSave"); btn.disabled = true; btn.textContent = "Working…";
    try { const ok = await onSave(root.querySelector("#modalBody"), close); if (ok !== false) close(); }
    catch (e) { toast(e.message || String(e), true); btn.disabled = false; btn.textContent = saveLabel; }
  };
  return { close, root };
}

/* ---------------- boot ---------------- */
(async function init() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) { location.replace("index.html"); return; }
  const { data: prof } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  me = prof || { id: session.user.id, email: session.user.email, role: "client" };
  renderTopbar();
  if (me.role === "admin") renderAdmin(); else renderClient();
  registerServiceWorker();
})();

function renderTopbar() {
  topRight.innerHTML = `
    <span class="pill ${me.role === "admin" ? "pill--admin" : ""}">${me.role}</span>
    <span class="who">${esc(me.email || "")}</span>
    <button class="btn btn--ghost btn--sm" id="notifyBtn">Enable alerts</button>
    <button class="btn btn--ghost btn--sm" id="signOut">Sign out</button>`;
  document.getElementById("signOut").onclick = async () => { await sb.auth.signOut(); location.replace("index.html"); };
  document.getElementById("notifyBtn").onclick = enablePush;
  refreshNotifyBtn();
}

/* ---------------- push notifications ---------------- */
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("../sw.js", { scope: "../" }); }
  catch (_) { try { return await navigator.serviceWorker.register("../sw.js"); } catch (e) { return null; } }
}
function urlB64ToUint8(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function refreshNotifyBtn() {
  const btn = document.getElementById("notifyBtn"); if (!btn) return;
  if (!("PushManager" in window) || !("Notification" in window)) { btn.classList.add("hide"); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") { btn.textContent = "Alerts on"; btn.disabled = true; }
  } catch (_) {}
}
async function enablePush() {
  try {
    if (!("PushManager" in window)) return toast("Push not supported on this browser.", true);
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return toast("Notifications blocked. Enable them in your browser settings.", true);
    const reg = (await navigator.serviceWorker.ready) || (await registerServiceWorker());
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(cfg.VAPID_PUBLIC_KEY) });
    const j = sub.toJSON();
    await sb.from("push_subscriptions").upsert(
      { user_id: me.id, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: "endpoint" },
    );
    toast("Notifications enabled");
    refreshNotifyBtn();
  } catch (e) { toast(e.message || "Could not enable notifications", true); }
}

/* ================= CLIENT ================= */
async function renderClient() {
  const params = new URLSearchParams(location.search);
  if (params.get("property")) return renderClientProperty(params.get("property"));
  app.innerHTML = `<div class="page-head"><div><h1 class="serif">Your <em>Properties</em></h1>
    <p>Every shoot Donnie delivers for you lives here — view and download anytime.</p></div></div>${spinner()}`;
  const { data: props, error } = await sb.from("properties")
    .select("*, assets(count)").order("created_at", { ascending: false });
  if (error) { app.querySelector(".spinner").outerHTML = `<div class="empty"><h3>Couldn't load</h3><p>${esc(error.message)}</p></div>`; return; }
  if (!props.length) {
    app.querySelector(".spinner").outerHTML = `<div class="empty"><h3>Nothing here yet</h3><p>Your properties will appear here once Donnie adds them. You'll get an alert the moment new content lands.</p></div>`;
    return;
  }
  const cards = props.map((p) => {
    const n = p.assets?.[0]?.count ?? 0;
    return `<div class="card" data-open="${p.id}" style="cursor:pointer">
      <div class="card__media" data-cover="${p.cover_path || ""}">${p.cover_path ? "" : (p.label || "Property")}</div>
      <div class="card__body"><h3>${esc(p.address)}</h3>
        <div class="card__meta">${esc([p.city, p.state].filter(Boolean).join(", "))}${p.label ? " · " + esc(p.label) : ""}</div></div>
      <div class="card__foot"><span class="count">${n} asset${n === 1 ? "" : "s"}</span><span class="btn btn--ghost btn--sm">Open →</span></div>
    </div>`;
  }).join("");
  app.querySelector(".spinner").outerHTML = `<div class="grid">${cards}</div>`;
  app.querySelectorAll("[data-open]").forEach((el) => (el.onclick = () => { location.search = "?property=" + el.dataset.open; }));
  loadCovers();
}

async function loadCovers() {
  for (const el of document.querySelectorAll("[data-cover]")) {
    const path = el.dataset.cover; if (!path) continue;
    const { data } = await sb.storage.from("assets").createSignedUrl(path, 3600);
    if (data?.signedUrl) el.innerHTML = `<img src="${data.signedUrl}" alt="" />`;
  }
}

async function renderClientProperty(id) {
  app.innerHTML = `<a class="back-link" href="app.html">← All properties</a><div id="phead"></div>${spinner()}`;
  const { data: p } = await sb.from("properties").select("*").eq("id", id).single();
  if (!p) { app.innerHTML = `<a class="back-link" href="app.html">← All properties</a><div class="empty"><h3>Not found</h3></div>`; return; }
  document.getElementById("phead").innerHTML = `<div class="page-head"><div>
    <h1 class="serif">${esc(p.address)}</h1><p>${esc([p.city, p.state, p.zip].filter(Boolean).join(", "))}${p.label ? " · " + esc(p.label) : ""}</p></div></div>`;
  const { data: assets } = await sb.from("assets").select("*").eq("property_id", id).order("created_at", { ascending: false });
  await renderAssetGrid(assets || [], false);
}

async function renderAssetGrid(assets, isAdmin) {
  const host = document.querySelector(".spinner") || app;
  if (!assets.length) { host.outerHTML = `<div class="empty"><h3>No assets yet</h3><p>${isAdmin ? "Upload photos, videos, or add a Matterport link below." : "Content will appear here soon."}</p></div>`; return; }
  const tiles = assets.map((a) => `<div class="asset" data-asset="${a.id}">
      <div class="asset__thumb" data-thumb="${a.storage_path || ""}" data-kind="${a.kind}" data-ext="${a.external_url || ""}">
        <span class="asset__kind">${kindLabel[a.kind] || a.kind}</span></div>
      <div class="asset__body"><div class="asset__title">${esc(a.title || "Untitled")}</div>
        <div class="muted" style="font-size:12px">${fmtBytes(a.size_bytes)}</div>
        <div class="asset__actions">
          <button class="btn btn--ghost btn--sm" data-view="${a.id}">View</button>
          ${a.storage_path ? `<button class="btn btn--accent btn--sm" data-dl="${a.id}">Download</button>` : `<a class="btn btn--accent btn--sm" href="${esc(a.external_url)}" target="_blank" rel="noopener">Open</a>`}
          ${isAdmin ? `<button class="btn btn--danger btn--sm" data-del="${a.id}">✕</button>` : ""}
        </div></div></div>`).join("");
  const wrap = document.createElement("div"); wrap.className = "grid"; wrap.innerHTML = tiles;
  host.replaceWith(wrap);
  // hydrate thumbnails + actions
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  for (const el of wrap.querySelectorAll("[data-thumb]")) {
    const path = el.dataset.thumb, ext = el.dataset.ext, kind = el.dataset.kind;
    if (path && kind === "photo") { const { data } = await sb.storage.from("assets").createSignedUrl(path, 3600); if (data?.signedUrl) el.insertAdjacentHTML("beforeend", `<img src="${data.signedUrl}" alt="" />`); }
    else if (ext) el.style.background = "linear-gradient(140deg,#2f4a52,#0f1b1e)";
  }
  wrap.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => openAsset(byId[b.dataset.view], false));
  wrap.querySelectorAll("[data-dl]").forEach((b) => b.onclick = () => openAsset(byId[b.dataset.dl], true));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => deleteAsset(byId[b.dataset.del], wrap));
}

async function openAsset(a, download) {
  if (a.external_url) { window.open(a.external_url, "_blank"); return; }
  const opts = download ? { download: (a.title || "asset").replace(/[^\w.\-]+/g, "_") } : {};
  const { data, error } = await sb.storage.from("assets").createSignedUrl(a.storage_path, 3600, opts);
  if (error) return toast(error.message, true);
  window.open(data.signedUrl, "_blank");
}

async function deleteAsset(a, wrap) {
  if (!confirm("Delete this asset?")) return;
  if (a.storage_path) await sb.storage.from("assets").remove([a.storage_path]);
  const { error } = await sb.from("assets").delete().eq("id", a.id);
  if (error) return toast(error.message, true);
  wrap.querySelector(`[data-asset="${a.id}"]`)?.remove();
  toast("Deleted");
}

/* ================= ADMIN ================= */
let adminTab = "portfolio";
function renderAdmin() {
  app.innerHTML = `<div class="page-head"><div><h1 class="serif">Studio <em>Dashboard</em></h1>
    <p>Manage the public portfolio, client properties, and asset delivery.</p></div></div>
    <div class="tabs">
      <button class="tab" data-tab="portfolio">Portfolio</button>
      <button class="tab" data-tab="properties">Properties</button>
      <button class="tab" data-tab="clients">Clients</button>
    </div><div id="tabBody">${spinner()}</div>`;
  app.querySelectorAll(".tab").forEach((t) => t.onclick = () => { adminTab = t.dataset.tab; syncTabs(); route(); });
  syncTabs(); route();
}
function syncTabs() { app.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === adminTab)); }
function route() { if (adminTab === "portfolio") adminPortfolio(); else if (adminTab === "properties") adminProperties(); else adminClients(); }
const body = () => document.getElementById("tabBody");

/* ----- Portfolio (homepage) ----- */
async function adminPortfolio() {
  body().innerHTML = `<div class="page-head" style="margin-bottom:16px"><p class="muted">These drive the “Content That Stops the Scroll” section on the public homepage.</p>
    <button class="btn btn--accent btn--sm" id="addP">+ Add item</button></div>${spinner()}`;
  document.getElementById("addP").onclick = () => portfolioModal();
  const { data: items } = await sb.from("portfolio_items").select("*").order("sort_order");
  const rows = (items || []).map((it) => `<div class="list__row">
      <div class="grow"><h4>${esc(it.title)} ${it.featured ? "★" : ""}</h4>
        <div class="sub">${esc(it.location || "")} · ${esc(it.kind)} · ${it.published ? "published" : "hidden"}</div></div>
      <button class="btn btn--ghost btn--sm" data-edit="${it.id}">Edit</button>
      <button class="btn btn--danger btn--sm" data-del="${it.id}">✕</button></div>`).join("");
  body().querySelector(".spinner").outerHTML = rows ? `<div class="list">${rows}</div>` : `<div class="empty"><h3>No portfolio items</h3></div>`;
  const map = Object.fromEntries((items || []).map((i) => [i.id, i]));
  body().querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => portfolioModal(map[b.dataset.edit]));
  body().querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete item?")) { await sb.from("portfolio_items").delete().eq("id", b.dataset.del); adminPortfolio(); } });
}
function portfolioModal(item) {
  const it = item || {};
  modal(item ? "Edit portfolio item" : "Add portfolio item", `
    <div class="field"><label>Title</label><input id="f_title" value="${esc(it.title || "")}" /></div>
    <div class="field"><label>Location / caption</label><input id="f_loc" value="${esc(it.location || "")}" placeholder="Lifestyle Film · Dallas" /></div>
    <div class="row2"><div class="field"><label>Type</label><select id="f_kind">
      ${["video", "matterport", "photo"].map((k) => `<option ${it.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
      <div class="field"><label>Sort order</label><input id="f_sort" type="number" value="${it.sort_order ?? 0}" /></div></div>
    <div class="field"><label>Media URL (Vimeo / YouTube / MP4 / Matterport)</label><input id="f_url" value="${esc(it.media_url || "")}" placeholder="https://…" /></div>
    <div class="field"><label>Thumbnail URL (optional)</label><input id="f_thumb" value="${esc(it.thumb_url || "")}" placeholder="https://…" /></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:8px"><input type="checkbox" id="f_feat" ${it.featured ? "checked" : ""}/> Featured (large hero tile)</label>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="f_pub" ${it.published !== false ? "checked" : ""}/> Published</label>
  `, async (b) => {
    const rec = {
      title: b.querySelector("#f_title").value.trim(),
      location: b.querySelector("#f_loc").value.trim(),
      kind: b.querySelector("#f_kind").value,
      sort_order: parseInt(b.querySelector("#f_sort").value || "0", 10),
      media_url: b.querySelector("#f_url").value.trim() || null,
      thumb_url: b.querySelector("#f_thumb").value.trim() || null,
      featured: b.querySelector("#f_feat").checked,
      published: b.querySelector("#f_pub").checked,
    };
    if (!rec.title) { toast("Title required", true); return false; }
    const q = item ? sb.from("portfolio_items").update(rec).eq("id", item.id) : sb.from("portfolio_items").insert(rec);
    const { error } = await q; if (error) { toast(error.message, true); return false; }
    toast("Saved"); adminPortfolio();
  }, item ? "Save" : "Add");
}

/* ----- Clients ----- */
async function adminClients() {
  body().innerHTML = `<div class="page-head" style="margin-bottom:16px"><p class="muted">Clients log in with a one-time email code. Adding them here pre-creates their account.</p>
    <button class="btn btn--accent btn--sm" id="addC">+ Add client</button></div>${spinner()}`;
  document.getElementById("addC").onclick = clientModal;
  const { data: clients } = await sb.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false });
  const rows = (clients || []).map((c) => `<div class="list__row"><div class="grow">
      <h4>${esc(c.full_name || c.email)}</h4><div class="sub">${esc(c.email)}${c.phone ? " · " + esc(c.phone) : ""}</div></div></div>`).join("");
  body().querySelector(".spinner").outerHTML = rows ? `<div class="list">${rows}</div>` : `<div class="empty"><h3>No clients yet</h3><p>Add your first client to start delivering content.</p></div>`;
}
function clientModal() {
  modal("Add client", `
    <div class="field"><label>Email</label><input id="c_email" type="email" placeholder="agent@email.com" /></div>
    <div class="field"><label>Full name</label><input id="c_name" placeholder="Jane Agent" /></div>
    <div class="field"><label>Phone (optional)</label><input id="c_phone" placeholder="(214) 555-0000" /></div>
    <p class="muted" style="font-size:13px">They'll get a login code by email the first time they visit the portal.</p>
  `, async (b) => {
    const email = b.querySelector("#c_email").value.trim().toLowerCase();
    if (!email.includes("@")) { toast("Valid email required", true); return false; }
    const { data, error } = await sb.functions.invoke("create-client", { body: {
      email, full_name: b.querySelector("#c_name").value.trim(), phone: b.querySelector("#c_phone").value.trim() } });
    if (error || data?.error) { toast(error?.message || data.error, true); return false; }
    toast("Client added"); adminClients();
  }, "Add client");
}

/* ----- Properties ----- */
async function adminProperties() {
  const params = new URLSearchParams(location.search);
  if (params.get("manage")) return adminPropertyDetail(params.get("manage"));
  body().innerHTML = `<div class="page-head" style="margin-bottom:16px"><p class="muted">Create a property card for a client, then upload its assets.</p>
    <button class="btn btn--accent btn--sm" id="addProp">+ Add property</button></div>${spinner()}`;
  document.getElementById("addProp").onclick = propertyModal;
  const { data: props } = await sb.from("properties").select("*, profiles!properties_client_id_fkey(full_name,email), assets(count)").order("created_at", { ascending: false });
  const rows = (props || []).map((p) => {
    const n = p.assets?.[0]?.count ?? 0; const c = p.profiles;
    return `<div class="list__row"><div class="grow"><h4>${esc(p.address)}</h4>
      <div class="sub">${esc(c?.full_name || c?.email || "—")} · ${n} asset${n === 1 ? "" : "s"}</div></div>
      <button class="btn btn--accent btn--sm" data-manage="${p.id}">Manage</button>
      <button class="btn btn--danger btn--sm" data-del="${p.id}">✕</button></div>`;
  }).join("");
  body().querySelector(".spinner").outerHTML = rows ? `<div class="list">${rows}</div>` : `<div class="empty"><h3>No properties yet</h3></div>`;
  body().querySelectorAll("[data-manage]").forEach((b) => b.onclick = () => { location.search = "?manage=" + b.dataset.manage; });
  body().querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete property and its assets?")) { await sb.from("properties").delete().eq("id", b.dataset.del); adminProperties(); } });
}
async function propertyModal() {
  const { data: clients } = await sb.from("profiles").select("id,full_name,email").eq("role", "client").order("full_name");
  if (!clients?.length) { toast("Add a client first", true); adminTab = "clients"; syncTabs(); route(); return; }
  modal("Add property", `
    <div class="field"><label>Client</label><select id="p_client">${clients.map((c) => `<option value="${c.id}">${esc(c.full_name || c.email)}</option>`).join("")}</select></div>
    <div class="field"><label>Address</label><input id="p_addr" placeholder="4112 Waldorf Drive" /></div>
    <div class="row2"><div class="field"><label>City</label><input id="p_city" placeholder="Dallas" /></div>
      <div class="field"><label>State</label><input id="p_state" placeholder="TX" /></div></div>
    <div class="row2"><div class="field"><label>ZIP</label><input id="p_zip" placeholder="75229" /></div>
      <div class="field"><label>Label (optional)</label><input id="p_label" placeholder="Listing shoot" /></div></div>
  `, async (b) => {
    const rec = { client_id: b.querySelector("#p_client").value, address: b.querySelector("#p_addr").value.trim(),
      city: b.querySelector("#p_city").value.trim(), state: b.querySelector("#p_state").value.trim(),
      zip: b.querySelector("#p_zip").value.trim(), label: b.querySelector("#p_label").value.trim(), created_by: me.id };
    if (!rec.address) { toast("Address required", true); return false; }
    const { error } = await sb.from("properties").insert(rec); if (error) { toast(error.message, true); return false; }
    toast("Property created"); adminProperties();
  }, "Create");
}

async function adminPropertyDetail(id) {
  body().innerHTML = `<a class="back-link" href="app.html">← All properties</a><div id="ph"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 22px">
      <label class="btn btn--accent btn--sm" style="cursor:pointer">+ Upload files<input type="file" id="up" multiple hidden /></label>
      <button class="btn btn--ghost btn--sm" id="addLink">+ Add Matterport / link</button>
    </div><div id="upStatus"></div><div id="assets">${spinner()}</div>`;
  const { data: p } = await sb.from("properties").select("*").eq("id", id).single();
  if (!p) { body().innerHTML = `<div class="empty"><h3>Not found</h3></div>`; return; }
  document.getElementById("ph").innerHTML = `<div class="page-head"><div><h1 class="serif">${esc(p.address)}</h1>
    <p>${esc([p.city, p.state].filter(Boolean).join(", "))}</p></div></div>`;
  document.getElementById("up").onchange = (e) => uploadFiles(id, [...e.target.files]);
  document.getElementById("addLink").onclick = () => linkModal(id);
  await refreshAdminAssets(id);
}
async function refreshAdminAssets(id) {
  const host = document.getElementById("assets"); host.innerHTML = spinner();
  const { data: assets } = await sb.from("assets").select("*").eq("property_id", id).order("created_at", { ascending: false });
  await renderAssetGrid(assets || [], true);
}
async function uploadFiles(propertyId, files) {
  if (!files.length) return;
  const status = document.getElementById("upStatus");
  let done = 0; const total = files.length;
  status.innerHTML = `<div class="msg msg--ok" style="background:var(--paper-2);color:var(--ink)">Uploading 0/${total}…<div class="bar"><div class="bar__fill" id="bf"></div></div></div>`;
  for (const file of files) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${propertyId}/${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
    const { error: upErr } = await sb.storage.from("assets").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { toast(upErr.message, true); continue; }
    await sb.from("assets").insert({ property_id: propertyId, kind: guessKind(file), title: file.name, storage_path: path, size_bytes: file.size, content_type: file.type, uploaded_by: me.id });
    done++; document.getElementById("bf").style.width = (done / total * 100) + "%";
    status.querySelector(".msg").firstChild.textContent = `Uploading ${done}/${total}…`;
  }
  status.innerHTML = `<div class="msg msg--ok">${done} file${done === 1 ? "" : "s"} uploaded.</div>`;
  await notifyClient(propertyId, `${done} new file${done === 1 ? "" : "s"}`);
  await refreshAdminAssets(propertyId);
  setTimeout(() => (status.innerHTML = ""), 4000);
}
function linkModal(propertyId) {
  modal("Add a link", `
    <div class="field"><label>Type</label><select id="l_kind">
      <option value="matterport">Matterport</option><option value="video">Video</option><option value="other">Other</option></select></div>
    <div class="field"><label>Title</label><input id="l_title" placeholder="3D Tour" /></div>
    <div class="field"><label>URL</label><input id="l_url" placeholder="https://my.matterport.com/show/?m=…" /></div>
  `, async (b) => {
    const url = b.querySelector("#l_url").value.trim(); if (!url) { toast("URL required", true); return false; }
    const { error } = await sb.from("assets").insert({ property_id: propertyId, kind: b.querySelector("#l_kind").value,
      title: b.querySelector("#l_title").value.trim() || "Link", external_url: url, uploaded_by: me.id });
    if (error) { toast(error.message, true); return false; }
    await notifyClient(propertyId, b.querySelector("#l_title").value.trim() || "a new link");
    toast("Added"); refreshAdminAssets(propertyId);
  }, "Add");
}
async function notifyClient(propertyId, assetTitle) {
  try { await sb.functions.invoke("notify-client", { body: { property_id: propertyId, asset_title: assetTitle } }); }
  catch (_) { /* non-fatal */ }
}
