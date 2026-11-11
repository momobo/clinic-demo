// Patient page: renders the view model and sends taps to the store.
import { createStore } from "./store.js";
import { buildView } from "./queue.js";

const store = await createStore();
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const joinToken = params.get("join");

function getClientToken() {
  try {
    let t = localStorage.getItem("clinic-client-token");
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem("clinic-client-token", t);
    }
    return t;
  } catch {
    return "session-" + Math.random().toString(36).slice(2); // storage blocked: works until reload
  }
}
const clientToken = getClientToken();

let confirming = false;
let message = "";
let lastState = null;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  kids.forEach((k) => e.append(k));
  return e;
}
const card = (...kids) => el("div", { className: "card" }, ...kids);
const label = (t) => el("p", { className: "label", textContent: t });

function nowServingLine(v) {
  return el("p", { className: "note", textContent: `Now serving: ${v.nowServing ?? "—"}` });
}

function joinButton() {
  return el("button", {
    className: "primary", textContent: "Take a number",
    onclick: async () => {
      try {
        await store.takeNumber({ joinToken, clientToken });
        message = "";
      } catch (e) {
        message = e.message === "closed" ? "The clinic is closed."
          : e.message === "invalid-token" ? "This link cannot be used to take a number. Please scan the QR code at the clinic."
          : "Could not reach the clinic system. Please try again.";
      }
      render(lastState);
    },
  });
}

function render(state) {
  lastState = state;
  const v = buildView({ state, clientToken, hasJoinToken: Boolean(joinToken), now: new Date() });
  app.replaceChildren();

  if (v.mode === "ticket") {
    if (v.showTurnNear) {
      app.append(el("div", { className: "banner", role: "status", textContent: "Your turn is near. Please come to the clinic now." }));
    }
    if (v.closedNote) app.append(el("p", { className: "note", textContent: v.closedNote }));
    const c = card(label("Your number"), el("p", { className: "ticket-number", textContent: `#${v.number}` }),
      label("Estimated wait"), el("p", { className: "big", textContent: v.waitText }),
      el("p", { className: "note", textContent: `Your position: ${v.position}` }), nowServingLine(v));
    if (confirming) {
      c.append(el("p", { className: "note", textContent: "Are you sure you want to give up your place?" }),
        el("button", { className: "primary", textContent: "Keep my place", onclick: () => { confirming = false; render(lastState); } }),
        el("button", { textContent: "Yes, give up my place", onclick: async () => {
          confirming = false;
          try { await store.cancelTicket({ clientToken }); message = ""; }
          catch { message = "Could not reach the clinic system. Please try again."; }
          render(lastState);
        } }));
    } else {
      c.append(el("button", { textContent: "Cancel my ticket", onclick: () => { confirming = true; render(lastState); } }));
    }
    app.append(c);
  } else if (v.mode === "ended") {
    app.append(card(el("p", { className: "big", textContent: v.message }), nowServingLine(v), ...(v.canJoin ? [joinButton()] : [])));
  } else if (v.mode === "closed") {
    app.append(card(el("p", { className: "big", textContent: v.message }), nowServingLine(v)));
  } else {
    const c = card(label("Estimated wait if you join now"), el("p", { className: "big", textContent: v.waitText }),
      el("p", { className: "note", textContent: `People waiting: ${v.ahead}` }), nowServingLine(v));
    if (v.canJoin) c.append(joinButton());
    else c.append(el("p", { className: "note", textContent: "To take a number, scan the QR code at the clinic." }));
    app.append(c);
  }
  if (message) app.append(el("p", { className: "error", role: "alert", textContent: message }));
}

function showOffline() {
  app.replaceChildren(card(el("p", { className: "big", textContent: "Cannot reach the clinic system" }),
    el("p", { className: "note", textContent: "Please check your connection and reload the page." })));
}
store.subscribe(render, showOffline);
if (store.kind === "local") {
  document.querySelector("main").append(el("p", { className: "note", textContent: "Demo mode: data stays in this browser." }));
}
setInterval(() => { if (lastState) render(lastState); }, 60000); // refresh time-of-day dependent estimates
