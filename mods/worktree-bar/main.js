import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, run, theme, layout, nextCommand, checking } from "herdr";

const URGENCY = { blocked: 0, done: 1 };

const PANELS = [
  { id: "files", label: "Files" },
  { id: "changes", label: "Changes" },
];

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

function needingYou() {
  return agents()
    .filter((a) => a.status in URGENCY)
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || b.seq - a.seq);
}

function showWork() {
  run("layout.select", { stack: "page", child: "body" });
}

function showHome() {
  run("layout.select", { stack: "page", child: "home" });
}

function selectSpace(space) {
  if (!space) return;
  showWork();
  run("space.select", { id: space.id });
}

function selectSpaceBy(offset) {
  const all = spaces();
  const current = all.findIndex((s) => s.active);
  selectSpace(all[(current + offset + all.length) % all.length]);
}

function newSpace() {
  showWork();
  run("space.new", {});
}

const COMMANDS = {
  "attention": goToNextNeedingYou,
  "close": () => closeSmallest(),
  "home": showHome,
  "last": () => selectSpace(spaces().at(-1)),
  "new": newSpace,
  "next": () => selectSpaceBy(1),
  "prev": () => selectSpaceBy(-1),
  "go-1": () => selectSpace(spaces()[0]),
  "go-2": () => selectSpace(spaces()[1]),
  "go-3": () => selectSpace(spaces()[2]),
  "go-4": () => selectSpace(spaces()[3]),
  "go-5": () => selectSpace(spaces()[4]),
  "go-6": () => selectSpace(spaces()[5]),
  "go-7": () => selectSpace(spaces()[6]),
  "go-8": () => selectSpace(spaces()[7]),
};

function goToNextNeedingYou() {
  const waiting = needingYou();
  if (waiting.length === 0) return;
  const current = waiting.findIndex((a) => a.focused);
  const next = waiting[(current + 1) % waiting.length];
  showWork();
  run("agent.focus", { terminal: next.address });
}

function closeSmallest() {
  const space = spaces().find((s) => s.active);
  const tab = space?.tabs.find((t) => t.active);
  if (!space || !tab) return;
  showWork();
  if (tab.panes > 1) run("pane.close", {});
  else if (space.tabs.length > 1) run("tab.close", { id: tab.id });
  else run("space.close", { id: space.id });
}

const stop = (_e, cx) => cx.stop_propagation();

export default class WorktreeBar extends View {
  init(_props, cx) {
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        COMMANDS[command]?.();
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    const statusColor = { blocked: t.blocked, done: t.done, working: t.working, idle: t.idle };
    const waiting = needingYou();
    const root = layout();
    const panel = find(root, "panel");
    const panelBody = find(root, "panel-body");
    const homeShown = find(root, "page")?.active === "home";

    const entry = (space) => {
      const dot = space.status ? statusColor[space.status] : null;
      return h_flex()
        .id(`space-${space.id}`)
        .gap(5)
        .px(8)
        .h(26)
        .items_center()
        .rounded(5)
        .flex_none()
        .when(space.active && !homeShown, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .on_mouse_down("left", stop)
        .on_click(() => selectSpace(space))
        .when(space.index <= 8, (el) => el.child(div().text_color(t.dim).child(String(space.index))))
        .child(
          div()
            .text_color(space.active && !homeShown ? t.foreground : t.muted)
            .when(space.active && !homeShown, (el) => el.font_semibold())
            .child(space.name),
        )
        .when(space.tabs.length > 1, (el) => el.child(div().text_color(t.dim).child(`×${space.tabs.length}`)))
        .when(dot !== null, (el) => el.child(div().w(6).h(6).rounded(3).bg(dot)));
    };

    const newSpaceButton = div()
      .id("space-new")
      .px(8)
      .h(26)
      .flex()
      .items_center()
      .rounded(5)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover))
      .on_mouse_down("left", stop)
      .on_click(() => newSpace())
      .child("+");

    const homeButton = div()
      .id("home")
      .w(26)
      .h(26)
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .flex_none()
      .when(homeShown, (el) => el.bg(t.selected).text_color(t.foreground))
      .when(!homeShown, (el) => el.text_color(t.muted))
      .hover((s) => s.bg(t.hover))
      .on_mouse_down("left", stop)
      .on_click(() => (homeShown ? showWork() : showHome()))
      .child(svg("mods/worktree-bar/home.svg").size(14));

    const panelButton = ({ id, label }) => {
      const on = panel && !panel.hidden && panelBody?.active === id;
      return div()
        .id(`panel-${id}`)
        .px(8)
        .h(26)
        .flex()
        .items_center()
        .rounded(5)
        .when(on, (el) => el.bg(t.selected).text_color(t.foreground))
        .when(!on, (el) => el.text_color(t.muted))
        .hover((s) => s.bg(t.hover))
        .on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else {
            run("layout.select", { stack: "panel-body", child: id });
            run("layout.show", { id: "panel" });
          }
        })
        .child(label);
    };

    const attention = h_flex()
      .id("attention")
      .gap(6)
      .px(10)
      .h(26)
      .items_center()
      .rounded(5)
      .when(waiting.length > 0, (el) => el.bg(t.blocked).text_color(t.background))
      .when(waiting.length === 0, (el) => el.text_color(t.dim))
      .hover((s) => s.bg(t.hover))
      .on_mouse_down("left", stop)
      .on_click(() => goToNextNeedingYou())
      .child(waiting.length > 0 ? `${waiting.length} need you` : "all clear")
      .child(div().child("⌘J"));

    return h_flex()
      .size_full()
      .items_center()
      .justify_between()
      .gap(8)
      .pl(84)
      .pr(10)
      .bg(t.chrome)
      .text_size(12)
      .child(
        h_flex()
          .gap(2)
          .items_center()
          .min_w(0)
          .overflow_x_hidden()
          .children([homeButton, ...spaces().map(entry), newSpaceButton]),
      )
      .child(h_flex().gap(2).items_center().flex_none().children([...PANELS.map(panelButton), attention]));
  }
}
