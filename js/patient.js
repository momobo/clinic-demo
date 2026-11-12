// Patient page. Follows "Design Spec.md": the layout is built only when the
// screen changes; data changes update text in place, so keyboard focus stays
// where it is. Focus moves only where the spec says.
import { createStore } from "./store.js";
import { buildView } from "./queue.js";

const store = await createStore();
const app = document.getElementById("app");
const statusEl = document.getElementById("status");
const alertEl = document.getElementById("alert");
const params = new URLSearchParams(location.search);
const joinToken = params.get("join");

function getClientToken() {
  try {
    let t = localStorage.getItem("clinic-client-token");
    if (!t) { t = crypto.randomUUID(); localStorage.setItem("clinic-client-token", t); }
    return t;
  } catch {
    return "session-" + Math.random().toString(36).slice(2); // storage blocked: works until reload
  }
}
const clientToken = getClientToken();

let lastState = null;
let confirming = false;
let offline = !navigator.onLine;
let updatedAt = null;
let layoutKey = null;
let pendingFocus = null;
let wakeLock = null;
let wakeRequesting = false;
let statusTimer = null;

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---------- small DOM helpers ----------
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  const { bind, focusId, ...rest } = props;
  Object.assign(e, rest);
  if (bind) e.dataset.bind = bind;
  if (focusId) { e.dataset.focusId = focusId; if (tag.startsWith("h")) e.tabIndex = -1; }
  kids.forEach((k) => e.append(k));
  return e;
}
const card = (...kids) => el("section", { className: "card" }, ...kids);
const label = (text, focusId) => el("h2", { className: "label", textContent: text, focusId });
const note = (bind, extra = {}) => el("p", { className: "note", bind, ...extra });

function say(message) {
  clearTimeout(statusTimer);
  statusEl.textContent = "";
  alertEl.textContent = "";
  setTimeout(() => { statusEl.textContent = message; }, 50); // re-announces even a repeated text
  statusTimer = setTimeout(() => { statusEl.textContent = ""; }, 6000);
}
function fail(message) {
  statusEl.textContent = "";
  alertEl.textContent = "";
  setTimeout(() => { alertEl.textContent = message; }, 50);
}
const NETWORK_FAIL = "We couldn't reach the clinic system. Your place is safe. Check your connection and try again.";

// ---------- actions ----------
function joinButton() {
  return el("button", {
    className: "primary", textContent: "Take a number", focusId: "join-btn",
    onclick: async () => {
      pendingFocus = "main-heading";
      try {
        const t = await store.takeNumber({ joinToken, clientToken });
        say(`You took number ${t.number}.`);
      } catch (e) {
        pendingFocus = "join-btn";
        fail(e.message === "closed" ? "The clinic is closed, so we can't give you a number now."
          : e.message === "invalid-token" ? "This link can't be used to take a number. Please use the QR code at the clinic or ask at the front desk."
          : NETWORK_FAIL);
      }
      render(lastState);
    },
  });
}

function leaveSection() {
  if (!confirming) {
    return el("button", { className: "quiet", textContent: "Leave the queue", focusId: "leave-btn",
      onclick: () => { confirming = true; pendingFocus = "confirm-heading"; render(lastState); } });
  }
  return el("div", { className: "row" },
    el("h2", { textContent: "Leave the queue?", focusId: "confirm-heading" }),
    el("p", { className: "note", textContent: "You will lose your place. You can take a new number later, but it will be at the end of the queue." }),
    el("button", { className: "primary", textContent: "Keep my place", focusId: "keep-btn",
      onclick: () => { confirming = false; pendingFocus = "leave-btn"; render(lastState); } }),
    el("button", { textContent: "Yes, leave the queue", focusId: "confirm-btn",
      onclick: async () => {
        confirming = false; pendingFocus = "result";
        try { await store.cancelTicket({ clientToken }); say("You left the queue."); }
        catch { pendingFocus = "leave-btn"; fail(NETWORK_FAIL); }
        render(lastState);
      } }));
}

// ---------- layout (rebuilt only when the screen changes) ----------
function build(v) {
  const nodes = [];
  if (offline) {
    nodes.push(el("div", { className: "banner offline", role: "status", bind: "offlineText" }));
  }
  if (v.mode === "ticket") {
    if (v.showTurnNear) nodes.push(el("div", { className: "banner", role: "status", textContent: "Your turn is near. Please come to the clinic now." }));
    nodes.push(card(
      label("Estimated wait", "main-heading"),
      el("p", { className: "big", bind: "waitText" }),
      el("p", { bind: "positionText" }),
      el("p", { className: "number-small", bind: "numberText" }),
      note("lastCalledText"),
      note("keepOpenNote"),
      note("wakeText"),
      note("closedNote"),
      note("updatedText"),
      leaveSection(),
    ));
  } else if (v.mode === "ended") {
    nodes.push(card(
      el("h2", { className: "big", bind: "message", focusId: "result" }),
      note("lastCalledText"), note("joinHelp"), note("updatedText"),
      ...(v.canJoin ? [joinButton()] : []),
    ));
  } else if (v.mode === "closed") {
    nodes.push(card(
      el("h2", { className: "big", bind: "message", focusId: "result" }),
      note("detail"), note("lastCalledText"), note("updatedText"),
    ));
  } else {
    nodes.push(card(
      label("Estimated wait if you join now", "main-heading"),
      el("p", { className: "big", bind: "waitText" }),
      note("waitingText"), note("lastCalledText"), note("joinHelp"), note("updatedText"),
      ...(v.canJoin ? [joinButton()] : []),
    ));
  }
  app.replaceChildren(...nodes);
}

function updateTexts(v) {
  app.querySelectorAll("[data-bind]").forEach((n) => {
    const text = v[n.dataset.bind] ?? "";
    if (n.textContent !== text) n.textContent = text;
  });
}

function render(state) {
  if (!state) return;
  lastState = state;
  const v = buildView({ state, clientToken, hasJoinToken: Boolean(joinToken), now: new Date() });
  v.updatedText = updatedAt ? `Updated ${hhmm(updatedAt)}` : "";
  v.wakeText = wakeLock ? "We are keeping your screen on while this page is open." : "";
  v.offlineText = "No connection. The wait shown may be out of date." + (v.mode === "ticket" ? " Your place is kept." : "");

  const key = [v.mode, confirming, v.showTurnNear, offline, v.canJoin].join("|");
  if (key !== layoutKey) {
    const hadFocus = document.activeElement?.dataset?.focusId;
    layoutKey = key;
    build(v);
    const target = pendingFocus || hadFocus;
    if (target) app.querySelector(`[data-focus-id="${target}"]`)?.focus();
    pendingFocus = null;
  } else if (pendingFocus) {
    app.querySelector(`[data-focus-id="${pendingFocus}"]`)?.focus();
    pendingFocus = null;
  }
  updateTexts(v);
  syncWakeLock(v);
}

// ---------- keep the screen awake while holding a number ----------
async function syncWakeLock(v) {
  const want = v.mode === "ticket" && document.visibilityState === "visible" && "wakeLock" in navigator;
  if (want && !wakeLock && !wakeRequesting) {
    wakeRequesting = true;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; render(lastState); });
    } catch { wakeLock = null; /* not allowed or not supported: the note stays */ }
    wakeRequesting = false;
    render(lastState);
  } else if (!want && wakeLock) {
    const l = wakeLock; wakeLock = null;
    try { await l.release(); } catch { /* already released */ }
    render(lastState);
  }
}
document.addEventListener("visibilitychange", () => render(lastState));

// ---------- connection state ----------
window.addEventListener("offline", () => { offline = true; render(lastState); });
window.addEventListener("online", () => { offline = false; render(lastState); });

function showFatal() {
  layoutKey = null;
  app.replaceChildren(card(
    el("h2", { className: "big", textContent: "We couldn't reach the clinic system" }),
    el("p", { className: "note", textContent: "Check your connection, then reload this page. If it keeps happening, please ask at the front desk." }),
  ));
}

store.subscribe(
  (state) => { updatedAt = new Date(); offline = !navigator.onLine; render(state); },
  () => { if (lastState) { offline = true; render(lastState); } else showFatal(); },
);
if (store.kind === "local") {
  document.querySelector("main").append(el("p", { className: "note", textContent: "Practice mode: this data stays on this device." }));
}
setInterval(() => render(lastState), 60000); // time-of-day dependent estimates
