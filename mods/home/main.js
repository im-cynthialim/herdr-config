import { View, div } from "gpui-kit";
import { v_flex, h_flex, TextareaState, Textarea } from "gpui-base";
import { run, theme, checking, nextCommand } from "herdr";
import { startWorktree, nextFreeFolder } from "./new-worktree.js";

export default class Home extends View {
  init(_props, cx) {
    this.step = null;
    this.error = null;
    this.created = null;
    this.nextFolder = null;
    this.input = TextareaState.new({ placeholder: "What should the new worktree work on?" });
    this.input.set_auto_grow(4, 14);
    this.input.on("submit", (_e, cx) => this.start(cx));
    if (checking()) return;
    this.input.focus();
    this.refreshNextFolder(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "start") this.start(cx);
      }
    });
  }

  refreshNextFolder(cx) {
    cx.spawn(async (cx) => {
      this.nextFolder = await nextFreeFolder();
      cx.notify();
    });
  }

  start(cx) {
    const prompt = this.input.value().trim();
    if (!prompt || this.step) return;
    this.error = null;
    this.created = null;
    cx.spawn(async (cx) => {
      try {
        this.created = await startWorktree(prompt, (step) => {
          this.step = step;
          cx.notify();
        });
        this.input.set_value("");
        run("layout.select", { stack: "page", child: "body" });
      } catch (error) {
        this.error = String(error?.message ?? error);
      }
      this.step = null;
      this.refreshNextFolder(cx);
      cx.notify();
    });
  }

  render() {
    const t = theme();
    const busy = this.step !== null;
    const target = this.nextFolder ? `~/${this.nextFolder.name}` : "a new folder";

    const startButton = h_flex()
      .id("home-start")
      .h(32)
      .px(14)
      .items_center()
      .rounded(8)
      .bg(busy ? t.raised : t.solid)
      .text_color(busy ? t.muted : t.solid_foreground)
      .text_size(12.5)
      .font_medium()
      .cursor_pointer()
      .hover((s) => s.opacity(0.88))
      .on_click((_e, cx) => this.start(cx))
      .child(busy ? "Working…" : "Start worktree  ⌘↵");

    return v_flex()
      .size_full()
      .items_center()
      .justify_center()
      .px(16)
      .bg(t.background)
      .text_color(t.foreground)
      .child(
        v_flex()
          .w_full()
          .max_w(680)
          .mb(80)
          .gap(12)
          .child(div().text_size(22).font_semibold().child("New worktree"))
          .child(
            div()
              .text_size(12.5)
              .text_color(t.muted)
              .child(`Starts ${target} from origin/main with a branch named after your prompt, then opens Claude there with it.`),
          )
          .child(
            Textarea.new(this.input)
              .p(12)
              .rounded(10)
              .border_1()
              .border_color(t.input)
              .bg(t.surface)
              .text_size(13.5),
          )
          .child(
            h_flex()
              .justify_between()
              .items_center()
              .child(
                div()
                  .text_size(12)
                  .text_color(this.error ? t.blocked : t.dim)
                  .child(
                    this.error ??
                      this.step ??
                      (this.created ? `Started ~/${this.created.folder.name} on ${this.created.branch}` : ""),
                  ),
              )
              .child(startButton),
          ),
      );
  }
}
