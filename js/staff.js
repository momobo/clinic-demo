// Staff home: the next patient and one big "Call next patient" button.
import { store, el, card, note, button, act, say, createView, mountStaffPage } from "./staff-common.js";
import { buildStaffView, messages } from "./staff-view.js";

const app = document.getElementById("app");
const view = createView(app);
let page;

const current = () => buildStaffView(page.getState());

function build(v, ui) {
  const nodes = [];
  if (ui.offline) nodes.push(el("div", { className: "banner offline", role: "status", bind: "offlineText" }));

  nodes.push(card(el("h2", { className: "label", textContent: "Queue" }), el("p", { className: "big", bind: "statusLine" }),
    ...(v.open ? [] : [button("Open the queue", () => act(view, () => store.setOpen(true), messages.opened, "call-btn"), { className: "primary", focusId: "open-btn" })])));

  if (v.open) {
    nodes.push(card(
      el("h2", { bind: "nextHeading", focusId: "next-heading" }), note("nextDetail"),
      button("", () => {
        const now = current();
        if (now.nextNumber === null) { say(messages.nobodyWaiting); return; } // aria-disabled: stays focusable
        act(view, () => store.serveNext(), messages.called(now.nextNumber, now.waiting.length - 1), "call-btn");
      }, { className: "primary", bind: "callLabel", focusId: "call-btn" }),
    ));
  }

  const list = card(el("h2", { bind: "listHeading", focusId: "list-heading" }));
  const ol = el("ol", { className: "queue-list" });
  v.waiting.forEach((w, i) => {
    const next = v.waiting[i + 1];
    const afterRemoval = next ? `noshow-${next.id}` : "list-heading";
    const row = el("li", { className: "row" }, el("p", { textContent: `#${w.number}, joined ${w.joinedTime}` }));
    const actions = el("div", { className: "actions" },
      button("Didn't show up", () => act(view, () => store.markNoShow(w.id), messages.noShow(w.number), afterRemoval),
        { focusId: `noshow-${w.id}`, ariaLabel: w.noShowLabel }),
      button("Remove from queue", () => act(view, () => store.removeTicket(w.id), messages.removed(w.number), afterRemoval),
        { focusId: `remove-${w.id}`, ariaLabel: w.removeLabel }));
    if (w.moveLabel) {
      actions.append(button("Move to front", () => act(view, () => store.moveToFront(w.id), messages.moved(w.number), `noshow-${w.id}`),
        { focusId: `move-${w.id}`, ariaLabel: w.moveLabel }));
    }
    row.append(actions);
    ol.append(row);
  });
  list.append(ol);
  nodes.push(list, note("updatedText"));
  return nodes;
}

page = mountStaffPage({
  app,
  renderUnlocked(state, ui) {
    const v = buildStaffView(state);
    const key = [v.open, ui.offline, v.waiting.map((w) => w.id).join(",")].join("|");
    view.show(key, () => build(v, ui), { ...v, ...ui });
    const call = app.querySelector('[data-focus-id="call-btn"]');
    if (call) call.setAttribute("aria-disabled", v.nextNumber === null ? "true" : "false");
  },
});
