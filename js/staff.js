// Staff page: password gate, then queue controls. No confirmations, no undo.
import { createLocalStore } from "./store-local.js";
import { buildStaffView, SCENARIOS } from "./staff-view.js";

const store = createLocalStore();
const app = document.getElementById("app");
const SESSION_KEY = "clinic-staff-unlocked";

const isUnlocked = () => { try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } };
let unlockedInMemory = false; // fallback if sessionStorage is blocked
let loginError = "";
let status = "";

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  kids.forEach((k) => e.append(k));
  return e;
}
const card = (...kids) => el("div", { className: "card" }, ...kids);
const button = (text, onclick, primary = false) =>
  el("button", { className: primary ? "primary" : "", textContent: text, onclick });

function patientLink(token) {
  const url = new URL("index.html", location.href);
  url.search = `?join=${token}`;
  return url.href;
}

function renderLogin() {
  const input = el("input", { type: "password", id: "pw", autocomplete: "off", placeholder: "Password" });
  input.style.cssText = "width:100%;min-height:48px;font:inherit;padding:8px;box-sizing:border-box";
  const submit = () => {
    if (store.checkPassword(input.value)) {
      unlockedInMemory = true;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      loginError = "";
    } else {
      loginError = "Wrong password.";
    }
    render(store.getState());
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  app.replaceChildren(card(el("label", { className: "label", htmlFor: "pw", textContent: "Staff password" }), input,
    button("Log in", submit, true),
    ...(loginError ? [el("p", { className: "error", role: "alert", textContent: loginError })] : [])));
}

function render(state) {
  if (!(isUnlocked() || unlockedInMemory)) return renderLogin();
  const v = buildStaffView(state);
  app.replaceChildren();

  app.append(card(
    el("p", { className: "label", textContent: "Queue" }),
    el("p", { className: "big", textContent: v.open ? "OPEN" : "CLOSED" }),
    v.open ? button("Close queue", () => store.setOpen(false)) : button("Open queue", () => store.setOpen(true), true),
  ));

  const serve = button(v.nextNumber === null ? "Nobody waiting" : `Serve next (#${v.nextNumber})`,
    () => { store.serveNext(); }, true);
  serve.disabled = v.nextNumber === null;
  app.append(card(serve));

  const list = card(el("p", { className: "label", textContent: `Waiting: ${v.waiting.length}` }));
  v.waiting.forEach((w) => {
    const row = el("div", {}, el("p", { textContent: `${w.position}. #${w.number} (joined ${w.joinedTime})` }));
    row.append(button("Remove", () => store.removeTicket(w.id)));
    if (w.position > 1) row.append(button("Move to front", () => store.moveToFront(w.id)));
    list.append(row);
  });
  app.append(list);

  const link = patientLink(v.joinToken);
  app.append(card(
    el("p", { className: "label", textContent: "Patient link (turn into a QR code and print it)" }),
    el("p", { className: "note", textContent: link }),
    button("Copy link", async () => {
      try { await navigator.clipboard.writeText(link); status = "Link copied."; } catch { status = "Copy failed: select the text above."; }
      render(store.getState());
    }),
    button("Rotate join token", () => { store.rotateJoinToken(); status = "New token: old links no longer work."; }),
    ...(status ? [el("p", { className: "note", role: "status", textContent: status })] : []),
  ));

  const clientToken = (() => {
    try {
      let t = localStorage.getItem("clinic-client-token");
      if (!t) { t = crypto.randomUUID(); localStorage.setItem("clinic-client-token", t); }
      return t;
    } catch { return undefined; }
  })();
  const sc = card(el("p", { className: "label", textContent: "Test scenarios (replace the current queue; this browser becomes the patient)" }));
  SCENARIOS.forEach(([name, text]) => sc.append(button(text, () => { store.loadScenario(name, { clientToken }); status = `Loaded: ${text}`; })));
  sc.append(button("Reset everything (seed only)", () => { store.reset(); status = "Reset."; }));
  app.append(sc);

  app.append(el("p", { className: "note" }, el("a", { href: "index.html", textContent: "Patient page" })));
}

store.subscribe(render);
