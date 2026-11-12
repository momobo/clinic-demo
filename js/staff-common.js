// Shared by the staff pages: store, DOM helpers, status messages, password
// gate, and a renderer that keeps keyboard focus when data changes.
import { createStore } from "./store.js";
import { messages } from "./staff-view.js";

export const store = await createStore();
const SESSION_KEY = "clinic-staff-unlocked";

export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  const { bind, focusId, ariaLabel, ...rest } = props;
  Object.assign(e, rest);
  if (ariaLabel) e.setAttribute("aria-label", ariaLabel); // property form is not supported everywhere
  if (bind) e.dataset.bind = bind;
  if (focusId) { e.dataset.focusId = focusId; if (tag.startsWith("h")) e.tabIndex = -1; }
  kids.forEach((k) => e.append(k));
  return e;
}
export const card = (...kids) => el("section", { className: "card" }, ...kids);
export const note = (bind) => el("p", { className: "note", bind });
export const button = (text, onclick, props = {}) => el("button", { textContent: text, onclick, ...props });

const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const statusEl = document.getElementById("status");
const alertEl = document.getElementById("alert");
let statusTimer = null;
export function say(message) {
  clearTimeout(statusTimer);
  statusEl.textContent = ""; alertEl.textContent = "";
  setTimeout(() => { statusEl.textContent = message; }, 50);
  statusTimer = setTimeout(() => { statusEl.textContent = ""; }, 6000);
}
export function fail(message) {
  statusEl.textContent = ""; alertEl.textContent = "";
  setTimeout(() => { alertEl.textContent = message; }, 50);
}

/**
 * Runs a store action. The success message goes to the status line; failures
 * explain what to do. focusId says where keyboard focus should go afterwards.
 */
export async function act(view, fn, successMessage, focusId) {
  if (focusId) view.setFocus(focusId);
  try { await fn(); say(successMessage); }
  catch { view.setFocus(null); fail(messages.saveFailed); }
  view.refresh();
}

/** Builds the layout only when `key` changes; otherwise updates text in place. */
export function createView(app) {
  let layoutKey = null, pendingFocus = null, last = null;
  return {
    setFocus: (id) => { pendingFocus = id; },
    refresh() { if (last) this.show(last.key, last.build, last.texts); },
    show(key, build, texts) {
      last = { key, build, texts };
      if (key !== layoutKey) {
        const hadFocus = document.activeElement?.dataset?.focusId;
        layoutKey = key;
        app.replaceChildren(...build());
        const want = pendingFocus || hadFocus;
        const target = (want && app.querySelector(`[data-focus-id="${want}"]`))
          || (pendingFocus || hadFocus ? app.querySelector('[data-focus-id="list-heading"], h2[data-focus-id]') : null);
        target?.focus();
      } else if (pendingFocus) {
        app.querySelector(`[data-focus-id="${pendingFocus}"]`)?.focus();
      }
      pendingFocus = null;
      app.querySelectorAll("[data-bind]").forEach((n) => {
        const text = texts[n.dataset.bind] ?? "";
        if (n.textContent !== text) n.textContent = text;
      });
    },
  };
}

/** Password gate, then the page. Returns { rerender }. */
export function mountStaffPage({ app, renderUnlocked }) {
  let unlocked = false;
  try { unlocked = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* storage blocked */ }
  let loginBuilt = false;
  let lastState = null;
  let offline = !navigator.onLine;
  let updatedAt = null;

  function buildLogin() {
    loginBuilt = true;
    const input = el("input", { type: "password", id: "pw", autocomplete: "current-password", required: true });
    const form = el("form", {},
      el("label", { className: "label", htmlFor: "pw", textContent: "Staff password" }), input,
      button("Log in", null, { type: "submit", className: "primary" }));
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (await store.checkPassword(input.value)) {
        unlocked = true;
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
        alertEl.textContent = "";
        loginBuilt = false;
        render(lastState);
        const h1 = document.querySelector("h1"); h1.tabIndex = -1; h1.focus();
      } else {
        fail(messages.wrongPassword);
        input.select();
      }
    };
    app.replaceChildren(card(form));
    input.focus();
  }

  function render(state) {
    if (!state) return;
    lastState = state;
    if (!unlocked) { if (!loginBuilt) buildLogin(); return; }
    renderUnlocked(state, { offline, updatedText: updatedAt ? `Updated ${hhmm(updatedAt)}` : "", offlineText: messages.offline });
  }

  window.addEventListener("offline", () => { offline = true; render(lastState); });
  window.addEventListener("online", () => { offline = false; render(lastState); });
  store.subscribe(
    (s) => { updatedAt = new Date(); offline = !navigator.onLine; render(s); },
    () => {
      if (lastState) { offline = true; render(lastState); return; }
      app.replaceChildren(card(el("h2", { className: "big", textContent: "We couldn't reach the clinic system" }),
        el("p", { className: "note", textContent: "Check the connection and reload this page." })));
    },
  );
  if (store.kind === "local") {
    document.querySelector("main").append(el("p", { className: "note", textContent: "Practice mode: this data stays on this device." }));
  }
  return { rerender: () => render(lastState), getState: () => lastState };
}
