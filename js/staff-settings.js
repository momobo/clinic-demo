// Staff settings: open/close, the patient sign-up link, test data.
import { store, el, card, note, button, act, say, createView, mountStaffPage } from "./staff-common.js";
import { buildStaffView, messages, SCENARIOS } from "./staff-view.js";

const app = document.getElementById("app");
const view = createView(app);
let page;

function patientLink(token) {
  const url = new URL("index.html", location.href);
  url.search = `?join=${token}`;
  return url.href;
}
const clientToken = () => {
  try {
    let t = localStorage.getItem("clinic-client-token");
    if (!t) { t = crypto.randomUUID(); localStorage.setItem("clinic-client-token", t); }
    return t;
  } catch { return undefined; }
};

function build(v, ui) {
  const nodes = [];
  if (ui.offline) nodes.push(el("div", { className: "banner offline", role: "status", bind: "offlineText" }));

  nodes.push(card(
    el("h2", { textContent: "Queue", focusId: "queue-heading" }), el("p", { className: "big", bind: "openText" }),
    v.open
      ? button("Close the queue", () => act(view, () => store.setOpen(false), messages.closed, "open-close-btn"), { focusId: "open-close-btn" })
      : button("Open the queue", () => act(view, () => store.setOpen(true), messages.opened, "open-close-btn"), { className: "primary", focusId: "open-close-btn" }),
  ));

  nodes.push(card(
    el("h2", { textContent: "Patient sign-up link" }),
    el("p", { className: "note", textContent: "Turn this link into a QR code and print it for the entrance." }),
    el("p", { className: "link", bind: "linkText" }),
    button("Copy link", async () => {
      try { await navigator.clipboard.writeText(patientLink(buildStaffView(page.getState()).joinToken)); say(messages.copied); }
      catch { say(messages.copyFailed); }
    }, { focusId: "copy-btn" }),
    button("Change the sign-up link", () => act(view, () => store.rotateJoinToken(), messages.linkChanged, "change-link-btn"), { focusId: "change-link-btn" }),
    el("p", { className: "note", textContent: "Old QR codes stop working. You will need to print a new one." }),
  ));

  const details = el("details", { className: "card" }, el("summary", { textContent: "Test data: replaces the real queue" }),
    el("p", { className: "note", textContent: "Only for practice. This replaces the real queue and history. This device becomes the patient in these examples." }));
  SCENARIOS.forEach(([name, text]) => details.append(button(text, () => act(view, () => store.loadScenario(name, { clientToken: clientToken() }), `Loaded: ${text}.`, null))));
  details.append(button("Delete all and start empty", () => act(view, () => store.reset(), "Everything was reset.", null)));
  nodes.push(details);

  nodes.push(el("p", {}, el("a", { href: "staff.html", textContent: "Back to today's queue" })));
  return nodes;
}

page = mountStaffPage({
  app,
  renderUnlocked(state, ui) {
    const v = buildStaffView(state);
    const texts = { ...ui, openText: v.open ? "The queue is open." : "The queue is closed.", linkText: patientLink(v.joinToken) };
    view.show([v.open, ui.offline].join("|"), () => build(v, ui), texts);
  },
});
