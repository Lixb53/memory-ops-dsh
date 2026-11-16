/**
 * @memory-ops/dsh-plugin — 浏览器半体。
 * 由 scripts/build-plugin.mjs 生成，请勿手改。
 *
 * 宿主经 combo 路由下发本文件，执行时调用 __ModuleLoader__.load：
 * id 必须等于包名，factory 收到模块表 require（react 等平台模块由宿主提供）。
 */
window.__ModuleLoader__.load({
  id: '@memory-ops/dsh-plugin',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    (function (module, exports, require) {
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/dsh-plugin/src/client/index.ts
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// packages/dsh-plugin/src/client/register.ts
var import_react15 = require("react");

// packages/dsh-plugin/src/client/pane-nav.ts
var import_react = require("react");
var PANEL_ID = "memory-ops";
var state = { pane: null };
var listeners = /* @__PURE__ */ new Set();
var store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return state;
  },
  set(next) {
    if (next.pane === state.pane) return;
    state = next;
    for (const listener of listeners) listener();
  }
};
function requestPane(pane) {
  store.set({ pane });
}
function consumePaneRequest() {
  const pane = store.getSnapshot().pane;
  if (pane === null) return void 0;
  store.set({ pane: null });
  return pane;
}
function usePaneRequest() {
  const [snapshot, setSnapshot] = (0, import_react.useState)(() => store.getSnapshot());
  (0, import_react.useEffect)(() => {
    let alive = true;
    const sync = () => {
      if (alive) setSnapshot(store.getSnapshot());
    };
    sync();
    const unsubscribe = store.subscribe(sync);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return snapshot.pane ?? void 0;
}
function gotoPane(ctx, pane, direct) {
  requestPane(pane);
  let layout = direct;
  if (layout === void 0) {
    try {
      layout = ctx?.get?.("layout");
    } catch {
      layout = void 0;
    }
  }
  if (layout === void 0 || typeof layout.selectPanel !== "function") return false;
  try {
    layout.selectPanel(PANEL_ID);
    return true;
  } catch {
    return false;
  }
}

// packages/dsh-plugin/src/client/panel.ts
var import_react11 = require("react");

// packages/dsh-plugin/src/client/ui.ts
var import_react2 = require("react");
var h = import_react2.createElement;
var EMPTY = "\u2014";
function orEmpty(value) {
  if (value === void 0 || value === null) return EMPTY;
  const text = String(value).trim();
  return text === "" ? EMPTY : text;
}
function truncate(text, max = 46) {
  const chars = [...String(text ?? "")];
  if (chars.length <= max) return String(text ?? "");
  return `${chars.slice(0, max - 1).join("")}\u2026`;
}
function percent(value, digits = 0) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY;
  return `${(value * 100).toFixed(digits)}%`;
}
function count(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY;
  return value.toLocaleString("zh-CN");
}
function bytes(value) {
  if (value === null || value === void 0) return EMPTY;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
function statusTone(status) {
  switch (status) {
    case "confirmed":
      return "ok";
    case "hypothesis":
    case "observed":
    case "stale":
      return "warn";
    case "rejected":
      return "err";
    case "reinforced":
      return "brand";
    default:
      return "idle";
  }
}
var STATUS_LABEL = {
  hypothesis: "\u5019\u9009",
  observed: "\u89C2\u5BDF\u4E2D",
  reinforced: "\u5DF2\u5F3A\u5316",
  confirmed: "\u5DF2\u786E\u8BA4",
  rejected: "\u5DF2\u9A73\u56DE",
  stale: "\u5F85\u590D\u6838",
  archived: "\u5DF2\u5F52\u6863",
  active: "\u6709\u6548",
  pending: "\u5F85\u786E\u8BA4"
};
function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}
function Badge({ tone = "idle", children, title }) {
  return h("span", { className: `dmo-badge dmo-badge-${tone}`, title }, children);
}
function Button({ children, onClick, variant = "plain", disabled = false, title, small = false }) {
  const variantClass = variant === "primary" ? " dmo-btn-primary" : variant === "danger" ? " dmo-btn-danger" : "";
  return h("button", {
    type: "button",
    className: `dmo-btn${variantClass}${small ? " dmo-btn-sm" : ""}`,
    onClick: disabled ? void 0 : onClick,
    disabled,
    title
  }, children);
}
function Empty({ title, children }) {
  return h(
    "div",
    { className: "dmo-empty" },
    title === void 0 ? null : h("div", { className: "dmo-empty-title" }, title),
    children
  );
}
function ErrorState({ message, onRetry }) {
  return h(
    "div",
    { className: "dmo-error", role: "alert" },
    h("div", null, message),
    onRetry === void 0 ? null : h(
      "div",
      { style: { marginTop: 7 } },
      h(Button, { onClick: onRetry, small: true }, "\u91CD\u8BD5")
    )
  );
}
function Skeleton({ rows = 3, height = 52 }) {
  return h(
    "div",
    { "aria-busy": "true", "aria-live": "polite" },
    Array.from({ length: rows }, (_, index) => h("div", {
      key: index,
      className: "dmo-skeleton",
      style: { height }
    }))
  );
}
function Kpi({ label, value, note }) {
  return h(
    "div",
    { className: "dmo-kpi" },
    h("div", { className: "dmo-kpi-label", title: label }, label),
    h("div", { className: "dmo-kpi-value" }, value),
    note === void 0 ? null : h("div", { className: "dmo-kpi-note" }, note)
  );
}
function Stepper({ status }) {
  const order = ["hypothesis", "observed", "reinforced", "confirmed"];
  const at = order.indexOf(status);
  return h("div", {
    className: "dmo-stepper",
    role: "img",
    "aria-label": `\u7F6E\u4FE1\u5EA6\u72B6\u6001\uFF1A${statusLabel(status)}`
  }, order.map((step, index) => h("span", {
    key: step,
    className: `dmo-step${at < 0 ? "" : index < at ? " dmo-step-on" : index === at ? " dmo-step-now" : ""}`,
    title: statusLabel(step)
  })));
}
function BudgetRow({ name, tokens, limit }) {
  const ratio = limit === null || limit <= 0 ? 0 : Math.min(1, tokens / limit);
  const over = limit !== null && tokens > limit;
  return h(
    "div",
    { className: "dmo-budget-row" },
    h("span", { className: "dmo-budget-name" }, name),
    h(
      "div",
      { className: "dmo-budget-bar" },
      h("div", {
        className: `dmo-budget-fill${over ? " dmo-budget-fill-over" : ""}`,
        style: { width: `${Math.max(ratio * 100, tokens > 0 ? 2 : 0)}%` }
      })
    ),
    h(
      "span",
      { className: "dmo-budget-num" },
      count(tokens),
      limit === null ? "" : ` / ${count(limit)}`
    )
  );
}
function TabBar({ tabs, active, onChange }) {
  return h(
    "div",
    { className: "dmo-tabs", role: "tablist" },
    tabs.map((tab) => h(
      "button",
      {
        key: tab.id,
        type: "button",
        role: "tab",
        className: "dmo-tab",
        "aria-selected": tab.id === active,
        onClick: () => {
          onChange(tab.id);
        }
      },
      tab.label,
      tab.badge === void 0 || tab.badge === 0 ? null : h("span", { className: "dmo-tab-badge" }, tab.badge > 99 ? "99+" : String(tab.badge))
    ))
  );
}
function MemoryIcon({ size = 18 }) {
  return h(
    "svg",
    {
      className: "dmo-icon",
      viewBox: "0 0 20 20",
      width: size,
      height: size,
      "aria-hidden": true,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("rect", { x: 2.5, y: 3, width: 15, height: 11, rx: 2 }),
    h("path", { d: "M5.5 17h9" }),
    h("path", { d: "M6.5 7h7M6.5 10h4.5" })
  );
}
function RejectBox({ reason, onReason, onCancel, onSubmit, busy }) {
  const empty = reason.trim() === "";
  return h(
    "div",
    { style: { marginTop: 7 } },
    h("label", { className: "dmo-label" }, "\u9A73\u56DE\u7406\u7531\uFF08\u5FC5\u586B\uFF0C30 \u5929\u540E\u53EF\u590D\u67E5\uFF09"),
    h("textarea", {
      className: "dmo-textarea",
      value: reason,
      "aria-label": "\u9A73\u56DE\u7406\u7531",
      placeholder: "\u4E3A\u4EC0\u4E48\u8FD9\u6761\u4E0D\u5BF9\uFF1F\u5199\u4E00\u53E5\uFF0C30 \u5929\u540E\u56DE\u770B\u65F6\u4F60\u4F1A\u9700\u8981\u5B83\u3002",
      onChange: (event) => {
        onReason(event.target.value);
      }
    }),
    h(
      "div",
      { className: "dmo-card-actions" },
      h(Button, {
        small: true,
        variant: "danger",
        disabled: busy || empty,
        onClick: onSubmit
      }, busy ? "\u9A73\u56DE\u4E2D\u2026" : "\u786E\u8BA4\u9A73\u56DE"),
      h(Button, { small: true, onClick: onCancel }, "\u53D6\u6D88"),
      empty ? h("span", { className: "dmo-note", style: { margin: 0 } }, "\u7406\u7531\u4E3A\u7A7A\u4E0D\u80FD\u63D0\u4EA4") : null
    )
  );
}
function SelectionBar({ count: selected, total, busy, children, onClear }) {
  if (selected === 0) return null;
  return h(
    "div",
    { className: "dmo-row", style: { marginBottom: 8, flexWrap: "wrap" } },
    h("span", { className: "dmo-note", style: { margin: 0 } }, `\u5DF2\u9009 ${selected} / ${total} \u6761`),
    children,
    h(Button, { small: true, disabled: busy === true, onClick: onClear }, "\u6E05\u7A7A\u9009\u62E9")
  );
}
function Chip({ label, count: num, active, onClick }) {
  return h(
    "button",
    {
      type: "button",
      className: "dmo-chip",
      "aria-pressed": active,
      onClick
    },
    label,
    num === void 0 ? null : h("span", { className: "dmo-chip-num" }, num)
  );
}
function Band({ cells }) {
  return h(
    "div",
    { className: "dmo-band", role: "group", "aria-label": "\u672A\u547D\u4E2D\u4E94\u6001" },
    cells.map((cell) => h(
      "div",
      {
        key: cell.label,
        className: "dmo-band-cell",
        "data-tone": cell.tone ?? "idle",
        "data-active": cell.active === true ? "true" : void 0
      },
      h("div", { className: "dmo-band-v" }, cell.value),
      h("div", { className: "dmo-band-l", title: cell.label }, cell.label)
    ))
  );
}
function Group({ title, count: num, children, action }) {
  return h(
    "div",
    { className: "dmo-group" },
    h(
      "div",
      { className: "dmo-group-head" },
      h("h3", { className: "dmo-group-title" }, title),
      num === void 0 ? null : h("span", { className: "dmo-group-count" }, num),
      action === void 0 ? null : h("span", { style: { marginLeft: "auto" } }, action)
    ),
    children
  );
}
function AnchorNote({ state: state2, children }) {
  return h("div", { className: "dmo-anchor-note", "data-state": state2, role: "note" }, children);
}
function Quote({ children }) {
  return h("p", { className: "dmo-quote" }, children);
}

// packages/dsh-plugin/src/client/session-context.ts
var import_react3 = require("react");
function isObservable(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return typeof candidate.getSnapshot === "function" && typeof candidate.subscribe === "function";
}
function useObservable(observable, fallback) {
  const [value, setValue] = (0, import_react3.useState)(() => {
    if (observable === void 0) return fallback;
    try {
      return observable.getSnapshot();
    } catch {
      return fallback;
    }
  });
  (0, import_react3.useEffect)(() => {
    if (observable === void 0) return void 0;
    let alive = true;
    const sync = () => {
      if (!alive) return;
      try {
        setValue(observable.getSnapshot());
      } catch {
      }
    };
    sync();
    const unsubscribe = observable.subscribe(sync);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [observable]);
  return value;
}
function getService(ctx, name) {
  if (ctx === void 0 || typeof ctx.get !== "function") return void 0;
  try {
    return ctx.get(name);
  } catch {
    return void 0;
  }
}
function useCurrentSessionId(ctx) {
  const uiSession = getService(ctx, "uiSession");
  const current = isObservable(uiSession?.adapter?.current) ? uiSession.adapter.current : void 0;
  const binding = useObservable(current, { key: void 0 });
  return typeof binding?.key === "string" && binding.key !== "" ? binding.key : void 0;
}
function useSessionCwd(ctx, sessionId) {
  const sessions = getService(ctx, "sessions");
  const list = isObservable(sessions?.list) ? sessions.list : void 0;
  const state2 = useObservable(list, { byId: void 0 });
  if (sessionId === void 0) return void 0;
  const cwd = state2?.byId?.[sessionId]?.cwd;
  return typeof cwd === "string" && cwd !== "" ? cwd : void 0;
}
function projectFromCwd(cwd) {
  if (cwd === void 0) return void 0;
  const parts = cwd.replace(/\/+$/, "").split("/");
  const name = parts[parts.length - 1];
  if (typeof name !== "string" || name === "") return void 0;
  if (/^v?\d+(\.\d+)*(-|$)/i.test(name)) return void 0;
  return name;
}
function useSessionProject(ctx) {
  const sessionId = useCurrentSessionId(ctx);
  const cwd = useSessionCwd(ctx, sessionId);
  return { sessionId, cwd, project: projectFromCwd(cwd) };
}
function scopeBody(cwd, project) {
  if (cwd !== void 0 && cwd.trim() !== "") return { cwd };
  if (project !== void 0 && project !== "") return { project };
  return {};
}

// packages/dsh-plugin/src/client/panes/project.ts
var import_react5 = require("react");

// packages/dsh-plugin/src/client/api.ts
var PREFIX = "/api/dsh-memory-ops";
var BridgeError = class extends Error {
  constructor(message, route) {
    super(message);
    this.route = route;
  }
  route;
  name = "BridgeError";
};
async function call(route, body = {}) {
  let response;
  try {
    response = await fetch(`${PREFIX}/${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new BridgeError(
      `\u65E0\u6CD5\u8FDE\u63A5\u8BB0\u5FC6\u5E93\u5BBF\u4E3B\uFF08${route}\uFF09\uFF1A${error instanceof Error ? error.message : String(error)}`,
      route
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new BridgeError(`\u5BBF\u4E3B\u8FD4\u56DE\u4E86\u975E JSON \u54CD\u5E94\uFF08${route}\uFF0CHTTP ${response.status}\uFF09`, route);
  }
  const record = payload;
  if (record?.ok === false) {
    throw new BridgeError(record.error ?? "\u672A\u77E5\u9519\u8BEF", route);
  }
  if (!response.ok) {
    throw new BridgeError(`HTTP ${response.status}`, route);
  }
  return payload;
}

// packages/dsh-plugin/src/client/data.ts
var import_react4 = require("react");
function useBridge(route, body, deps = []) {
  const [phase, setPhase] = (0, import_react4.useState)("loading");
  const [data, setData] = (0, import_react4.useState)(void 0);
  const [error, setError] = (0, import_react4.useState)(void 0);
  const [nonce, setNonce] = (0, import_react4.useState)(0);
  const reload = (0, import_react4.useCallback)(() => {
    setNonce((value) => value + 1);
  }, []);
  const bodyKey = JSON.stringify(body);
  (0, import_react4.useEffect)(() => {
    let alive = true;
    setPhase("loading");
    setError(void 0);
    call(route, JSON.parse(bodyKey)).then((payload) => {
      if (!alive) return;
      setData(payload);
      setPhase("ready");
    }).catch((failure) => {
      if (!alive) return;
      setError(failure instanceof BridgeError ? failure.message : String(failure));
      setPhase("error");
    });
    return () => {
      alive = false;
    };
  }, [route, bodyKey, nonce, ...deps]);
  return { phase, data, error, reload };
}

// packages/dsh-plugin/src/client/panes/project.ts
function ProjectPane({ project, cwd, onOpenMemory, onGoto }) {
  const { phase, data, error, reload } = useBridge(
    "snapshot",
    scopeBody(cwd, project),
    [cwd, project]
  );
  const misses = useBridge("misses", {});
  if (phase === "loading") return (0, import_react5.createElement)(Skeleton, { rows: 3 });
  if (phase === "error") {
    return (0, import_react5.createElement)(ErrorState, {
      message: `\u8BFB\u53D6\u8BB0\u5FC6\u5931\u8D25\uFF1A${orEmpty(error)}\u3002\u8BB0\u5FC6\u5E93\u672C\u8EAB\u6CA1\u6709\u88AB\u6E05\u7A7A\uFF0C\u8FD9\u662F\u8BFB\u53D6\u95EE\u9898\u3002`,
      onRetry: reload
    });
  }
  if (data === void 0) return (0, import_react5.createElement)(Skeleton, { rows: 2 });
  const entries = data.entries;
  const queue = data.queue;
  const resolution = data.resolution;
  const resolved = data.projectScoped && data.project !== null;
  const unknown = data.projectScoped === false && resolution !== null && resolution.project === null;
  const noCwd = data.projectScoped === false && resolution === null;
  const fallbackNote = unknown ? `\u6CA1\u80FD\u4ECE\u5F53\u524D\u76EE\u5F55\u8BA4\u51FA\u9879\u76EE\uFF1A${orEmpty(resolution?.reason)}\u3002\u4E0B\u9762\u5148\u5C55\u793A\u5168\u90E8\u8BB0\u5FC6\u3002` : noCwd ? "\u6CA1\u62FF\u5230\u5F53\u524D\u76EE\u5F55\uFF0C\u65E0\u6CD5\u5224\u5B9A\u9879\u76EE\u3002\u4E0B\u9762\u5148\u5C55\u793A\u5168\u90E8\u8BB0\u5FC6\uFF08\u4EFB\u52A1\u4E0D\u53D7\u5F71\u54CD\uFF09\u3002" : "";
  return (0, import_react5.createElement)(
    "div",
    null,
    // 降级条：明确说任务不受影响，而不是假装没有数据
    fallbackNote === "" ? null : (0, import_react5.createElement)(
      "div",
      { className: "dmo-degrade" },
      fallbackNote,
      resolution === null ? null : (0, import_react5.createElement)(
        "div",
        { className: "dmo-row-sub" },
        `\u5F53\u524D\u76EE\u5F55\uFF1A${orEmpty(resolution.cwd)}`,
        resolution.knownProjects.length === 0 ? "" : ` \xB7 \u5DF2\u77E5\u9879\u76EE\uFF1A${resolution.knownProjects.join(" / ")}`
      ),
      /**
       * 解析失败的**修法**必须写出来。
       *
       * 只说「没认出来」而不说怎么修，用户只能去翻源码——而这套判定
       * 的入口就是一句 frontmatter，本来就该是可自助的。
       */
      (0, import_react5.createElement)(
        "div",
        { className: "dmo-row-sub", style: { marginTop: 2 } },
        "\u8981\u8BA9\u4E0B\u6B21\u80FD\u8BA4\u51FA\u6765\uFF1A\u5728 ",
        (0, import_react5.createElement)("span", { className: "dmo-mono" }, "work/<\u9879\u76EE>/index.md"),
        " \u7684 frontmatter \u91CC\u52A0\u4E00\u884C ",
        (0, import_react5.createElement)("span", { className: "dmo-mono" }, "aliases: [<\u76EE\u5F55\u540D\u6216\u5206\u652F\u540D>, \u2026]"),
        "\uFF0C\u628A\u5F53\u524D\u76EE\u5F55\u540D\u767B\u8BB0\u8FDB\u53BB\u3002"
      ),
      (0, import_react5.createElement)(
        "div",
        { style: { marginTop: 4 } },
        (0, import_react5.createElement)(Button, { small: true, onClick: reload }, "\u91CD\u65B0\u5224\u5B9A"),
        // 解析不出来的人为出口：告诉他怎么让下次能认出来
        (0, import_react5.createElement)(Button, { small: true, onClick: () => {
          onGoto("memory");
        } }, "\u6309\u9879\u76EE\u6D4F\u89C8")
      )
    ),
    (0, import_react5.createElement)(
      "div",
      { className: "dmo-kpis" },
      (0, import_react5.createElement)(Kpi, {
        label: "\u76F8\u5173\u8BB0\u5FC6",
        value: count(entries.length),
        note: resolved ? orEmpty(data.project) : "\u5168\u90E8\u57DF"
      }),
      (0, import_react5.createElement)(Kpi, {
        label: "\u5F85\u4F60\u5904\u7406",
        value: count(queue.length),
        note: queue.length === 0 ? "\u961F\u5217\u5DF2\u6E05" : "\u9700\u62CD\u677F"
      }),
      (0, import_react5.createElement)(Kpi, {
        label: "\u547D\u4E2D\u7387",
        value: percent(data.stats.rates.hitRate),
        note: "30 \u5929"
      }),
      // 这一格必须说清「谁的前缀」：项目视图量的是该项目的索引，
      // 不是全库（全库数字在「总览」）。两者混用会得出错误结论。
      (0, import_react5.createElement)(Kpi, {
        label: "\u672C\u9879\u76EE\u7D22\u5F15",
        value: count(data.stats.layers.l0.tokens),
        note: data.statsScope === "scoped" ? "tokens \xB7 \u88AB read \u65F6\u624D\u4ED8\u8D39" : "\u5168\u5E93\u7D22\u5F15"
      })
    ),
    // 本项目索引文件：让「151」这个数字可追溯到具体文件
    (data.projectIndex ?? []).length === 0 ? null : (0, import_react5.createElement)(
      "div",
      { className: "dmo-note" },
      "\u672C\u9879\u76EE\u7D22\u5F15\uFF1A",
      (data.projectIndex ?? []).map((item, index) => (0, import_react5.createElement)(
        "span",
        { key: item.path },
        index === 0 ? "" : " \xB7 ",
        (0, import_react5.createElement)("span", {
          className: "dmo-link",
          role: "button",
          tabIndex: 0,
          onClick: () => {
            onOpenMemory(item.path);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") onOpenMemory(item.path);
          }
        }, item.title),
        ` ${count(item.tokens)}`
      ))
    ),
    /**
     * 未命中补齐：本项目语境下最该补的那几条。
     *
     * 只取「该补了」状态（问过 ≥3 次），并给一个去工作台的出口——
     * 这里不重复完整流水线，那是「未命中」分区的职责。
     */
    (misses.data?.["pipeline"]?.["should-fill"]?.length ?? 0) === 0 ? null : (0, import_react5.createElement)(
      Group,
      {
        title: "\u672A\u547D\u4E2D\u8865\u9F50",
        count: `${misses.data?.["pipeline"]?.["should-fill"]?.length} \u6761\u53EF\u8865`,
        action: (0, import_react5.createElement)(Button, { small: true, onClick: () => {
          onGoto("misses");
        } }, "\u53BB\u5DE5\u4F5C\u53F0 \u2192")
      },
      (misses.data?.["pipeline"]?.["should-fill"] ?? []).slice(0, 3).map((item) => (0, import_react5.createElement)(
        "div",
        {
          key: item.query,
          className: "dmo-card"
        },
        (0, import_react5.createElement)("div", { className: "dmo-card-title dmo-mono" }, `"${truncate(item.query, 38)}"`),
        (0, import_react5.createElement)(
          "div",
          { className: "dmo-card-meta" },
          (0, import_react5.createElement)(Badge, { tone: "warn" }, "\u53EF\u8865"),
          (0, import_react5.createElement)("span", null, `${count(item.count)} \u6B21\u672A\u547D\u4E2D`),
          (0, import_react5.createElement)("span", null, `${count(item.sessions ?? 1)} \u4E2A\u4F1A\u8BDD`)
        ),
        (0, import_react5.createElement)(
          "div",
          { className: "dmo-card-actions" },
          (0, import_react5.createElement)(Button, {
            small: true,
            onClick: () => {
              void call("missDraft", { query: item.query, type: "\u95EE\u9898" }).then(() => {
                misses.reload();
              });
            }
          }, "\u751F\u6210\u8349\u7A3F")
        )
      ))
    ),
    // 待确认优先置顶：一条一次点击
    queue.length === 0 ? null : (0, import_react5.createElement)(
      "div",
      { style: { marginBottom: 10 } },
      (0, import_react5.createElement)("div", { className: "dmo-lane-head" }, "\u5F85\u4F60\u5904\u7406", (0, import_react5.createElement)("span", { className: "dmo-lane-count" }, `${queue.length} \u6761`)),
      queue.slice(0, 5).map((item) => (0, import_react5.createElement)(QueueCard, {
        key: item.id,
        item,
        onOpenMemory,
        onChanged: reload
      }))
    ),
    // 项目名分组标题：设计稿有「sz-web-dzh-gslz · 3 条 · 全部 →」
    entries.length === 0 ? null : (0, import_react5.createElement)(Group, {
      title: resolved ? orEmpty(data.project) : "\u76F8\u5173\u8BB0\u5FC6",
      count: `${count(entries.length)} \u6761`,
      action: entries.length > 12 ? (0, import_react5.createElement)(Button, { small: true, onClick: () => {
        onGoto("memory");
      } }, "\u5168\u90E8 \u2192") : null
    }),
    entries.length === 0 ? (0, import_react5.createElement)(
      Empty,
      {
        /**
         * 标题必须跟着「为什么空」走。
         *
         * 早先恒为「当前项目还没有相关记忆」——即使真实原因是
         * 「压根没认出是哪个项目」。用户于是去翻数据找不存在的记忆。
         */
        title: resolved ? `${orEmpty(data.project)} \u8FD8\u6CA1\u6709\u76F8\u5173\u8BB0\u5FC6` : unknown ? "\u6CA1\u8BA4\u51FA\u5F53\u524D\u9879\u76EE" : "\u6CA1\u62FF\u5230\u5F53\u524D\u76EE\u5F55"
      },
      (0, import_react5.createElement)(
        "div",
        null,
        resolved ? "\u8FD9\u4E0D\u662F\u6545\u969C\u2014\u2014\u53EA\u662F\u8FD9\u4E2A\u9879\u76EE\u8FD8\u6CA1\u6C89\u6DC0\u3002" : "\u5224\u5B9A\u4E0D\u4E86\u9879\u76EE\uFF0C\u6240\u4EE5\u4E0D\u6562\u8BF4\u300C\u8FD9\u4E2A\u9879\u76EE\u6CA1\u6709\u300D\u2014\u2014\u4E0B\u9762\u5148\u53BB\u5168\u5E93\u770B\u3002"
      ),
      (0, import_react5.createElement)(
        "div",
        { className: "dmo-row", style: { justifyContent: "center", marginTop: 9 } },
        (0, import_react5.createElement)(Button, { variant: "primary", onClick: () => {
          onGoto("stream");
        } }, "\u8BB0\u4E00\u6761"),
        (0, import_react5.createElement)(Button, { onClick: () => {
          onGoto("misses");
        } }, "\u770B\u672A\u547D\u4E2D"),
        (0, import_react5.createElement)(Button, { onClick: reload }, "\u91CD\u65B0\u8BFB\u53D6")
      )
    ) : (0, import_react5.createElement)(
      "div",
      null,
      entries.slice(0, 12).map((entry) => (0, import_react5.createElement)(
        "div",
        {
          key: entry.id,
          className: "dmo-card",
          role: "button",
          tabIndex: 0,
          style: { cursor: "pointer" },
          onClick: () => {
            onOpenMemory(entry.path);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") onOpenMemory(entry.path);
          }
        },
        (0, import_react5.createElement)("div", { className: "dmo-card-title" }, truncate(entry.title, 46)),
        (0, import_react5.createElement)(
          "div",
          { className: "dmo-card-meta" },
          (0, import_react5.createElement)(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
          entry.anchor === null ? null : (0, import_react5.createElement)(Badge, { tone: "brand" }, "\u951A\u70B9"),
          (0, import_react5.createElement)("span", null, `${entry.domainLabel}`),
          (0, import_react5.createElement)("span", null, `${count(entry.tokens)} tokens`),
          entry.expiry.level === "fresh" ? null : (0, import_react5.createElement)(Badge, { tone: "warn" }, entry.expiry.level === "retire" ? `${entry.expiry.days} \u5929\u672A\u5F15\u7528` : "\u4E34\u8FD1\u9000\u5F79")
        ),
        entry.evidence.length === 0 ? null : (0, import_react5.createElement)(
          "div",
          { className: "dmo-evidence" },
          (0, import_react5.createElement)("div", null, truncate(entry.evidence[0]?.excerpt ?? "", 60)),
          (0, import_react5.createElement)(
            "div",
            { className: "dmo-evidence-src" },
            `${orEmpty(entry.evidence[0]?.gate)} \xB7 ${orEmpty(entry.evidence[0]?.session)}`
          )
        )
      )),
      entries.length > 12 ? (0, import_react5.createElement)("div", { className: "dmo-note" }, `\u8FD8\u6709 ${entries.length - 12} \u6761\uFF0C\u53BB\u300C\u8BB0\u5FC6\u300D\u5206\u533A\u770B\u5168\u91CF\u3002`) : null
    )
  );
}
function QueueCard({ item, onOpenMemory, onChanged }) {
  const [rejecting, setRejecting] = (0, import_react5.useState)(false);
  const [reason, setReason] = (0, import_react5.useState)("");
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [toast, setToast] = (0, import_react5.useState)(null);
  function run(action, success, after) {
    setBusy(true);
    setToast(null);
    void action().then(() => {
      setToast({ ok: true, text: success });
      setRejecting(false);
      setReason("");
      after?.();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  return (0, import_react5.createElement)(
    "div",
    { className: "dmo-card" },
    (0, import_react5.createElement)("div", { className: "dmo-card-title" }, truncate(item.title, 46)),
    (0, import_react5.createElement)(
      "div",
      { className: "dmo-card-meta" },
      (0, import_react5.createElement)(Badge, { tone: "warn" }, item.reason),
      item.confidence === null ? null : (0, import_react5.createElement)(Badge, { tone: "idle" }, `\u7F6E\u4FE1 ${item.confidence.toFixed(1)}`),
      (0, import_react5.createElement)("span", null, item.domainLabel)
    ),
    (0, import_react5.createElement)(Stepper, { status: item.status }),
    item.evidence.length === 0 ? (0, import_react5.createElement)("div", { className: "dmo-note" }, "\u65E0\u8BC1\u636E\u6458\u5F55\uFF08G1 \u7528\u6237\u76F4\u8FF0\u53EF\u8C41\u514D\uFF09") : (0, import_react5.createElement)(
      "div",
      { className: "dmo-evidence" },
      (0, import_react5.createElement)("div", null, truncate(item.evidence[0]?.excerpt ?? "", 70)),
      (0, import_react5.createElement)("div", { className: "dmo-evidence-src" }, `\u51FA\u5904\uFF1A${orEmpty(item.origin)} \xB7 ${orEmpty(item.evidence[0]?.session)}`)
    ),
    toast === null ? null : (0, import_react5.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginTop: 6 }
    }, toast.text),
    rejecting ? (0, import_react5.createElement)(RejectBox, {
      reason,
      onReason: setReason,
      busy,
      onCancel: () => {
        setRejecting(false);
        setReason("");
      },
      onSubmit: () => {
        run(() => call("reject", { path: item.path, reason }), "\u5DF2\u9A73\u56DE\uFF0C30 \u5929\u5185\u4E0D\u518D\u63A8\u8350", onChanged);
      }
    }) : null,
    (0, import_react5.createElement)(
      "div",
      { className: "dmo-card-actions" },
      item.kind === "retire" ? (0, import_react5.createElement)(Button, {
        small: true,
        variant: "danger",
        onClick: () => {
          run(() => call("archive", { path: item.path, reason: "\u5230\u671F\u9000\u5F79" }), "\u5DF2\u5F52\u6863", onChanged);
        }
      }, "\u5F52\u6863") : (0, import_react5.createElement)(Button, {
        small: true,
        variant: "primary",
        onClick: () => {
          run(() => call("confirm", { path: item.path }), "\u5DF2\u786E\u8BA4", onChanged);
        }
      }, "\u786E\u8BA4"),
      // 确认与驳回必须并列出现：只给确认，等于替用户做决定。
      item.kind === "retire" ? null : (0, import_react5.createElement)(Button, {
        small: true,
        variant: "danger",
        disabled: busy,
        onClick: () => {
          setRejecting((value) => !value);
        }
      }, rejecting ? "\u53D6\u6D88\u9A73\u56DE" : "\u9A73\u56DE"),
      (0, import_react5.createElement)(Button, { small: true, onClick: () => {
        onOpenMemory(item.path);
      } }, "\u770B\u8BE6\u60C5"),
      (0, import_react5.createElement)(Button, {
        small: true,
        onClick: () => {
          run(() => call("keep", { path: item.path }), "\u5DF2\u518D\u7559 90 \u5929", onChanged);
        }
      }, "\u518D\u7559 90 \u5929")
    )
  );
}

// packages/dsh-plugin/src/client/panes/stream.ts
var import_react6 = require("react");

// packages/core/src/schema.ts
var INBOX_STATES = ["open", "todo", "done", "dropped"];
var KIND_STATES = {
  \u5F85\u529E: ["open", "todo", "done", "dropped"],
  \u8BA1\u5212: ["open", "todo", "done", "dropped"],
  \u95EE\u9898: ["open", "todo", "done", "dropped"],
  \u51B3\u7B56: ["open", "done", "dropped"],
  \u60F3\u6CD5: ["open", "done", "dropped"]
};
function statesOfKind(kind) {
  const value = String(kind ?? "").trim();
  return KIND_STATES[value] ?? INBOX_STATES;
}

// packages/dsh-plugin/src/client/panes/stream.ts
function StreamPane() {
  const [stateFilter, setStateFilter] = (0, import_react6.useState)("");
  const [kindFilter, setKindFilter] = (0, import_react6.useState)("");
  const [textFilter, setTextFilter] = (0, import_react6.useState)("");
  const [selected, setSelected] = (0, import_react6.useState)([]);
  const [busy, setBusy] = (0, import_react6.useState)(false);
  const [toast, setToast] = (0, import_react6.useState)(null);
  const [draft, setDraft] = (0, import_react6.useState)("");
  const [draftKind, setDraftKind] = (0, import_react6.useState)("\u60F3\u6CD5");
  const { phase, data, error, reload } = useBridge(
    "inbox",
    { domain: "personal", state: stateFilter, kind: kindFilter },
    [stateFilter, kindFilter]
  );
  function run(action, success) {
    setBusy(true);
    setToast(null);
    void action().then(() => {
      setToast({ ok: true, text: success });
      setSelected([]);
      reload();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  function captureHere() {
    const content = draft.trim();
    if (content === "" || busy) return;
    setBusy(true);
    setToast(null);
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      void call(
        "captureBatch",
        { text: content, kind: draftKind, domain: "personal" }
      ).then((result) => {
        const ok = result.accepted?.length ?? 0;
        const blocked = result.blocked?.length ?? 0;
        setToast({
          ok: blocked === 0,
          text: blocked === 0 ? `\u5DF2\u8BB0\u5165 ${ok} \u6761` : `${ok} \u6761\u5DF2\u8BB0\u5165\uFF0C${blocked} \u6761\u88AB\u9690\u79C1\u95F8\u95E8\u62E6\u4E0B`
        });
        if (ok > 0) setDraft("");
        reload();
      }).catch((failure) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
      }).finally(() => {
        setBusy(false);
      });
      return;
    }
    run(() => call("capture", { content, kind: draftKind, domain: "personal" }), "\u5DF2\u8BB0\u5165\u8BB0\u5F55\u6D41");
    setDraft("");
  }
  if (phase === "loading") return (0, import_react6.createElement)(Skeleton, { rows: 4, height: 38 });
  if (phase === "error") {
    return (0, import_react6.createElement)(ErrorState, {
      message: `\u8BFB\u53D6\u8BB0\u5F55\u6D41\u5931\u8D25\uFF1A${orEmpty(error)}`,
      onRetry: reload
    });
  }
  if (data === void 0) return (0, import_react6.createElement)(Skeleton, { rows: 2 });
  const throughput = data.throughput;
  const entries = textFilter.trim() === "" ? data.entries : data.entries.filter((entry) => `${entry.content} ${entry.kind} ${entry.destination}`.toLowerCase().includes(textFilter.trim().toLowerCase()));
  const allSelected = entries.length > 0 && selected.length === entries.length;
  return (0, import_react6.createElement)(
    "div",
    null,
    // 吞吐 3 格
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-kpis" },
      (0, import_react6.createElement)(Kpi, { label: "\u5F85\u5904\u7406", value: count(throughput.open), note: "open" }),
      /**
       * 「进行中」是一个真实出口：它能回答「哪些事开了头没结」。
       * 早先这个数字只存在后端（`throughput.todo`），界面上看不到，
       * 于是用户点了「开始」之后没有任何反馈——状态变了，但没人知道它意味着什么。
       */
      (0, import_react6.createElement)(Kpi, { label: "\u8FDB\u884C\u4E2D", value: count(throughput.todo), note: "todo" }),
      (0, import_react6.createElement)(Kpi, { label: "\u5F85\u63D0\u5347", value: count(throughput.toPromote), note: "done \u65E0\u53BB\u5411" }),
      (0, import_react6.createElement)(Kpi, { label: "\u5DF2\u5904\u7406", value: count(throughput.done), note: "done" })
    ),
    // 常驻捕获：有内容没内容都在，随时能记一条
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-capture-inline" },
      (0, import_react6.createElement)("textarea", {
        className: "dmo-textarea",
        value: draft,
        placeholder: "\u8BB0\u4E00\u6761\u2026\uFF08\u2318/Ctrl + Enter \u5B58\u5165\uFF0C\u591A\u884C\u4F1A\u9010\u6761\u62C6\u5F00\uFF09",
        "aria-label": "\u5728\u8BB0\u5F55\u6D41\u4E2D\u8BB0\u4E00\u6761",
        onChange: (event) => {
          setDraft(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" && (event.metaKey === true || event.ctrlKey === true)) {
            event.preventDefault();
            captureHere();
          }
        }
      }),
      (0, import_react6.createElement)(
        "div",
        { className: "dmo-row", style: { marginTop: 4 } },
        (0, import_react6.createElement)(
          "select",
          {
            className: "dmo-select",
            style: { flex: "0 0 auto", width: "auto" },
            value: draftKind,
            "aria-label": "\u8BB0\u5F55\u7C7B\u578B",
            onChange: (event) => {
              setDraftKind(event.target.value);
            }
          },
          ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"].map((kind) => (0, import_react6.createElement)("option", { key: kind, value: kind }, kind))
        ),
        (0, import_react6.createElement)(Button, {
          small: true,
          variant: "primary",
          disabled: busy || draft.trim() === "",
          onClick: captureHere
        }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u8BB0\u4E00\u6761"),
        (0, import_react6.createElement)("span", { className: "dmo-capture-hint" }, "\u5B58\u5165\u540E\u51FA\u73B0\u5728\u4E0B\u65B9\u5217\u8868")
      ),
      (0, import_react6.createElement)(
        "div",
        { className: "dmo-capture-hint" },
        "\u8FC7\u9690\u79C1\u95F8\u95E8\uFF1A\u5BC6\u94A5 / \u79C1\u94A5 / \u8EAB\u4EFD\u8BC1 / \u5185\u7F51 IP \u4F1A\u88AB\u62D2\u5199\u5E76\u7559\u5BA1\u8BA1"
      )
    ),
    // 筛选：搜索框 + 两个下拉，同一行
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-toolbar" },
      (0, import_react6.createElement)("input", {
        className: "dmo-input",
        value: textFilter,
        placeholder: "\u8FC7\u6EE4\u8BB0\u5F55\u2026",
        "aria-label": "\u8FC7\u6EE4\u8BB0\u5F55",
        onChange: (event) => {
          setTextFilter(event.target.value);
        }
      }),
      (0, import_react6.createElement)(
        "select",
        {
          className: "dmo-select",
          value: stateFilter,
          "aria-label": "\u6309\u72B6\u6001\u7B5B\u9009",
          onChange: (event) => {
            setStateFilter(event.target.value);
            setSelected([]);
          }
        },
        (0, import_react6.createElement)("option", { value: "" }, "\u5168\u90E8\u72B6\u6001"),
        (data.states ?? []).map((state2) => (0, import_react6.createElement)("option", { key: state2, value: state2 }, state2))
      ),
      (0, import_react6.createElement)(
        "select",
        {
          className: "dmo-select",
          value: kindFilter,
          "aria-label": "\u6309\u7C7B\u578B\u7B5B\u9009",
          onChange: (event) => {
            setKindFilter(event.target.value);
            setSelected([]);
          }
        },
        (0, import_react6.createElement)("option", { value: "" }, "\u5168\u90E8\u7C7B\u578B"),
        (data.kinds ?? []).map((kind) => (0, import_react6.createElement)("option", { key: kind, value: kind }, kind))
      )
    ),
    toast === null ? null : (0, import_react6.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginBottom: 8 }
    }, toast.text),
    // 批量操作条
    selected.length === 0 ? null : (0, import_react6.createElement)(
      "div",
      {
        className: "dmo-row",
        style: { marginBottom: 8, flexWrap: "wrap" }
      },
      (0, import_react6.createElement)("span", { className: "dmo-note", style: { margin: 0 } }, `\u5DF2\u9009 ${selected.length} \u6761`),
      (0, import_react6.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          run(() => call("batchInboxState", { domain: "personal", lineIndexes: selected, state: "done" }), "\u5DF2\u6807\u4E3A done");
        }
      }, "\u6807 done"),
      (0, import_react6.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          run(() => call("batchInboxState", { domain: "personal", lineIndexes: selected, state: "dropped" }), "\u5DF2\u4E22\u5F03");
        }
      }, "\u4E22\u5F03"),
      (0, import_react6.createElement)(Button, {
        small: true,
        variant: "danger",
        disabled: busy,
        onClick: () => {
          run(() => call("deleteInbox", { domain: "personal", lineIndexes: selected }), "\u5DF2\u5220\u9664");
        }
      }, "\u5220\u9664")
    ),
    entries.length === 0 ? (0, import_react6.createElement)(
      Empty,
      {
        title: data.entries.length === 0 ? "\u8BB0\u5F55\u6D41\u662F\u7A7A\u7684" : "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55"
      },
      (0, import_react6.createElement)(
        "div",
        null,
        data.entries.length === 0 ? "\u7528\u4E0A\u9762\u7684\u8F93\u5165\u6846\u3001\u53F3\u4FA7\u680F\uFF0C\u6216 /remember \u8BB0\u4E00\u6761\u2014\u2014\u56DE\u8F66\u5373\u5B58\u3002" : "\u6362\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002"
      ),
      (0, import_react6.createElement)(
        "div",
        { className: "dmo-row", style: { justifyContent: "center", marginTop: 9 } },
        (0, import_react6.createElement)(Button, { variant: "primary", onClick: () => {
          reload();
        } }, "\u91CD\u65B0\u8BFB\u53D6"),
        data.entries.length === 0 ? null : (0, import_react6.createElement)(Button, { onClick: () => {
          setTextFilter("");
        } }, "\u6E05\u7A7A\u8FC7\u6EE4")
      )
    ) : (0, import_react6.createElement)(
      "div",
      null,
      (0, import_react6.createElement)(
        "div",
        { className: "dmo-row-item" },
        (0, import_react6.createElement)("input", {
          type: "checkbox",
          className: "dmo-check",
          checked: allSelected,
          "aria-label": "\u5168\u9009",
          onChange: () => {
            setSelected(allSelected ? [] : entries.map((entry) => entry.lineIndex));
          }
        }),
        (0, import_react6.createElement)(
          "div",
          { className: "dmo-row-main dmo-row-sub" },
          `${count(throughput.total)} \u6761 \xB7 ${orEmpty(data.path)}`
        )
      ),
      entries.map((entry) => (0, import_react6.createElement)(RowItem, {
        key: entry.lineIndex,
        entry,
        checked: selected.includes(entry.lineIndex),
        busy,
        onToggle: () => {
          setSelected((current) => current.includes(entry.lineIndex) ? current.filter((index) => index !== entry.lineIndex) : [...current, entry.lineIndex]);
        },
        onState: (state2) => {
          run(
            () => call("updateInbox", {
              domain: "personal",
              lineIndex: entry.lineIndex,
              patch: { state: state2 }
            }),
            state2 === "done" ? "\u5DF2\u5B8C\u6210" : state2 === "todo" ? "\u5DF2\u5F00\u59CB" : "\u5DF2\u66F4\u65B0"
          );
        },
        onEdit: (content) => {
          run(
            () => call("updateInbox", {
              domain: "personal",
              lineIndex: entry.lineIndex,
              patch: { content }
            }),
            "\u5185\u5BB9\u5DF2\u6539"
          );
        },
        onPromote: () => {
          run(
            () => call("promoteInbox", { domain: "personal", lineIndex: entry.lineIndex }),
            "\u5DF2\u63D0\u5347\u5230\u6863\u6848"
          );
        },
        onDelete: () => {
          run(
            () => call("deleteInbox", { domain: "personal", lineIndexes: [entry.lineIndex] }),
            "\u5DF2\u5220\u9664"
          );
        }
      }))
    )
  );
}
function canStart(kind) {
  return statesOfKind(kind).includes("todo");
}
function RowItem({ entry, checked, busy, onToggle, onState, onEdit, onPromote, onDelete }) {
  const needsPromote = entry.state === "done" && (entry.destination === "\u2014" || entry.destination === "");
  const [editing, setEditing] = (0, import_react6.useState)(false);
  const [draft, setDraft] = (0, import_react6.useState)(entry.content);
  return (0, import_react6.createElement)(
    "div",
    { className: "dmo-row-item" },
    (0, import_react6.createElement)("input", {
      type: "checkbox",
      className: "dmo-check",
      checked,
      "aria-label": `\u9009\u62E9\uFF1A${truncate(entry.content, 20)}`,
      onChange: onToggle
    }),
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-row-main" },
      editing ? (0, import_react6.createElement)(
        "div",
        null,
        (0, import_react6.createElement)("textarea", {
          className: "dmo-textarea",
          value: draft,
          "aria-label": "\u7F16\u8F91\u8BB0\u5F55\u5185\u5BB9",
          onChange: (event) => {
            setDraft(event.target.value);
          }
        }),
        (0, import_react6.createElement)(
          "div",
          { className: "dmo-card-actions" },
          (0, import_react6.createElement)(Button, {
            small: true,
            variant: "primary",
            disabled: busy || draft.trim() === "",
            onClick: () => {
              onEdit(draft.trim());
              setEditing(false);
            }
          }, "\u4FDD\u5B58"),
          (0, import_react6.createElement)(Button, { small: true, onClick: () => {
            setDraft(entry.content);
            setEditing(false);
          } }, "\u53D6\u6D88")
        )
      ) : (0, import_react6.createElement)(
        "div",
        null,
        (0, import_react6.createElement)("div", { className: "dmo-row-text" }, truncate(entry.content, 46)),
        (0, import_react6.createElement)(
          "div",
          { className: "dmo-row-sub" },
          `${orEmpty(entry.date)} \xB7 ${orEmpty(entry.kind)} \xB7 `,
          (0, import_react6.createElement)(Badge, {
            tone: entry.state === "done" ? "ok" : entry.state === "dropped" ? "err" : "warn"
          }, entry.state),
          entry.kindValid ? null : (0, import_react6.createElement)(Badge, { tone: "err" }, "\u7C7B\u578B\u975E\u6CD5"),
          entry.destination === "\u2014" ? null : (0, import_react6.createElement)("span", null, ` \u2192 ${truncate(entry.destination, 24)}`)
        )
      ),
      editing ? null : (0, import_react6.createElement)(
        "div",
        { className: "dmo-card-actions" },
        /**
         * 「开始」只在支持 `todo` 的类型上出现。
         *
         * 决策与想法没有"进行中"——它们要么已定/已采纳，要么没有。
         * 早先所有类型都显示「开始」，点了只是换个标签，不承载任何信息。
         */
        entry.state === "open" && canStart(entry.kind) ? (0, import_react6.createElement)(Button, { small: true, disabled: busy, onClick: () => {
          onState("todo");
        } }, "\u5F00\u59CB") : null,
        entry.state !== "done" ? (0, import_react6.createElement)(Button, { small: true, disabled: busy, onClick: () => {
          onState("done");
        } }, "\u5B8C\u6210") : null,
        (0, import_react6.createElement)(Button, {
          small: true,
          disabled: busy,
          onClick: () => {
            setDraft(entry.content);
            setEditing(true);
          }
        }, "\u6539\u5185\u5BB9"),
        needsPromote ? (0, import_react6.createElement)(Button, {
          small: true,
          variant: "primary",
          disabled: busy,
          onClick: onPromote
        }, "\u63D0\u5347\u5230\u6863\u6848") : null,
        (0, import_react6.createElement)(Button, {
          small: true,
          variant: "danger",
          disabled: busy,
          onClick: onDelete
        }, "\u5220\u9664")
      )
    )
  );
}

// packages/dsh-plugin/src/client/panes/memory.ts
var import_react7 = require("react");
function MemoryPane({ project, cwd, onOpenMemory, detailPath }) {
  if (detailPath !== void 0) {
    return (0, import_react7.createElement)(MemoryDetail, { path: detailPath, onBack: () => {
      onOpenMemory("");
    } });
  }
  return (0, import_react7.createElement)(MemoryList, { project, cwd, onOpenMemory });
}
function MemoryList({ project, cwd, onOpenMemory }) {
  const [scope, setScope] = (0, import_react7.useState)("all");
  const scopeParams = scope === "project" ? scopeBody(cwd, project) : {};
  const [query, setQuery] = (0, import_react7.useState)("");
  const [submitted, setSubmitted] = (0, import_react7.useState)("");
  const [selected, setSelected] = (0, import_react7.useState)([]);
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [toast, setToast] = (0, import_react7.useState)(null);
  const [domainFilter, setDomainFilter] = (0, import_react7.useState)("");
  const [statusFilter, setStatusFilter] = (0, import_react7.useState)("");
  const { phase, data, error, reload } = useBridge(
    "snapshot",
    scopeParams,
    [scope, cwd, project]
  );
  const search = useBridge(
    "search",
    { query: submitted, ...scopeParams, record: submitted.trim() !== "" },
    [submitted, scope, cwd, project]
  );
  if (phase === "loading") return (0, import_react7.createElement)(Skeleton, { rows: 5, height: 44 });
  if (phase === "error") return (0, import_react7.createElement)(ErrorState, { message: `\u8BFB\u53D6\u8BB0\u5FC6\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry: reload });
  if (data === void 0) return (0, import_react7.createElement)(Skeleton, { rows: 2 });
  const searching = submitted.trim() !== "";
  const rawList = searching ? (search.data?.hits ?? []).map((hit) => ({
    id: hit.id,
    path: hit.path,
    title: hit.title,
    status: hit.status,
    layer: hit.layer,
    tokens: hit.tokens,
    domainLabel: hit.domainLabel,
    citeCount: void 0,
    snippet: hit.snippet
  })) : data.entries.map((entry) => ({
    id: entry.id,
    path: entry.path,
    title: entry.title,
    status: entry.status,
    layer: entry.layer,
    tokens: entry.tokens,
    domainLabel: entry.domainLabel,
    citeCount: entry.citeCount,
    snippet: void 0
  }));
  const statusGroups = [
    { id: "", label: "\u5168\u90E8", match: () => true },
    { id: "pending", label: "\u5F85\u786E\u8BA4", match: (s) => s === "hypothesis" || s === "observed" || s === "pending" },
    { id: "stale", label: "\u5F85\u590D\u6838", match: (s) => s === "stale" },
    { id: "confirmed", label: "\u5DF2\u786E\u8BA4", match: (s) => s === "confirmed" || s === "active" },
    { id: "archived", label: "\u5DF2\u5F52\u6863", match: (s) => s === "archived" },
    { id: "rejected", label: "\u5DF2\u9A73\u56DE", match: (s) => s === "rejected" }
  ];
  const statusCounts = statusGroups.map((group) => ({
    ...group,
    count: rawList.filter((item) => group.match(item.status)).length
  }));
  const statusMatched = statusFilter === "" ? rawList : rawList.filter((item) => statusGroups.find((g) => g.id === statusFilter)?.match(item.status) ?? true);
  const list = domainFilter === "" ? statusMatched : statusMatched.filter((item) => item.domainLabel === domainFilter);
  const domainOptions = [...new Set(rawList.map((item) => item.domainLabel))];
  function run(action, success) {
    setBusy(true);
    setToast(null);
    void action().then((result) => {
      const failed = result?.failed?.length ?? 0;
      setToast({
        ok: failed === 0,
        text: failed === 0 ? success : `${success}\uFF0C\u4F46\u6709 ${failed} \u6761\u5931\u8D25\uFF08\u53EF\u80FD\u5DF2\u88AB\u6539\u52A8\uFF09`
      });
      setSelected([]);
      reload();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  return (0, import_react7.createElement)(
    "div",
    null,
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-row", style: { marginBottom: 8 } },
      (0, import_react7.createElement)("input", {
        className: "dmo-input",
        placeholder: "\u68C0\u7D22\u6B63\u6587\uFF0C\u56DE\u8F66\u8BB0\u8D26\uFF08\u547D\u4E2D\u8BB0 cite\uFF0C\u672A\u547D\u4E2D\u8BB0 miss\uFF09\u2026",
        value: query,
        "aria-label": "\u68C0\u7D22\u8BB0\u5FC6",
        onChange: (event) => {
          setQuery(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter") setSubmitted(query);
          if (event.key === "Escape") {
            setQuery("");
            setSubmitted("");
          }
        }
      }),
      (0, import_react7.createElement)(Button, { small: true, onClick: () => {
        setSubmitted(query);
      } }, "\u68C0\u7D22")
    ),
    // 范围 + 域筛选：这一页默认看全库，因为它是唯一能看到全貌的地方
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-toolbar" },
      (0, import_react7.createElement)(
        "select",
        {
          className: "dmo-select",
          value: scope,
          "aria-label": "\u8303\u56F4",
          onChange: (event) => {
            setScope(event.target.value === "project" ? "project" : "all");
            setSelected([]);
          }
        },
        (0, import_react7.createElement)("option", { value: "all" }, "\u5168\u90E8\u8BB0\u5FC6"),
        /**
         * 选项文案用**解析后**的项目名，不是 cwd 末段。
         *
         * `V2.1.25-dev` 这种分支目录不该出现在「项目」这个位置上。
         */
        (0, import_react7.createElement)(
          "option",
          { value: "project" },
          data.projectScoped && data.project !== null ? `\u4EC5\u672C\u9879\u76EE \xB7 ${data.project}` : "\u4EC5\u672C\u9879\u76EE\uFF08\u672A\u8BC6\u522B\u5230\u9879\u76EE\uFF09"
        )
      ),
      (0, import_react7.createElement)(
        "select",
        {
          className: "dmo-select",
          value: domainFilter,
          "aria-label": "\u6309\u57DF\u7B5B\u9009",
          onChange: (event) => {
            setDomainFilter(event.target.value);
            setSelected([]);
          }
        },
        (0, import_react7.createElement)("option", { value: "" }, "\u5168\u90E8\u57DF"),
        domainOptions.map((name) => (0, import_react7.createElement)("option", { key: name, value: name }, name))
      )
    ),
    // 状态药丸：计数常驻可见
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-chips", role: "group", "aria-label": "\u72B6\u6001\u7B5B\u9009" },
      statusCounts.map((group) => (0, import_react7.createElement)(Chip, {
        key: group.id,
        label: group.label,
        count: group.count,
        active: statusFilter === group.id,
        onClick: () => {
          setStatusFilter(group.id);
          setSelected([]);
        }
      }))
    ),
    searching ? (0, import_react7.createElement)(
      "div",
      { className: "dmo-note" },
      search.phase === "loading" ? "\u68C0\u7D22\u4E2D\u2026" : search.data?.matched === true ? `\u547D\u4E2D ${count(search.data.total)} \u6761 \xB7 \u672C\u6B21\u8BFB\u53D6\u7EA6 ${count(search.data.cost)} tokens` : "\u672A\u547D\u4E2D\u2014\u2014\u5DF2\u8BB0\u4E00\u6761\uFF0C\u53BB\u300C\u672A\u547D\u4E2D\u300D\u5206\u533A\u628A\u5B83\u8865\u6210\u4E00\u6761\u8BB0\u5FC6\u3002"
    ) : (0, import_react7.createElement)(
      "div",
      { className: "dmo-note" },
      `${count(list.length)} \u6761` + (domainFilter === "" && scope === "all" ? "" : `\uFF08${scope === "project" ? "\u4EC5\u672C\u9879\u76EE" : "\u5168\u5E93"}${domainFilter === "" ? "" : ` \xB7 ${domainFilter}`}\uFF09`) + ` \xB7 \u8D85 80 \u884C ${count(data.stats.overLimit)} \u6761 \xB7 \u68C0\u7D22\u4F1A\u8BB0\u8D26\uFF0C\u8FC7\u6EE4\u4E0D\u8BE5\u8BB0\u8D26`
    ),
    toast === null ? null : (0, import_react7.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginBottom: 8 }
    }, toast.text),
    // 批量归档
    (0, import_react7.createElement)(
      SelectionBar,
      {
        count: selected.length,
        total: list.length,
        busy,
        onClear: () => {
          setSelected([]);
        }
      },
      (0, import_react7.createElement)(Button, {
        small: true,
        variant: "danger",
        disabled: busy,
        onClick: () => {
          run(() => call("batchArchive", { paths: selected, reason: "\u6279\u91CF\u9000\u5F79" }), `\u5DF2\u5F52\u6863 ${selected.length} \u6761`);
        }
      }, `\u5F52\u6863\u9009\u4E2D ${selected.length} \u6761`)
    ),
    list.length === 0 ? (0, import_react7.createElement)(
      Empty,
      { title: searching ? "\u6CA1\u6709\u547D\u4E2D" : "\u6CA1\u6709\u8BB0\u5FC6" },
      (0, import_react7.createElement)("div", null, searching ? "\u6362\u4E2A\u8BCD\uFF0C\u6216\u53BB\u300C\u672A\u547D\u4E2D\u300D\u770B\u8FD9\u6B21\u672A\u547D\u4E2D\u3002" : "\u8FD9\u4E2A\u57DF\u8FD8\u6CA1\u6709\u6761\u76EE\u3002")
    ) : list.map((entry) => (0, import_react7.createElement)(
      "div",
      {
        key: entry.id,
        className: "dmo-card",
        role: "button",
        tabIndex: 0,
        style: { cursor: "pointer" },
        onClick: () => {
          onOpenMemory(entry.path);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") onOpenMemory(entry.path);
        }
      },
      (0, import_react7.createElement)("div", { className: "dmo-card-title" }, truncate(entry.title, 46)),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react7.createElement)("input", {
          type: "checkbox",
          className: "dmo-check",
          checked: selected.includes(entry.path),
          "aria-label": `\u9009\u62E9\uFF1A${truncate(entry.title, 20)}`,
          onClick: (event) => {
            event.stopPropagation();
          },
          onChange: () => {
            setSelected((current) => current.includes(entry.path) ? current.filter((path) => path !== entry.path) : [...current, entry.path]);
          }
        }),
        (0, import_react7.createElement)(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
        (0, import_react7.createElement)(Badge, { tone: "idle" }, entry.layer.toUpperCase()),
        entry.status === "stale" ? (0, import_react7.createElement)(Badge, { tone: "warn" }, "\u5F85\u590D\u6838") : null,
        (0, import_react7.createElement)("span", null, count(entry.tokens), " tokens"),
        (0, import_react7.createElement)("span", null, entry.domainLabel),
        // 引用次数：判断「这条还活着吗」的关键信号
        (0, import_react7.createElement)(
          "span",
          null,
          entry.citeCount === void 0 || entry.citeCount === 0 ? "\u672A\u5F15\u7528" : `${count(entry.citeCount)} \u6B21\u5F15\u7528`
        )
      ),
      entry.snippet === void 0 ? (0, import_react7.createElement)("div", { className: "dmo-row-sub" }, orEmpty(entry.path)) : (0, import_react7.createElement)("div", { className: "dmo-row-sub" }, truncate(entry.snippet, 90))
    ))
  );
}
function MemoryDetail({ path, onBack }) {
  const [editing, setEditing] = (0, import_react7.useState)(false);
  const [draft, setDraft] = (0, import_react7.useState)("");
  const [rejecting, setRejecting] = (0, import_react7.useState)(false);
  const [reason, setReason] = (0, import_react7.useState)("");
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [toast, setToast] = (0, import_react7.useState)(null);
  const { phase, data, error, reload } = useBridge("detail", { path }, [path]);
  function run(action, success) {
    setBusy(true);
    setToast(null);
    void action().then(() => {
      setToast({ ok: true, text: success });
      setEditing(false);
      setRejecting(false);
      setReason("");
      reload();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  if (phase === "loading") return (0, import_react7.createElement)(Skeleton, { rows: 4 });
  if (phase === "error") return (0, import_react7.createElement)(ErrorState, { message: `\u8BFB\u53D6\u8BE6\u60C5\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry: reload });
  if (data === void 0) return (0, import_react7.createElement)(Skeleton, { rows: 2 });
  const { entry, trust } = data;
  const canReject = entry.status !== "rejected";
  const canUndoReject = entry.status === "rejected";
  return (0, import_react7.createElement)(
    "div",
    null,
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-row", style: { marginBottom: 8 } },
      (0, import_react7.createElement)(Button, { small: true, onClick: onBack }, "\u2190 \u8FD4\u56DE\u5217\u8868"),
      (0, import_react7.createElement)("span", { className: "dmo-row-sub", style: { marginTop: 0 } }, orEmpty(entry.domainLabel))
    ),
    (0, import_react7.createElement)("div", { className: "dmo-card-title", style: { fontSize: 14 } }, entry.title),
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-card-meta" },
      (0, import_react7.createElement)(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
      (0, import_react7.createElement)(Badge, { tone: "idle" }, `${count(entry.tokens)} tokens`),
      (0, import_react7.createElement)(Badge, { tone: entry.overLineLimit ? "warn" : "idle" }, `${entry.lines} \u884C`),
      entry.overTokenLimit ? (0, import_react7.createElement)(Badge, { tone: "warn" }, "\u8D85 1200 tokens") : null
    ),
    (0, import_react7.createElement)(Stepper, { status: entry.status }),
    // 驳回静默：说清「它现在为什么不被推荐」
    entry.status === "rejected" ? (0, import_react7.createElement)(
      "div",
      { className: "dmo-degrade" },
      `\u9A73\u56DE\u9759\u9ED8\u4E2D\uFF1A\u8FD9\u6761 30 \u5929\u5185\u4E0D\u518D\u53C2\u4E0E\u7EA0\u9519\u3002\u7406\u7531\u2014\u2014${orEmpty(entry.evidence.length === 0 ? "\uFF08\u672A\u8BB0\u5F55\uFF09" : "\u89C1\u4E0B")}`,
      (0, import_react7.createElement)(
        "div",
        { style: { marginTop: 4 } },
        (0, import_react7.createElement)(Button, {
          small: true,
          disabled: busy,
          onClick: () => {
            run(() => call("undoReject", { path }), "\u64A4\u9500\u9A73\u56DE\uFF1A\u5DF2\u6062\u590D\u4E3A\u5DF2\u5F3A\u5316");
          }
        }, "\u64A4\u9500\u9A73\u56DE")
      )
    ) : null,
    // 信任栏
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-card" },
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react7.createElement)("span", null, `\u7F6E\u4FE1 ${entry.confidence === null ? "\u2014" : entry.confidence.toFixed(1)}`),
        (0, import_react7.createElement)("span", null, `\u8BC1\u636E ${count(trust.evidenceCount)}`),
        (0, import_react7.createElement)("span", null, `\u5F15\u7528 ${count(trust.citeCount)}`),
        (0, import_react7.createElement)("span", null, `\u6700\u540E\u5F15\u7528 ${orEmpty(trust.lastCitedAt)}`)
      ),
      trust.anchor === null ? null : (0, import_react7.createElement)(
        "div",
        { style: { marginTop: 6 } },
        (0, import_react7.createElement)(
          Badge,
          { tone: trust.anchorState === "stale" ? "warn" : "brand" },
          trust.anchorState === "stale" ? "\u951A\u70B9\u5931\u6548" : "\u951A\u70B9\u6709\u6548"
        ),
        (0, import_react7.createElement)(
          "div",
          { className: "dmo-row-sub" },
          `${orEmpty(trust.anchor.path)}${trust.anchor.symbol === void 0 ? "" : ` \xB7 ${trust.anchor.symbol}`}`
        )
      )
    ),
    // 证据链
    entry.evidence.length === 0 ? (0, import_react7.createElement)("div", { className: "dmo-note" }, "\u65E0\u8BC1\u636E\u6761\u76EE\uFF08G1 \u7528\u6237\u76F4\u8FF0\u53EF\u8C41\u514D\uFF09\u3002") : (0, import_react7.createElement)(
      "div",
      null,
      (0, import_react7.createElement)("div", { className: "dmo-lane-head" }, "\u8BC1\u636E\u94FE"),
      entry.evidence.map((item, index) => (0, import_react7.createElement)(
        "div",
        { key: index, className: "dmo-evidence" },
        (0, import_react7.createElement)("div", null, orEmpty(item.excerpt)),
        (0, import_react7.createElement)("div", { className: "dmo-evidence-src" }, `${orEmpty(item.gate)} \xB7 ${orEmpty(item.session)}`)
      ))
    ),
    toast === null ? null : (0, import_react7.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginTop: 8 }
    }, toast.text),
    // 源码编辑
    editing ? (0, import_react7.createElement)(
      "div",
      { style: { marginTop: 8 } },
      (0, import_react7.createElement)("label", { className: "dmo-label" }, "\u6B63\u6587\u6E90\u7801\uFF08frontmatter \u4E0D\u52A8\uFF09"),
      (0, import_react7.createElement)("textarea", {
        className: "dmo-textarea",
        value: draft,
        style: { minHeight: 190 },
        "aria-label": "\u6B63\u6587\u6E90\u7801",
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react7.createElement)(Button, {
          variant: "primary",
          disabled: busy,
          onClick: () => {
            run(() => call("writeBody", { path, body: draft }), "\u5DF2\u4FDD\u5B58");
          }
        }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58"),
        (0, import_react7.createElement)(Button, { onClick: () => {
          setEditing(false);
        } }, "\u53D6\u6D88")
      )
    ) : (0, import_react7.createElement)(
      "div",
      { className: "dmo-card-body", style: { marginTop: 8, maxHeight: 260, overflowY: "auto" } },
      orEmpty(entry.body.trim())
    ),
    // 驳回理由输入（内联展开）
    rejecting ? (0, import_react7.createElement)(RejectBox, {
      reason,
      onReason: setReason,
      busy,
      onCancel: () => {
        setRejecting(false);
        setReason("");
      },
      onSubmit: () => {
        run(() => call("reject", { path, reason }), "\u5DF2\u9A73\u56DE\uFF0C30 \u5929\u5185\u4E0D\u518D\u63A8\u8350");
      }
    }) : null,
    // 出口
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-card-actions", style: { marginTop: 10 } },
      (0, import_react7.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          setDraft(entry.body);
          setEditing(true);
        }
      }, "\u7F16\u8F91\u6E90\u7801"),
      entry.status === "stale" || entry.status === "observed" || entry.status === "hypothesis" ? (0, import_react7.createElement)(Button, {
        small: true,
        variant: "primary",
        disabled: busy,
        onClick: () => {
          run(() => call("confirm", { path }), "\u5DF2\u786E\u8BA4");
        }
      }, "\u786E\u8BA4") : null,
      // 驳回：与确认**同等显眼**。只给「确认」不给「驳回」，界面就在逼人往一个方向走。
      canReject ? (0, import_react7.createElement)(Button, {
        small: true,
        variant: "danger",
        disabled: busy,
        onClick: () => {
          setRejecting((value) => !value);
        }
      }, rejecting ? "\u53D6\u6D88\u9A73\u56DE" : "\u9A73\u56DE") : null,
      canUndoReject ? (0, import_react7.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          run(() => call("undoReject", { path }), "\u5DF2\u64A4\u9500\u9A73\u56DE");
        }
      }, "\u64A4\u9500\u9A73\u56DE") : null,
      (0, import_react7.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          run(() => call("keep", { path }), "\u5DF2\u518D\u7559 90 \u5929");
        }
      }, "\u518D\u7559 90 \u5929"),
      (0, import_react7.createElement)(Button, {
        small: true,
        variant: "danger",
        disabled: busy,
        onClick: () => {
          run(() => call("archive", { path }), "\u5DF2\u5F52\u6863");
        }
      }, "\u5F52\u6863")
    )
  );
}

// packages/dsh-plugin/src/client/panes/misses.ts
var import_react8 = require("react");
var LANES = [
  { id: "observing", label: "\u89C2\u5BDF\u4E2D", tone: "idle" },
  { id: "should-fill", label: "\u8BE5\u8865\u4E86", tone: "warn" },
  { id: "drafting", label: "\u8349\u7A3F\u5F85\u786E\u8BA4", tone: "warn" },
  { id: "verifying", label: "\u9A8C\u8BC1\u671F\u5185", tone: "brand" },
  { id: "verified", label: "\u5DF2\u9A8C\u8BC1\u751F\u6548", tone: "ok" }
];
function MissesPane() {
  const [selected, setSelected] = (0, import_react8.useState)([]);
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const [toast, setToast] = (0, import_react8.useState)(null);
  const [drafting, setDrafting] = (0, import_react8.useState)(null);
  const [draftText, setDraftText] = (0, import_react8.useState)("");
  const [draftType, setDraftType] = (0, import_react8.useState)("\u95EE\u9898");
  const [sort, setSort] = (0, import_react8.useState)("frequency");
  const { phase, data, error, reload } = useBridge("misses", { sort }, [sort]);
  function run(action, success) {
    setBusy(true);
    setToast(null);
    void action().then(() => {
      setToast({ ok: true, text: success });
      setSelected([]);
      setDrafting(null);
      reload();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  if (phase === "loading") return (0, import_react8.createElement)(Skeleton, { rows: 3, height: 40 });
  if (phase === "error") return (0, import_react8.createElement)(ErrorState, { message: `\u8BFB\u53D6\u672A\u547D\u4E2D\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry: reload });
  if (data === void 0) return (0, import_react8.createElement)(Skeleton, { rows: 2 });
  const total = data.total;
  return (0, import_react8.createElement)(
    "div",
    null,
    /**
     * 五态计数条：一眼看出漏斗卡在哪一级。
     *
     * 早先这里是 3 个 KPI（总数 / 该补 / 转化率），把「漏斗形状」这个信息弄丢了——
     * 而漏斗形状恰恰是未命中工作台存在的理由：知道「有几条卡在草稿」比知道总数更有用。
     */
    (0, import_react8.createElement)(Band, {
      cells: [
        { label: "\u89C2\u5BDF", value: data.counts?.observing ?? 0 },
        { label: "\u8BE5\u8865", value: data.counts?.["should-fill"] ?? 0, tone: "warn" },
        { label: "\u8349\u7A3F", value: data.counts?.drafting ?? 0, tone: "warn" },
        { label: "\u9A8C\u8BC1", value: data.counts?.verifying ?? 0 },
        { label: "\u751F\u6548", value: data.counts?.verified ?? 0, tone: "ok" }
      ]
    }),
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-toolbar" },
      (0, import_react8.createElement)(
        "select",
        {
          className: "dmo-select",
          value: sort,
          "aria-label": "\u672A\u547D\u4E2D\u6392\u5E8F",
          onChange: (event) => {
            setSort(event.target.value);
          }
        },
        (0, import_react8.createElement)("option", { value: "frequency" }, "\u6309\u9891\u7387"),
        (0, import_react8.createElement)("option", { value: "recent" }, "\u6309\u6700\u8FD1"),
        (0, import_react8.createElement)("option", { value: "breadth" }, "\u6309\u4F1A\u8BDD\u5E7F\u5EA6")
      ),
      (0, import_react8.createElement)(
        "span",
        { className: "dmo-row-sub", style: { marginLeft: "auto", marginTop: 0 } },
        `\u8865\u5E93\u8F6C\u5316 ${percent(data.conversion)} \xB7 \u5171 ${count(total)} \u6761`
      )
    ),
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-note" },
      `\u9A8C\u8BC1\u7A97\u53E3 ${data.verifyDays} \u5929 \xB7 \u95EE\u8FC7 \u2265${data.fillThreshold ?? 3} \u6B21\u81EA\u52A8\u8FDB\u300C\u8BE5\u8865\u300D\u3002 \u8349\u7A3F\u5FC5\u987B\u4F60\u786E\u8BA4\u624D\u843D\u5E93\u2014\u2014\u81EA\u52A8\u5199\u5E93\u4F1A\u4EA7\u751F\u65E0\u6CD5\u5BA1\u8BA1\u7684\u81C6\u60F3\u3002`
    ),
    toast === null ? null : (0, import_react8.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginBottom: 8 }
    }, toast.text),
    total === 0 ? (0, import_react8.createElement)(
      Empty,
      { title: "\u6CA1\u6709\u672A\u547D\u4E2D\u8BB0\u5F55" },
      (0, import_react8.createElement)("div", null, "\u8FD9\u662F\u597D\u4E8B\uFF1A\u8BF4\u660E\u68C0\u7D22\u90FD\u5728\u5E93\u91CC\u547D\u4E2D\u4E86\u3002"),
      (0, import_react8.createElement)(
        "div",
        { className: "dmo-note" },
        "\u6700\u8FD1 30 \u5929\u6CA1\u6709\u68C0\u7D22\u843D\u7A7A\u3002\u8865\u5E93\u5165\u53E3\u5728\u8FD9\uFF0C\u7B49\u6709\u8F93\u5165\u518D\u6765\u3002"
      ),
      (0, import_react8.createElement)(
        "div",
        { className: "dmo-row", style: { justifyContent: "center", marginTop: 9 } },
        (0, import_react8.createElement)(Button, { small: true, onClick: reload }, "\u770B\u68C0\u7D22\u65E5\u5FD7")
      )
    ) : null,
    // 批量生成草稿
    selected.length === 0 ? null : (0, import_react8.createElement)(
      "div",
      {
        className: "dmo-row",
        style: { marginBottom: 8, flexWrap: "wrap" }
      },
      (0, import_react8.createElement)("span", { className: "dmo-note", style: { margin: 0 } }, `\u5DF2\u9009 ${selected.length} \u6761`),
      (0, import_react8.createElement)(Button, {
        small: true,
        variant: "primary",
        disabled: busy,
        onClick: () => {
          run(() => call("missBatchDraft", { queries: selected }), "\u5DF2\u751F\u6210\u8349\u7A3F\uFF0C\u53BB\u300C\u8349\u7A3F\u5F85\u786E\u8BA4\u300D\u9010\u6761\u786E\u8BA4");
        }
      }, `\u6279\u91CF\u751F\u6210 ${selected.length} \u6761\u8349\u7A3F\uFF08\u4ECD\u9700\u9010\u6761\u786E\u8BA4\uFF09`)
    ),
    LANES.map((lane) => {
      const items = data.pipeline[lane.id] ?? [];
      if (items.length === 0) return null;
      const top = items[0];
      return (0, import_react8.createElement)(
        "div",
        { key: lane.id, className: "dmo-lane" },
        (0, import_react8.createElement)(
          "div",
          { className: "dmo-lane-head" },
          (0, import_react8.createElement)(Badge, { tone: lane.tone }, lane.label),
          (0, import_react8.createElement)(
            "span",
            { className: "dmo-lane-count" },
            `${items.length} \u6761`,
            top !== void 0 && items.length > 1 ? ` \xB7 \u6700\u591A\u95EE\u8FC7 ${top.count} \u6B21` : ""
          )
        ),
        items.map((item) => (0, import_react8.createElement)(
          "div",
          { key: item.query, className: "dmo-card" },
          (0, import_react8.createElement)("div", { className: "dmo-card-title" }, truncate(item.query, 46)),
          (0, import_react8.createElement)(
            "div",
            { className: "dmo-card-meta" },
            (0, import_react8.createElement)(Badge, { tone: item.count >= 3 ? "warn" : "idle" }, `\u95EE\u8FC7 ${count(item.count)} \u6B21`),
            // 会话数与次数分开显示：「3 个会话都在问」比「一个会话问 3 次」重要
            (0, import_react8.createElement)("span", null, `${count(item.sessions ?? 1)} \u4E2A\u4F1A\u8BDD`),
            (0, import_react8.createElement)("span", null, `\u591A\u82B1 ~${count(item.wastedTokens)} tokens`),
            /**
             * 验证期进度：落点 + 命中 x/3 + 剩 N 天。
             *
             * 三者缺一不可：光说「验证期内」用户不知道它在哪；
             * 光说天数不知道补得对不对（命中次数才是判据）。
             */
            lane.id === "verifying" ? (0, import_react8.createElement)(
              "span",
              null,
              item.draftPath === null ? "" : `\u5DF2\u8FDB ${item.draftPath.split("/").pop()} \xB7 `,
              `\u547D\u4E2D ${count(item.hits)}/3`,
              item.remainingDays === null ? "" : ` \xB7 \u5269 ${item.remainingDays} \u5929`
            ) : null,
            (0, import_react8.createElement)("span", null, orEmpty(item.lastAt.slice(0, 10)))
          ),
          lane.id === "drafting" ? (0, import_react8.createElement)(
            "div",
            { style: { marginTop: 6 } },
            drafting === item.query ? (0, import_react8.createElement)(
              "div",
              null,
              (0, import_react8.createElement)("select", {
                className: "dmo-select",
                value: draftType,
                "aria-label": "\u8349\u7A3F\u7C7B\u578B",
                style: { marginBottom: 5 },
                onChange: (event) => {
                  setDraftType(event.target.value);
                }
              }, ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"].map((kind) => (0, import_react8.createElement)("option", { key: kind, value: kind }, kind))),
              (0, import_react8.createElement)("textarea", {
                className: "dmo-textarea",
                value: draftText,
                placeholder: "\u5199\u4E0B\u8FD9\u6761\u95EE\u9898\u7684\u7ED3\u8BBA\uFF0C\u786E\u8BA4\u540E\u843D\u5E93\u5E76\u8FDB\u5165 7 \u5929\u9A8C\u8BC1\u671F\u2026",
                onChange: (event) => {
                  setDraftText(event.target.value);
                }
              }),
              (0, import_react8.createElement)(
                "div",
                { className: "dmo-card-actions" },
                (0, import_react8.createElement)(Button, {
                  small: true,
                  variant: "primary",
                  disabled: busy || draftText.trim() === "",
                  onClick: () => {
                    run(() => call("missConfirm", {
                      query: item.query,
                      content: draftText,
                      type: draftType
                    }), "\u5DF2\u843D\u5E93\uFF0C\u8FDB\u5165 7 \u5929\u9A8C\u8BC1\u671F");
                  }
                }, "\u786E\u8BA4\u843D\u5E93"),
                (0, import_react8.createElement)(Button, { small: true, onClick: () => {
                  setDrafting(null);
                } }, "\u53D6\u6D88")
              )
            ) : (0, import_react8.createElement)(
              "div",
              null,
              /**
               * 草稿态直接展示「已经有什么」，而不是只给一个「写结论」按钮。
               *
               * 设计稿在这里有一段草稿正文 + 免责说明「草稿 · 待你确认，
               * 不是 agent 自己写进库的」。那句免责声明很关键：
               * 它明确告诉用户「这段文字还不是记忆，只有你点了才算」。
               */
              (0, import_react8.createElement)(
                "div",
                { className: "dmo-evidence" },
                (0, import_react8.createElement)(Quote, null, item.drafts.length > 0 ? "\uFF08\u8349\u7A3F\u5DF2\u751F\u6210\uFF0C\u70B9\u300C\u5199\u7ED3\u8BBA\u300D\u8865\u5145\u5177\u4F53\u7ED3\u8BBA\uFF09" : "\u8FD9\u6761\u95EE\u9898\u8FD8\u6CA1\u6709\u7ED3\u8BBA\u2014\u2014\u70B9\u300C\u5199\u7ED3\u8BBA\u300D\u5199\u4E0B\u4F60\u67E5\u5230\u7684\u4E1C\u897F\u3002"),
                (0, import_react8.createElement)(
                  "div",
                  { className: "dmo-evidence-src" },
                  "\u8349\u7A3F \xB7 \u5F85\u4F60\u786E\u8BA4\uFF0C\u4E0D\u662F agent \u81EA\u5DF1\u5199\u8FDB\u5E93\u7684"
                )
              ),
              (0, import_react8.createElement)(
                "div",
                { className: "dmo-card-actions" },
                (0, import_react8.createElement)(Button, {
                  small: true,
                  variant: "primary",
                  onClick: () => {
                    setDrafting(item.query);
                    setDraftText("");
                  }
                }, "\u5199\u7ED3\u8BBA"),
                // 丢弃草稿：不补了，把它从流水线里摘掉
                (0, import_react8.createElement)(Button, {
                  small: true,
                  disabled: busy,
                  onClick: () => {
                    run(() => call("missDelete", { query: item.query }), "\u5DF2\u4E22\u5F03\u8FD9\u6761\u8349\u7A3F");
                  }
                }, "\u4E22\u5F03")
              )
            )
          ) : (0, import_react8.createElement)(
            "div",
            { className: "dmo-card-actions" },
            lane.id === "observing" || lane.id === "should-fill" ? (0, import_react8.createElement)("input", {
              type: "checkbox",
              className: "dmo-check",
              checked: selected.includes(item.query),
              "aria-label": `\u9009\u62E9\uFF1A${truncate(item.query, 20)}`,
              onChange: () => {
                setSelected((current) => current.includes(item.query) ? current.filter((query) => query !== item.query) : [...current, item.query]);
              }
            }) : null,
            lane.id === "observing" ? (0, import_react8.createElement)(Button, {
              small: true,
              disabled: busy,
              onClick: () => {
                run(() => call("missDraft", { query: item.query, type: "\u95EE\u9898" }), "\u5DF2\u751F\u6210\u8349\u7A3F");
              }
            }, "\u8F6C\u8349\u7A3F") : null,
            /**
             * 「不补」= 明确决定这条不值得沉淀。
             *
             * 与「删除」的区别在语义而非行为：删除是「我看过了，清掉」，
             * 不补是「这个问题我已经判断不需要进库」。两者都移除记录，
             * 但按钮文案反映了用户的判断，而不是让他去猜「删除」意味着什么。
             */
            lane.id === "should-fill" || lane.id === "observing" ? (0, import_react8.createElement)(Button, {
              small: true,
              disabled: busy,
              onClick: () => {
                run(() => call("missDelete", { query: item.query }), "\u5DF2\u6807\u8BB0\u4E0D\u8865");
              }
            }, "\u4E0D\u8865") : null,
            (0, import_react8.createElement)(Button, {
              small: true,
              variant: "danger",
              disabled: busy,
              onClick: () => {
                run(() => call("missDelete", { query: item.query }), "\u5DF2\u5220\u9664");
              }
            }, "\u5220\u9664")
          )
        ))
      );
    })
  );
}

// packages/dsh-plugin/src/client/panes/overview.ts
var import_react10 = require("react");

// packages/dsh-plugin/src/client/panes/maintenance.ts
var import_react9 = require("react");
function MaintenancePanel({ onOpenMemory }) {
  const [open, setOpen] = (0, import_react9.useState)(null);
  const anchor = useBridge("verifyAnchor", {});
  const compact = useBridge("compact", {});
  const promote = useBridge("promote", {});
  const review = useBridge("review", { days: 7 });
  const repair = useBridge("repairMeta", {});
  const [busy, setBusy] = (0, import_react9.useState)(false);
  const [toast, setToast] = (0, import_react9.useState)(null);
  function run(action, success, after) {
    setBusy(true);
    setToast(null);
    void action().then(() => {
      setToast({ ok: true, text: success });
      after?.();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  const TABLES = [
    { id: "repair", label: "\u4FEE\u8865", badge: repair.data?.fixes.length ?? 0 },
    { id: "anchor", label: "\u951A\u70B9\u6821\u9A8C", badge: (anchor.data?.summary.stale ?? 0) + (anchor.data?.summary.missing ?? 0) },
    { id: "compact", label: "\u51CF\u91CD", badge: compact.data?.total ?? 0 },
    { id: "promote", label: "\u722C\u5347", badge: promote.data?.plans.length ?? 0 },
    { id: "review", label: "\u590D\u76D8", badge: review.data?.todo.length ?? 0 }
  ];
  return (0, import_react9.createElement)(
    "div",
    { style: { marginTop: 12 } },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-lane-head" },
      "\u7EF4\u62A4\u4F5C\u4E1A",
      (0, import_react9.createElement)("span", { className: "dmo-lane-count" }, "\u6309\u9700\u89E6\u53D1\uFF0C\u65E0\u5E38\u9A7B\u5B9A\u65F6\u5668")
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginTop: 0 } },
      "\u8FD9\u56DB\u4EF6\u4E8B\u90FD\u4F1A\u6539\u8BB0\u5FC6\u7684\u53EF\u4FE1\u5EA6\u6216\u5185\u5BB9\uFF0C\u6240\u4EE5\u4E00\u5F8B\u300C\u5148\u9884\u89C8\u3001\u518D\u6267\u884C\u300D\u3002"
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-card-actions", style: { marginBottom: 8 } },
      TABLES.map((table) => (0, import_react9.createElement)(Button, {
        key: table.id,
        small: true,
        variant: open === table.id ? "primary" : "plain",
        onClick: () => {
          setOpen(open === table.id ? null : table.id);
        }
      }, table.label, table.badge > 0 ? ` (${table.badge > 99 ? "99+" : table.badge})` : ""))
    ),
    toast === null ? null : (0, import_react9.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginBottom: 8 }
    }, toast.text),
    open === null ? null : open === "repair" ? (0, import_react9.createElement)(RepairSection, { data: repair.data, phase: repair.phase, error: repair.error, busy, run, onRetry: repair.reload, onOpenMemory }) : open === "anchor" ? (0, import_react9.createElement)(AnchorSection, { data: anchor.data, phase: anchor.phase, error: anchor.error, busy, run, onRetry: anchor.reload, onOpenMemory }) : open === "compact" ? (0, import_react9.createElement)(CompactSection, { data: compact.data, phase: compact.phase, error: compact.error, busy, run, onRetry: compact.reload, onOpenMemory }) : open === "promote" ? (0, import_react9.createElement)(PromoteSection, { data: promote.data, phase: promote.phase, error: promote.error, busy, run, onRetry: promote.reload, onOpenMemory }) : (0, import_react9.createElement)(ReviewSection, { data: review.data, phase: review.phase, error: review.error, onRetry: review.reload, onOpenMemory })
  );
}
function Loading({ phase, error, onRetry, what }) {
  if (phase === "loading") return (0, import_react9.createElement)(Skeleton, { rows: 2, height: 34 });
  if (phase === "error") return (0, import_react9.createElement)(ErrorState, { message: `\u8BFB\u53D6${what}\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry });
  return null;
}
function AnchorSection({ data, phase, error, busy, run, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u951A\u70B9\u6821\u9A8C" });
  if (loading !== null) return loading;
  if (data === void 0) return null;
  const actionable = data.checks.filter((check) => check.state === "stale" || check.state === "missing");
  return (0, import_react9.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-budget-row", style: { flexWrap: "wrap", gap: 6 } },
      (0, import_react9.createElement)(Badge, { tone: "ok" }, `\u6709\u6548 ${data.summary.fresh}`),
      (0, import_react9.createElement)(Badge, { tone: "warn" }, `\u5931\u6548 ${data.summary.stale}`),
      (0, import_react9.createElement)(Badge, { tone: "err" }, `\u6587\u4EF6\u4E22\u5931 ${data.summary.missing}`),
      (0, import_react9.createElement)(Badge, { tone: "idle" }, `\u65E0\u6CD5\u5224\u5B9A ${data.summary.unverifiable}`),
      (0, import_react9.createElement)(Badge, { tone: "idle" }, `\u65E0\u951A\u70B9 ${data.withoutAnchor}`)
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note" },
      data.checks.length === 0 ? "\u5E93\u91CC\u8FD8\u6CA1\u6709\u4EFB\u4F55\u6761\u76EE\u58F0\u660E\u951A\u70B9\u3002\u951A\u70B9\u7528\u6765\u56DE\u7B54\u300C\u6211\u5F15\u7528\u7684\u4EE3\u7801\u7B26\u53F7\u8FD8\u5728\u4E0D\u5728\u300D\u3002" : existingBaseDir(data.baseDir)
    ),
    actionable.length === 0 ? null : (0, import_react9.createElement)(
      "div",
      null,
      actionable.slice(0, 10).map((check) => (0, import_react9.createElement)(
        "div",
        { key: check.id, className: "dmo-resident-row" },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            onClick: () => {
              onOpenMemory(check.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(check.path);
            }
          }, truncate(check.title, 38)),
          (0, import_react9.createElement)("div", { className: "dmo-row-sub" }, check.reason)
        ),
        (0, import_react9.createElement)(Badge, { tone: check.state === "missing" ? "err" : "warn" }, check.state)
      )),
      (0, import_react9.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react9.createElement)(Button, {
          small: true,
          variant: "danger",
          disabled: busy,
          onClick: () => {
            run(
              () => call("verifyAnchor", { apply: true, baseDir: data.baseDir }),
              `\u5DF2\u628A ${actionable.length} \u6761\u6807\u4E3A\u5F85\u590D\u6838`,
              onRetry
            );
          }
        }, `\u6807\u4E3A\u5F85\u590D\u6838\uFF08${actionable.length} \u6761\uFF09`)
      )
    )
  );
}
function existingBaseDir(baseDir) {
  return baseDir === "" ? "\u57FA\u51C6\u76EE\u5F55\u4E3A\u5BBF\u4E3B\u8FDB\u7A0B\u7684\u5DE5\u4F5C\u76EE\u5F55\uFF08\u951A\u70B9\u7684 path \u76F8\u5BF9\u5B83\u89E3\u6790\uFF09\u3002" : `\u57FA\u51C6\u76EE\u5F55\uFF1A${baseDir}`;
}
function CompactSection({ data, phase, error, busy, run, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u51CF\u91CD\u5019\u9009" });
  if (loading !== null) return loading;
  if (data === void 0) return null;
  return (0, import_react9.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-budget-row" },
      (0, import_react9.createElement)("span", { className: "dmo-budget-name" }, "\u8D85\u9650"),
      (0, import_react9.createElement)("span", { className: "dmo-budget-num" }, `${count(data.total)} \u7BC7`),
      (0, import_react9.createElement)(
        "span",
        { className: "dmo-lane-count" },
        `\u53EF\u7701 ${count(data.removableLines)} \u884C`
      )
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note" },
      `\u53EA\u505A\u65E0\u635F\u538B\u7F29\uFF1A\u53BB\u884C\u5C3E\u7A7A\u767D\u3001\u6298\u53E0\u8FDE\u7EED\u7A7A\u884C\u3001\u53BB\u9996\u5C3E\u7A7A\u884C\u3002
\u4E0D\u5220\u91CD\u590D\u884C\u3001\u4E0D\u6458\u8981\u6B63\u6587\u3001\u4E0D\u81EA\u52A8\u62C6\u6587\u4EF6\u2014\u2014\u90A3\u4E09\u4EF6\u90FD\u4F1A\u6539\u8BED\u4E49\u6216\u6539\u8DEF\u5F84\uFF08\u8DEF\u5F84\u5C31\u662F\u8BB0\u5FC6\u7684 id\uFF09\u3002`
    ),
    data.total === 0 ? (0, import_react9.createElement)(
      Empty,
      { title: "\u6CA1\u6709\u8D85\u9650\u6587\u4EF6" },
      (0, import_react9.createElement)("div", null, `\u6240\u6709\u6761\u76EE\u90FD\u5728 ${data.lineLimit} \u884C\u4EE5\u5185\u3002`)
    ) : (0, import_react9.createElement)(
      "div",
      null,
      data.candidates.slice(0, 8).map((item) => (0, import_react9.createElement)(
        "div",
        { key: item.path, className: "dmo-resident-row" },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            onClick: () => {
              onOpenMemory(item.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(item.path);
            }
          }, truncate(item.title, 38)),
          (0, import_react9.createElement)(
            "div",
            { className: "dmo-row-sub" },
            `${item.before} \u2192 ${item.after} \u884C` + (item.removed > 0 ? `\uFF08\u7701 ${item.removed}\uFF09` : "\uFF08\u5DF2\u65E0\u5197\u4F59\uFF0C\u9700\u4EBA\u5DE5\u6458\u8981\uFF09") + (item.stillOverLimit ? " \xB7 \u538B\u7F29\u540E\u4ECD\u8D85\u9650" : ""),
            item.splitSuggestions.length === 0 ? "" : ` \xB7 \u5EFA\u8BAE\u62C6\u51FA\uFF1A${item.splitSuggestions.map((section) => `${section.heading}(${section.lines}\u884C)`).join("\u3001")}`
          )
        ),
        item.removed > 0 ? (0, import_react9.createElement)(Badge, { tone: "warn" }, `-${item.removed}`) : (0, import_react9.createElement)(Badge, { tone: "idle" }, "\u65E0\u5197\u4F59")
      )),
      (0, import_react9.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react9.createElement)(Button, {
          small: true,
          variant: "primary",
          disabled: busy || data.removableLines === 0,
          onClick: () => {
            run(() => call("compact", { apply: true }), "\u5DF2\u538B\u7F29", onRetry);
          }
        }, data.removableLines === 0 ? "\u6CA1\u6709\u53EF\u65E0\u635F\u538B\u7F29\u7684\u5185\u5BB9" : `\u6267\u884C\u538B\u7F29\uFF08\u7701 ${data.removableLines} \u884C\uFF09`)
      )
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginBottom: 0 } },
      "\u538B\u7F29\u53EA\u89E3\u51B3\u300C\u7A7A\u884C\u591A\u300D\uFF0C\u4E0D\u89E3\u51B3\u300C\u5185\u5BB9\u771F\u7684\u957F\u300D\u3002\u540E\u8005\u8981\u4EBA\u5DE5\u6458\u8981\u6216\u62C6\u6587\u4EF6\uFF0C\u7CFB\u7EDF\u4E0D\u66FF\u4F60\u505A\u3002"
    )
  );
}
function PromoteSection({ data, phase, error, busy, run, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u722C\u5347\u8BA1\u5212" });
  if (loading !== null) return loading;
  if (data === void 0) return null;
  return (0, import_react9.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginTop: 0 } },
      `\u89C4\u5219\uFF1A\u88AB \u2265${data.minSessions} \u4E2A**\u4E0D\u540C\u4F1A\u8BDD**\u5F15\u7528\u8FC7\uFF0C\u4E14\u5F53\u524D\u662F hypothesis / observed\uFF0C\u624D\u5347\u4E00\u7EA7\u3002
\u540C\u4E00\u4F1A\u8BDD\u95EE\u4E09\u6B21\u4E0D\u7B97\u2014\u2014\u90A3\u662F\u540C\u4E00\u6B21\u56F0\u60D1\uFF0C\u4E0D\u662F\u72EC\u7ACB\u9A8C\u8BC1\u3002`
    ),
    data.plans.length === 0 ? (0, import_react9.createElement)(
      Empty,
      { title: "\u6CA1\u6709\u53EF\u722C\u5347\u7684\u6761\u76EE" },
      (0, import_react9.createElement)("div", null, "\u8981\u4E48\u5F15\u7528\u6B21\u6570\u8FD8\u4E0D\u591F\uFF0C\u8981\u4E48\u5DF2\u7ECF\u662F confirmed\uFF08\u4EBA\u62CD\u7684\u677F\uFF0C\u4EE3\u7801\u4E0D\u8BB8\u6539\uFF09\u3002")
    ) : (0, import_react9.createElement)(
      "div",
      null,
      data.plans.slice(0, 10).map((plan) => (0, import_react9.createElement)(
        "div",
        { key: plan.id, className: "dmo-resident-row" },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            onClick: () => {
              onOpenMemory(plan.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(plan.path);
            }
          }, truncate(plan.title, 38)),
          (0, import_react9.createElement)("div", { className: "dmo-row-sub" }, plan.reason)
        ),
        (0, import_react9.createElement)(Badge, { tone: "brand" }, `${plan.from} \u2192 ${plan.to}`)
      )),
      (0, import_react9.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react9.createElement)(Button, {
          small: true,
          variant: "primary",
          disabled: busy,
          onClick: () => {
            run(() => call("promote", { apply: true }), `\u5DF2\u722C\u5347 ${data.plans.length} \u6761`, onRetry);
          }
        }, `\u6309\u8BA1\u5212\u722C\u5347\uFF08${data.plans.length} \u6761\uFF09`)
      )
    )
  );
}
function ReviewSection({ data, phase, error, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u590D\u76D8" });
  if (loading !== null) return loading;
  if (data === void 0) return null;
  return (0, import_react9.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-budget-row", style: { flexWrap: "wrap", gap: 6 } },
      (0, import_react9.createElement)(Badge, { tone: "idle" }, `\u8FD1 ${data.window.days} \u5929`),
      (0, import_react9.createElement)(Badge, { tone: "brand" }, `\u6539\u52A8 ${count(data.counts.touched)}`),
      (0, import_react9.createElement)(Badge, { tone: "warn" }, `\u5F85\u62CD\u677F ${count(data.counts.pending)}`),
      (0, import_react9.createElement)(Badge, { tone: "idle" }, `\u5F85\u590D\u6838 ${count(data.counts.stale)}`),
      (0, import_react9.createElement)(Badge, { tone: "idle" }, `\u672A\u547D\u4E2D ${count(data.counts.misses)} \u6B21`)
    ),
    Object.keys(data.events).length === 0 ? (0, import_react9.createElement)("div", { className: "dmo-note" }, `\u8FD1 ${data.window.days} \u5929\u6CA1\u6709\u4E8B\u4EF6\u8BB0\u5F55\u3002`) : (0, import_react9.createElement)(
      "div",
      { className: "dmo-card-meta" },
      Object.entries(data.events).map(([kind, value]) => (0, import_react9.createElement)("span", { key: kind }, `${kind} ${value}`))
    ),
    data.todo.length === 0 ? (0, import_react9.createElement)(
      Empty,
      { title: "\u8FD9\u5468\u6CA1\u6709\u8BE5\u52A8\u624B\u7684\u4E8B" },
      (0, import_react9.createElement)("div", null, "\u961F\u5217\u662F\u7A7A\u7684\u2014\u2014\u4E0D\u662F\u6545\u969C\u3002")
    ) : (0, import_react9.createElement)(
      "div",
      null,
      (0, import_react9.createElement)("div", { className: "dmo-lane-head", style: { marginTop: 8 } }, "\u4E0B\u5468\u8BE5\u505A"),
      data.todo.slice(0, 10).map((item, index) => (0, import_react9.createElement)(
        "div",
        {
          key: `${item.kind}-${index}`,
          className: "dmo-resident-row"
        },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", {
            className: item.path === void 0 ? "dmo-row-text" : "dmo-row-text dmo-link",
            role: item.path === void 0 ? void 0 : "button",
            tabIndex: item.path === void 0 ? void 0 : 0,
            onClick: item.path === void 0 ? void 0 : () => {
              onOpenMemory(item.path);
            },
            onKeyDown: item.path === void 0 ? void 0 : (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(item.path);
            }
          }, truncate(item.title, 38)),
          (0, import_react9.createElement)("div", { className: "dmo-row-sub" }, item.detail)
        ),
        (0, import_react9.createElement)(Badge, { tone: reviewTone(item.kind) }, reviewLabel(item.kind))
      ))
    ),
    data.topMisses.length === 0 ? null : (0, import_react9.createElement)(
      "div",
      { style: { marginTop: 8 } },
      (0, import_react9.createElement)("div", { className: "dmo-lane-head" }, "\u6700\u8BE5\u8865\u7684\u672A\u547D\u4E2D"),
      data.topMisses.map((miss) => (0, import_react9.createElement)(
        "div",
        { key: miss.query, className: "dmo-resident-row" },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", { className: "dmo-row-text" }, truncate(miss.query, 38))
        ),
        (0, import_react9.createElement)("span", { className: "dmo-budget-num" }, `${count(miss.count)} \u6B21`)
      ))
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginBottom: 0 } },
      `\u590D\u76D8\u53EA\u8BFB\uFF0C\u4E0D\u6539\u5E93\u3002\u5931\u8D25\u7387\u7C7B\u6307\u6807\u89C1\u4E0A\u65B9\u300C\u4E09\u7387\u300D\u2014\u2014\u90A3\u91CC\u663E\u793A\u300C\u2014\u300D\u662F\u56E0\u4E3A\u5206\u6BCD\u4E3A 0\uFF0C\u4E0D\u662F 0%\u3002`
    )
  );
}
function reviewLabel(kind) {
  switch (kind) {
    case "retire":
      return "\u8BE5\u9000\u5F79";
    case "confirm":
      return "\u5F85\u62CD\u677F";
    case "review":
      return "\u5F85\u590D\u6838";
    case "compact":
      return "\u8D85\u9650";
    case "fill":
      return "\u8BE5\u8865";
    default:
      return kind;
  }
}
function reviewTone(kind) {
  switch (kind) {
    case "retire":
      return "err";
    case "confirm":
      return "warn";
    case "review":
      return "warn";
    case "compact":
      return "brand";
    default:
      return "idle";
  }
}
function RepairSection({ data, phase, error, busy, run, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u4FEE\u8865\u8BA1\u5212" });
  if (loading !== null) return loading;
  if (data === void 0) return null;
  const noFrontmatter = data.fixes.filter((fix) => !fix.hadFrontmatter).length;
  return (0, import_react9.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-budget-row", style: { flexWrap: "wrap", gap: 6 } },
      (0, import_react9.createElement)(Badge, { tone: data.fixes.length === 0 ? "ok" : "warn" }, `\u9700\u4FEE\u8865 ${data.fixes.length}`),
      (0, import_react9.createElement)(Badge, { tone: "ok" }, `\u5065\u5EB7 ${data.healthy}`),
      noFrontmatter > 0 ? (0, import_react9.createElement)(Badge, { tone: "err" }, `\u65E0 frontmatter ${noFrontmatter}`) : null
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginTop: 0 } },
      data.fixes.length === 0 ? "\u5168\u90E8\u6761\u76EE\u5143\u6570\u636E\u5B8C\u6574\uFF0C\u6CBB\u7406\u529F\u80FD\u6B63\u5E38\uFF08\u5F85\u4F60\u5904\u7406\u3001\u786E\u8BA4\u7387\u3001\u5230\u671F\u9000\u5F79\u90FD\u80FD\u7B97\u51FA\u6765\uFF09\u3002" : "\u7F3A status \u2192 \u5F85\u4F60\u5904\u7406\u961F\u5217\u6C38\u8FDC\u7A7A\uFF1B\u7F3A layer \u2192 \u9884\u7B97\u8D26\u672C\u4E09\u6BB5\u7EDF\u8BA1\u4E0D\u51FA\u6765\uFF1B\u7F3A updated \u2192 \u6C38\u8FDC\u4E0D\u63D0\u793A\u9000\u5F79\u3002 \u4FEE\u8865\u53EA\u5199 frontmatter\uFF0C**\u7EDD\u4E0D\u6539\u6B63\u6587**\uFF0C\u4E5F**\u7EDD\u4E0D\u8986\u76D6\u5DF2\u6709\u503C**\uFF08\u975E\u6CD5 status \u9664\u5916\uFF09\u3002"
    ),
    data.fixes.length === 0 ? null : (0, import_react9.createElement)(
      "div",
      null,
      data.fixes.slice(0, 8).map((fix) => (0, import_react9.createElement)(
        "div",
        { key: fix.path, className: "dmo-resident-row" },
        (0, import_react9.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react9.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            onClick: () => {
              onOpenMemory(fix.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(fix.path);
            }
          }, truncate(fix.title, 38)),
          (0, import_react9.createElement)("div", { className: "dmo-row-sub" }, fix.reasons.join("\uFF1B"))
        ),
        (0, import_react9.createElement)(
          Badge,
          { tone: fix.hadFrontmatter ? "warn" : "err" },
          fix.hadFrontmatter ? `${Object.keys(fix.patch).length} \u5B57\u6BB5` : "\u65E0 frontmatter"
        )
      )),
      data.fixes.length > 8 ? (0, import_react9.createElement)("div", { className: "dmo-note" }, `\u8FD8\u6709 ${data.fixes.length - 8} \u7BC7\u2026`) : null,
      (0, import_react9.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react9.createElement)(Button, {
          small: true,
          variant: "primary",
          disabled: busy,
          onClick: () => {
            run(
              () => call("repairMeta", { apply: true }),
              `\u5DF2\u4FEE\u8865 ${data.fixes.length} \u7BC7\uFF0C\u6CBB\u7406\u529F\u80FD\u5DF2\u6062\u590D`,
              onRetry
            );
          }
        }, `\u4FEE\u8865 ${data.fixes.length} \u7BC7`)
      )
    ),
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-note", style: { marginBottom: 0 } },
      "\u4FEE\u8865\u540E\u8BF7\u5237\u65B0\u300C\u603B\u89C8\u300D\u2014\u2014\u5F85\u4F60\u5904\u7406\u961F\u5217\u3001\u786E\u8BA4\u7387\u3001\u5C42\u7EDF\u8BA1\u4F1A\u7ACB\u523B\u6709\u6570\u5B57\u3002"
    )
  );
}

// packages/dsh-plugin/src/client/panes/overview.ts
function OverviewPane({ onOpenMemory }) {
  const [exporting, setExporting] = (0, import_react10.useState)(false);
  const [showResident, setShowResident] = (0, import_react10.useState)(false);
  const [toast, setToast] = (0, import_react10.useState)(null);
  const [action, setAction] = (0, import_react10.useState)(null);
  const [actionBusy, setActionBusy] = (0, import_react10.useState)(false);
  const overview = useBridge("overview", {});
  const snapshot = useBridge("snapshot", {});
  const health = useBridge("health", {});
  const misses = useBridge("misses", {});
  if (overview.phase === "loading") return (0, import_react10.createElement)(Skeleton, { rows: 4, height: 46 });
  if (overview.phase === "error") {
    return (0, import_react10.createElement)(ErrorState, {
      message: `\u8BFB\u53D6\u603B\u89C8\u5931\u8D25\uFF1A${orEmpty(overview.error)}`,
      onRetry: overview.reload
    });
  }
  const data = overview.data;
  if (data === void 0) return (0, import_react10.createElement)(Skeleton, { rows: 2 });
  const queue = snapshot.data?.queue ?? [];
  const healthData = health.data;
  function runAction(route, body, success) {
    setActionBusy(true);
    setAction(null);
    void call(route, body).then(() => {
      setAction({ ok: true, text: success });
      snapshot.reload();
    }).catch((failure) => {
      setAction({ ok: false, text: `${success}\u5931\u8D25\uFF1A${failure instanceof Error ? failure.message : String(failure)}` });
    }).finally(() => {
      setActionBusy(false);
    });
  }
  function doExport(format, domain) {
    setExporting(true);
    setToast(null);
    void call("export", { format, domain }).then((result) => {
      const blob = new Blob([result.content], { type: format === "json" ? "application/json" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast({ ok: true, text: `\u5DF2\u5BFC\u51FA ${result.count} \u6761\u5230 ${result.filename}` });
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setExporting(false);
    });
  }
  return (0, import_react10.createElement)(
    "div",
    null,
    // KPI：常驻前缀排第一
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-kpis" },
      (0, import_react10.createElement)(
        "button",
        {
          type: "button",
          className: "dmo-kpi dmo-kpi-btn",
          "aria-expanded": showResident,
          title: "\u70B9\u5F00\u770B\u5E38\u9A7B\u524D\u7F00\u7531\u54EA\u4E9B\u5185\u5BB9\u6784\u6210\uFF08\u53EA\u7B97\u6BCF\u8BF7\u6C42\u4ED8\u8D39\u7684\u90E8\u5206\uFF09",
          onClick: () => {
            setShowResident((value) => !value);
          }
        },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-kpi-label" },
          "\u5E38\u9A7B\u524D\u7F00",
          (0, import_react10.createElement)("span", { className: "dmo-kpi-more" }, showResident ? "\u6536\u8D77" : "\u6784\u6210")
        ),
        (0, import_react10.createElement)("div", { className: "dmo-kpi-value" }, count(data.kpi.residentTokens)),
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-kpi-note" },
          `\u6BCF\u8BF7\u6C42\u4ED8\u8D39 \xB7 \u9884\u7B97 ${count(data.kpi.residentBudget)}`
        )
      ),
      /**
       * 索引层单独一格。
       *
       * 早先这里没有这一格，索引体积被塞进了「常驻前缀」那一格显示，
       * 于是顶栏写着 286，而构成面板写着 361 —— 两个数字对不上，
       * 且按第一格去优化会去删索引表，每请求成本一分不省。
       */
      (0, import_react10.createElement)(Kpi, {
        label: "\u7D22\u5F15\u5C42\u4F53\u79EF",
        value: count(data.kpi.indexTokens),
        note: "\u6309\u9700\u52A0\u8F7D"
      }),
      (0, import_react10.createElement)(Kpi, { label: "\u547D\u4E2D\u7387", value: percent(data.kpi.hitRate), note: "30 \u5929" }),
      (0, import_react10.createElement)(Kpi, { label: "\u5F85\u4F60\u5904\u7406", value: count(data.kpi.pending), note: "\u9700\u62CD\u677F" }),
      (0, import_react10.createElement)(Kpi, { label: "\u8FC7\u671F\u7387", value: percent(data.kpi.expireRate), note: "stale+archived" })
    ),
    // 常驻前缀构成：把「286 是什么」摊开
    showResident ? (0, import_react10.createElement)(ResidentPanel, {
      resident: data.resident,
      onOpenMemory
    }) : null,
    // 预算账本：每段说清「什么时候付费、超了怎么办」
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-budget" },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-lane-head" },
        "\u9884\u7B97\u8D26\u672C",
        (0, import_react10.createElement)("span", { className: "dmo-lane-count" }, "\u6570\u5B57\u53EA\u5728\u80FD\u6307\u5BFC\u51B3\u7B56\u65F6\u624D\u6709\u7528")
      ),
      data.budget.map((row) => (0, import_react10.createElement)(
        "div",
        { key: row.layer, className: "dmo-budget-item" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-budget-head" },
          (0, import_react10.createElement)(Badge, { tone: row.billing === "per-request" ? "warn" : "idle" }, row.layer),
          (0, import_react10.createElement)("span", { className: "dmo-row-text" }, row.name),
          (0, import_react10.createElement)(
            Badge,
            { tone: row.billing === "per-request" ? "err" : "idle" },
            row.billing === "per-request" ? "\u6BCF\u8BF7\u6C42\u4ED8\u8D39" : "\u6309\u9700\u52A0\u8F7D"
          ),
          (0, import_react10.createElement)(
            "span",
            { className: "dmo-budget-num", style: { marginLeft: "auto" } },
            count(row.tokens),
            row.limit === null ? "" : ` / ${count(row.limit)}`
          )
        ),
        row.limit === null ? null : (0, import_react10.createElement)(BudgetRow, {
          name: "",
          tokens: row.tokens,
          limit: row.limit
        }),
        (0, import_react10.createElement)("div", { className: "dmo-row-sub" }, `${count(row.files)} \u4E2A\u6587\u4EF6 \xB7 ${row.note}`),
        (0, import_react10.createElement)("div", { className: "dmo-row-sub" }, `\u2192 ${row.advice}`)
      )),
      (0, import_react10.createElement)("div", { className: "dmo-note", style: { marginBottom: 0 } }, data.cacheNote)
    ),
    toast === null ? null : (0, import_react10.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status",
      style: { marginBottom: 8 }
    }, toast.text),
    // 待处理队列
    queue.length === 0 ? (0, import_react10.createElement)(
      Empty,
      { title: "\u5F85\u5904\u7406\u961F\u5217\u5DF2\u6E05\u7A7A" },
      (0, import_react10.createElement)("div", null, "\u6CA1\u6709\u9700\u8981\u4F60\u62CD\u677F\u7684\u6761\u76EE\u3002")
    ) : (0, import_react10.createElement)(
      "div",
      null,
      /**
       * 动作结果条：成功与失败都**必须**可见。
       * `role="status"` 而非 alert——它是操作反馈，不是打断。
       */
      action === null ? null : (0, import_react10.createElement)("div", {
        className: `dmo-toast ${action.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
        role: "status",
        style: { marginBottom: 8 }
      }, action.text),
      (0, import_react10.createElement)("div", { className: "dmo-lane-head" }, "\u5F85\u4F60\u5904\u7406", (0, import_react10.createElement)("span", { className: "dmo-lane-count" }, `${queue.length} \u6761`)),
      queue.slice(0, 8).map((item) => (0, import_react10.createElement)(
        "div",
        { key: item.id, className: "dmo-card" },
        (0, import_react10.createElement)("div", { className: "dmo-card-title" }, truncate(item.title, 46)),
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-card-meta" },
          (0, import_react10.createElement)(Badge, { tone: "warn" }, item.reason),
          item.confidence === null ? null : (0, import_react10.createElement)(Badge, { tone: "idle" }, `\u7F6E\u4FE1 ${item.confidence.toFixed(1)}`),
          (0, import_react10.createElement)("span", null, orEmpty(item.origin))
        ),
        (0, import_react10.createElement)(Stepper, { status: item.status }),
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-card-actions" },
          /**
           * 总览也要能直接拍板。
           *
           * 早先这里只有「看详情 / 再留」，用户想确认还得跳去「本项目」——
           * 而 manual.md 写的是「总览 → 待你处理 → 确认 / 驳回」。
           * 文档与界面必须有同一个答案，否则用户会以为按钮消失了。
           */
          item.kind === "retire" ? (0, import_react10.createElement)(Button, {
            small: true,
            variant: "danger",
            disabled: actionBusy,
            onClick: () => {
              runAction("archive", { path: item.path, reason: "\u5230\u671F\u9000\u5F79" }, "\u5F52\u6863");
            }
          }, "\u5F52\u6863") : (0, import_react10.createElement)(Button, {
            small: true,
            variant: "primary",
            disabled: actionBusy,
            onClick: () => {
              runAction("confirm", { path: item.path }, "\u786E\u8BA4");
            }
          }, "\u786E\u8BA4"),
          item.kind === "retire" ? null : (0, import_react10.createElement)(Button, {
            small: true,
            variant: "danger",
            onClick: () => {
              onOpenMemory(item.path);
            },
            title: "\u9A73\u56DE\u9700\u8981\u5199\u7406\u7531\uFF0C\u53BB\u8BE6\u60C5\u91CC\u586B"
          }, "\u9A73\u56DE\u2026"),
          (0, import_react10.createElement)(Button, { small: true, onClick: () => {
            onOpenMemory(item.path);
          } }, "\u770B\u8BE6\u60C5"),
          (0, import_react10.createElement)(Button, {
            small: true,
            disabled: actionBusy,
            onClick: () => {
              runAction("keep", { path: item.path }, "\u518D\u7559 90 \u5929\u6210\u529F");
            }
          }, "\u518D\u7559 90 \u5929")
        )
      ))
    ),
    /**
     * 未命中汇总行。
     *
     * 设计稿把「未命中该补了 N 条」也列进「待你处理」——因为那确实是一件待办：
     * 库里没有的东西，只有你能补。早先它只出现在「未命中」分区，
     * 而用户未必会主动去看那一页。
     */
    (misses.data?.counts?.["should-fill"] ?? 0) === 0 ? null : (0, import_react10.createElement)(
      "div",
      { className: "dmo-card" },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react10.createElement)(Badge, { tone: "warn" }, "\u672A\u547D\u4E2D\u8BE5\u8865\u4E86"),
        (0, import_react10.createElement)("span", null, `${count(misses.data?.counts?.["should-fill"] ?? 0)} \u6761`)
      ),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-card-actions" },
        (0, import_react10.createElement)(Button, { small: true, onClick: () => {
          onOpenMemory("");
        } }, "\u53BB\u672A\u547D\u4E2D \u2192")
      )
    ),
    // 三率
    (0, import_react10.createElement)("div", { className: "dmo-lane-head", style: { marginTop: 12 } }, "\u4E09\u7387"),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-card" },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react10.createElement)("span", null, `\u547D\u4E2D\u7387 ${percent(data.rates.hitRate)}`),
        (0, import_react10.createElement)("span", null, `\u786E\u8BA4\u7387 ${percent(data.rates.confirmRate)}`),
        (0, import_react10.createElement)("span", null, `\u8FC7\u671F\u7387 ${percent(data.rates.expireRate)}`),
        (0, import_react10.createElement)("span", null, `\u8865\u5E93\u8F6C\u5316 ${percent(data.rates.missRate)}`)
      ),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-note", style: { marginBottom: 0 } },
        "\u5206\u6BCD\u4E3A 0 \u663E\u793A\u300C\u2014\u300D\u2014\u2014\u300C\u7B97\u4E0D\u51FA\u6765\u300D\u548C\u300C\u662F\u96F6\u300D\u662F\u4E24\u4EF6\u4E8B\u3002"
      )
    ),
    // 库健康
    healthData === void 0 ? null : (0, import_react10.createElement)(
      "div",
      { style: { marginTop: 12 } },
      (0, import_react10.createElement)("div", { className: "dmo-lane-head" }, "\u5E93\u5065\u5EB7"),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-card" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-card-meta" },
          (0, import_react10.createElement)(
            Badge,
            { tone: healthData.overLimit > 0 ? "warn" : "ok" },
            `\u8D85 ${healthData.lineLimit} \u884C ${healthData.overLimit} \u7BC7`
          ),
          (0, import_react10.createElement)(Badge, { tone: "idle" }, `\u9A73\u56DE\u9759\u9ED8 ${healthData.silenced.length} \u6761`),
          (0, import_react10.createElement)(Badge, { tone: "idle" }, `\u5F85\u590D\u6838 ${healthData.stale.length} \u6761`)
        )
      )
    ),
    // 域统计：可下钻，看到每个域下具体有哪几篇
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-lane-head", style: { marginTop: 12 } },
      "\u57DF\u7EDF\u8BA1",
      (0, import_react10.createElement)("span", { className: "dmo-lane-count" }, "\u70B9\u57DF\u5C55\u5F00\u660E\u7EC6")
    ),
    data.domains.length === 0 ? (0, import_react10.createElement)("div", { className: "dmo-note" }, "\u8FD8\u6CA1\u6709\u4EFB\u4F55\u57DF\u3002") : data.domains.map((domain) => (0, import_react10.createElement)(DomainCard, {
      key: domain.key,
      domain,
      onOpenMemory
    })),
    // 维护作业：修补 / 锚点校验 / 减重 / 爬升 / 复盘
    (0, import_react10.createElement)(MaintenancePanel, { onOpenMemory }),
    // 导出
    (0, import_react10.createElement)("div", { className: "dmo-lane-head", style: { marginTop: 12 } }, "\u5BFC\u51FA"),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-card-actions" },
      (0, import_react10.createElement)(Button, { small: true, disabled: exporting, onClick: () => {
        doExport("markdown");
      } }, "\u5BFC\u51FA Markdown"),
      (0, import_react10.createElement)(Button, { small: true, disabled: exporting, onClick: () => {
        doExport("json");
      } }, "\u5BFC\u51FA JSON"),
      /** 按域导出：设计稿有「仅个人域 / 仅工作域」，因为两个域的用途完全不同。 */
      (0, import_react10.createElement)(Button, {
        small: true,
        disabled: exporting,
        onClick: () => {
          doExport("markdown", "personal");
        }
      }, "\u4EC5\u4E2A\u4EBA\u57DF"),
      (0, import_react10.createElement)(Button, {
        small: true,
        disabled: exporting,
        onClick: () => {
          doExport("markdown", "work/sz-web");
        }
      }, "\u4EC5\u5DE5\u4F5C\u57DF")
    ),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-note" },
      "\u5BFC\u51FA\u5F53\u524D\u8303\u56F4\u5168\u90E8\u8BB0\u5FC6\uFF0C\u542B frontmatter \u4E0E\u8BC1\u636E\u94FE\u3002"
    ),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-note" },
      `\u5E93\u6839\u76EE\u5F55\uFF1A${orEmpty(snapshot.data?.root)} \xB7 ${count(data.files)} \u7BC7 \xB7 ${count(data.tokens)} tokens`
    )
  );
}
function ResidentPanel({ resident, onOpenMemory }) {
  if (resident === void 0) {
    return (0, import_react10.createElement)(
      "div",
      { className: "dmo-degrade" },
      "\u672A\u80FD\u8BFB\u53D6\u5E38\u9A7B\u524D\u7F00\u6784\u6210\u3002\u6570\u5B57\u4ECD\u7136\u53EF\u4FE1\uFF0C\u53EA\u662F\u65E0\u6CD5\u62C6\u5206\u3002"
    );
  }
  if (resident.state === "error") {
    return (0, import_react10.createElement)(
      "div",
      { className: "dmo-degrade" },
      (0, import_react10.createElement)("div", null, `\u8BFB\u4E0D\u5230 skill \u5217\u8868\uFF1A${resident.error}`),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-row-sub", style: { marginTop: 3 } },
        `\u5F53\u524D\u53EA\u7EDF\u8BA1\u5230\u76EE\u5F55\u6846\u67B6 ${count(resident.frameTokens)} tokens\uFF0Cskill description \u672A\u80FD\u8BA1\u5165\u2014\u2014\u6240\u4EE5\u8FD9\u4E2A\u6570\u5B57\u662F\u504F\u5C0F\u7684\u3002`
      ),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-row-sub" },
        'skill \u88C5\u5728\u5BBF\u4E3B\u914D\u7F6E\u7684\u76EE\u5F55\u91CC\uFF08\u5F53\u524D\u662F /Users/zeze/Desktop/dsh/skill/\uFF09\uFF0C\u63D2\u4EF6\u901A\u8FC7 ctx.get("skills") \u8BFB\u53D6\uFF1B\u53D6\u4E0D\u5230\u65F6\u4E0D\u4F1A\u5047\u88C5\u6210 0\u3002'
      )
    );
  }
  const catalogs = resident.items.filter((item) => item.kind === "catalog");
  const indexes = resident.items.filter((item) => item.kind === "index");
  return (0, import_react10.createElement)(
    "div",
    { className: "dmo-budget" },
    (0, import_react10.createElement)("div", { className: "dmo-lane-head" }, "\u5E38\u9A7B\u524D\u7F00\u6784\u6210"),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-note", style: { marginTop: 0 } },
      "\u6BCF\u8BF7\u6C42\u771F\u6B63\u4ED8\u8D39\u7684\u53EA\u6709 skill \u76EE\u5F55\uFF1BL0 \u7D22\u5F15\u6587\u4EF6\u5728\u88AB read \u4E4B\u524D\u4E0D\u8FDB\u4E0A\u4E0B\u6587\u3002"
    ),
    // ① 每请求付费
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-resident-group" },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-resident-head" },
        (0, import_react10.createElement)(Badge, { tone: "warn" }, "\u6BCF\u8BF7\u6C42\u4ED8\u8D39"),
        (0, import_react10.createElement)(
          "span",
          { className: "dmo-lane-count" },
          `${count(resident.billedTokens)} tokens`
        )
      ),
      catalogs.length === 0 ? (0, import_react10.createElement)(
        "div",
        { className: "dmo-note" },
        "\u5BBF\u4E3B\u6CA1\u6709\u6CE8\u5165\u4EFB\u4F55 skill\uFF08\u6216\u672A\u63D0\u4F9B skills \u670D\u52A1\uFF09\u3002"
      ) : catalogs.map((item) => (0, import_react10.createElement)(
        "div",
        { key: item.id, className: "dmo-resident-row" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react10.createElement)("div", { className: "dmo-row-text" }, item.title),
          (0, import_react10.createElement)("div", { className: "dmo-row-sub" }, item.note)
        ),
        (0, import_react10.createElement)("span", { className: "dmo-budget-num" }, count(item.tokens))
      )),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-resident-row" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react10.createElement)("div", { className: "dmo-row-text" }, "\u76EE\u5F55\u6846\u67B6\u6587\u5B57"),
          (0, import_react10.createElement)(
            "div",
            { className: "dmo-row-sub" },
            "<available_skills> \u7684\u56FA\u5B9A\u8BF4\u660E\uFF0C\u4E0E skill \u6570\u91CF\u65E0\u5173"
          )
        ),
        (0, import_react10.createElement)("span", { className: "dmo-budget-num" }, count(resident.frameTokens))
      )
    ),
    // ② 按需加载
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-resident-group" },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-resident-head" },
        (0, import_react10.createElement)(Badge, { tone: "idle" }, "\u6309\u9700\u52A0\u8F7D"),
        (0, import_react10.createElement)(
          "span",
          { className: "dmo-lane-count" },
          `${count(resident.onDemandTokens)} tokens`
        )
      ),
      indexes.length === 0 ? (0, import_react10.createElement)("div", { className: "dmo-note" }, "\u6CA1\u6709\u6807\u8BB0 layer: l0 \u7684\u7D22\u5F15\u6587\u4EF6\u3002") : indexes.map((item) => (0, import_react10.createElement)(
        "div",
        { key: item.id, className: "dmo-resident-row" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react10.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            title: "\u6253\u5F00\u8BE5\u7D22\u5F15\u6587\u4EF6",
            onClick: () => {
              onOpenMemory(item.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(item.path);
            }
          }, item.title),
          (0, import_react10.createElement)(
            "div",
            { className: "dmo-row-sub" },
            `${item.path} \xB7 ${count(item.lines)} \u884C \xB7 ${item.note}`,
            item.overLineLimit ? " \xB7 \u8D85 80 \u884C" : ""
          )
        ),
        (0, import_react10.createElement)("span", { className: "dmo-budget-num" }, count(item.tokens))
      ))
    ),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-note", style: { marginBottom: 0 } },
      "\u8981\u538B\u7F29\u5E38\u9A7B\u6210\u672C\uFF0C\u52A8\u7684\u662F skill description\uFF1B\u6539\u7D22\u5F15\u6587\u4EF6\u4E0D\u5F71\u54CD\u6BCF\u8BF7\u6C42\u5F00\u9500\uFF0C\u4F46\u6539\u4EFB\u4F55\u4E00\u4E2A\u90FD\u4F1A\u4F5C\u5E9F\u5F53\u524D\u4F1A\u8BDD\u7F13\u5B58\u3002"
    )
  );
}
function DomainCard({ domain, onOpenMemory }) {
  const [open, setOpen] = (0, import_react10.useState)(false);
  const entries = domain.entries ?? [];
  return (0, import_react10.createElement)(
    "div",
    { className: "dmo-card" },
    (0, import_react10.createElement)("div", {
      className: "dmo-card-title dmo-link",
      role: "button",
      tabIndex: 0,
      "aria-expanded": open,
      title: "\u70B9\u5F00\u770B\u8FD9\u4E2A\u57DF\u4E0B\u6709\u54EA\u4E9B\u6587\u4EF6",
      onClick: () => {
        setOpen((value) => !value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") setOpen((value) => !value);
      }
    }, `${open ? "\u25BE" : "\u25B8"} ${domain.label}`),
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-card-meta" },
      (0, import_react10.createElement)("span", null, `${count(domain.files)} \u7BC7`),
      (0, import_react10.createElement)("span", null, `${count(domain.tokens)} tokens`),
      (0, import_react10.createElement)("span", null, bytes(domain.bytes)),
      domain.overLimit > 0 ? (0, import_react10.createElement)(Badge, { tone: "warn" }, `\u8D85\u9650 ${domain.overLimit}`) : null
    ),
    open ? (0, import_react10.createElement)(
      "div",
      { style: { marginTop: 6 } },
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-note", style: { marginTop: 0 } },
        `\u5171 ${count(entries.length)} \u7BC7\uFF0C\u6309\u4F53\u79EF\u964D\u5E8F\u3002\u70B9\u6807\u9898\u6253\u5F00\u8BE6\u60C5\u3002`
      ),
      entries.map((entry) => (0, import_react10.createElement)(
        "div",
        { key: entry.id, className: "dmo-resident-row" },
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-resident-main" },
          (0, import_react10.createElement)("div", {
            className: "dmo-row-text dmo-link",
            role: "button",
            tabIndex: 0,
            onClick: () => {
              onOpenMemory(entry.path);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") onOpenMemory(entry.path);
            }
          }, truncate(entry.title, 40)),
          (0, import_react10.createElement)(
            "div",
            { className: "dmo-row-sub" },
            `${entry.path} \xB7 ${entry.layer || "\u672A\u6807\u5C42"} \xB7 ${statusLabel(entry.status)} \xB7 ${count(entry.lines)} \u884C`,
            entry.overLineLimit ? " \xB7 \u8D85 80 \u884C" : ""
          )
        ),
        (0, import_react10.createElement)("span", { className: "dmo-budget-num" }, count(entry.tokens))
      ))
    ) : null
  );
}

// packages/dsh-plugin/src/client/panel.ts
var PANES = [
  { id: "project", label: "\u672C\u9879\u76EE" },
  { id: "stream", label: "\u8BB0\u5F55\u6D41" },
  { id: "memory", label: "\u8BB0\u5FC6" },
  { id: "misses", label: "\u672A\u547D\u4E2D" },
  { id: "overview", label: "\u603B\u89C8" }
];
function PanelIcon({ size }) {
  return (0, import_react11.createElement)(MemoryIcon, { size: typeof size === "number" ? size : 18 });
}
function MemoryOpsPage(props) {
  const ctx = props.ctx;
  const { cwd, project } = useSessionProject(ctx);
  const [pane, setPane] = (0, import_react11.useState)("project");
  const [detailPath, setDetailPath] = (0, import_react11.useState)(void 0);
  const requestedPane = usePaneRequest();
  (0, import_react11.useEffect)(() => {
    const next = consumePaneRequest();
    if (next === void 0) return;
    setPane(next);
    if (next !== "memory") setDetailPath(void 0);
  }, [requestedPane]);
  const snapshot = useBridge("snapshot", scopeBody(cwd, project), [cwd, project]);
  const misses = useBridge("misses", {});
  const queueBadge = snapshot.data?.queue.length ?? 0;
  const missBadge = (misses.data?.pipeline["should-fill"]?.length ?? 0) + (misses.data?.pipeline.drafting?.length ?? 0);
  const tabs = PANES.map((item) => ({
    id: item.id,
    label: item.label,
    badge: item.id === "overview" ? queueBadge : item.id === "misses" ? missBadge : void 0
  }));
  function openMemory(path) {
    setDetailPath(path === "" ? void 0 : path);
    setPane("memory");
  }
  let body;
  switch (pane) {
    case "stream":
      body = (0, import_react11.createElement)(StreamPane, null);
      break;
    case "memory":
      body = (0, import_react11.createElement)(MemoryPane, { project, cwd, onOpenMemory: openMemory, detailPath });
      break;
    case "misses":
      body = (0, import_react11.createElement)(MissesPane, null);
      break;
    case "overview":
      body = (0, import_react11.createElement)(OverviewPane, { onOpenMemory: openMemory });
      break;
    default:
      body = (0, import_react11.createElement)(ProjectPane, {
        project,
        cwd,
        onOpenMemory: openMemory,
        onGoto: (next) => {
          setPane(next);
          setDetailPath(void 0);
        }
      });
  }
  return (0, import_react11.createElement)(
    "div",
    { className: "dmo-root" },
    (0, import_react11.createElement)(TabBar, {
      tabs,
      active: pane,
      onChange: (id) => {
        setPane(id);
        if (id !== "memory") setDetailPath(void 0);
      }
    }),
    (0, import_react11.createElement)("div", { className: "dmo-body" }, body)
  );
}

// packages/dsh-plugin/src/client/session-view.ts
var import_react12 = require("react");
function SessionMemoryView(props) {
  const onGotoMisses = typeof props.onGotoMisses === "function" ? props.onGotoMisses : void 0;
  const ctx = props.ctx;
  const sessionId = typeof props.sessionId === "string" ? props.sessionId : void 0;
  const { cwd, project } = useSessionProject(ctx);
  const [busy, setBusy] = (0, import_react12.useState)(false);
  const [toast, setToast] = (0, import_react12.useState)(null);
  const { phase, data, error, reload } = useBridge(
    "sessionMemory",
    { sessionId, ...scopeBody(cwd, project) },
    [sessionId, cwd, project]
  );
  function goMisses(viaSidebar = false) {
    if (onGotoMisses !== void 0) {
      onGotoMisses();
      return;
    }
    const ok = gotoPane(ctx, "misses");
    if (ok) return;
    setToast({
      ok: false,
      text: viaSidebar ? "\u5DF2\u8BB0\u4E0B\u76EE\u6807\u5206\u533A\uFF0C\u4F46\u4FA7\u680F\u300C\u8BB0\u5FC6\u5E93\u300D\u9762\u677F\u6CA1\u6709\u6253\u5F00\uFF08\u53EF\u4ECE\u5DE6\u4FA7\u680F\u624B\u52A8\u6253\u5F00\uFF09\u3002" : "\u6253\u4E0D\u5F00\u8BB0\u5FC6\u9762\u677F\uFF1A\u5F53\u524D\u5BBF\u4E3B\u6CA1\u6709\u63D0\u4F9B layout \u670D\u52A1\uFF08\u53EF\u4ECE\u5DE6\u4FA7\u680F\u300C\u8BB0\u5FC6\u5E93\u300D\u624B\u52A8\u8FDB\u5165\uFF09\u3002"
    });
  }
  function draftFromMiss(query) {
    setBusy(true);
    setToast(null);
    void call("missDraft", { query, type: "\u95EE\u9898" }).then(() => {
      setToast({ ok: true, text: `\u300C${truncate(query, 20)}\u300D\u5DF2\u8F6C\u8349\u7A3F\u3002` });
      reload();
    }).catch((failure) => {
      setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  if (phase === "loading") return (0, import_react12.createElement)(Skeleton, { rows: 2, height: 60 });
  if (phase === "error") return (0, import_react12.createElement)(ErrorState, { message: `\u8BFB\u53D6\u4F1A\u8BDD\u8BB0\u5FC6\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry: reload });
  if (data === void 0) return (0, import_react12.createElement)(Skeleton, { rows: 1 });
  const resolution = data.resolution;
  const unknownProject = resolution !== null && resolution.project === null;
  const noCwd = resolution === null && data.project === null;
  return (0, import_react12.createElement)(
    "div",
    { className: "dmo-session" },
    /**
     * 项目归属必须写在顶上。
     *
     * 早先这一栏没有项目信息，用户看到一个空 tab 时完全不知道
     * 「是没注入」还是「是没认出项目」——两种情况的下一步动作完全不同。
     */
    (0, import_react12.createElement)(
      "div",
      { className: "dmo-row-sub", style: { marginBottom: 6 } },
      data.project === null ? "\u9879\u76EE\uFF1A\u672A\u89E3\u6790" : `\u9879\u76EE\uFF1A${data.project}`,
      resolution?.matchedBy === "alias" ? ` \xB7 \u7531\u522B\u540D ${orEmpty(resolution.matchedAlias)} \u63A8\u65AD` : resolution?.matchedBy === "name" ? " \xB7 \u76EE\u5F55\u540D\u4E0E\u9879\u76EE\u540C\u540D" : "",
      resolution?.matchedBy === "prefix" ? ` \xB7 \u7531\u524D\u7F00 ${orEmpty(resolution.matchedAlias)} \u63A8\u65AD` : ""
    ),
    (0, import_react12.createElement)(
      "div",
      { className: "dmo-session-kpis" },
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react12.createElement)("b", null, count(data.injected)),
        (0, import_react12.createElement)("span", null, "\u672C\u6B21\u6CE8\u5165")
      ),
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react12.createElement)("b", null, count(data.cited)),
        (0, import_react12.createElement)("span", null, "\u5F15\u7528")
      ),
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react12.createElement)("b", null, count(data.missed)),
        (0, import_react12.createElement)("span", null, "\u672A\u547D\u4E2D")
      )
    ),
    unknownProject ? (0, import_react12.createElement)(
      "div",
      { className: "dmo-degrade" },
      `\u6CA1\u80FD\u4ECE\u5F53\u524D\u76EE\u5F55\u8BA4\u51FA\u9879\u76EE\uFF1A${orEmpty(resolution.reason)}`,
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-row-sub" },
        `\u5F53\u524D\u76EE\u5F55\uFF1A${orEmpty(resolution.cwd)}`,
        resolution.knownProjects.length === 0 ? "" : ` \xB7 \u5DF2\u77E5\u9879\u76EE\uFF1A${resolution.knownProjects.join(" / ")}`
      )
    ) : noCwd ? (0, import_react12.createElement)(
      "div",
      { className: "dmo-degrade" },
      "\u6CA1\u62FF\u5230\u5F53\u524D\u76EE\u5F55\uFF0C\u65E0\u6CD5\u5224\u5B9A\u9879\u76EE\uFF08\u8FD9\u4E0D\u4F1A\u5F71\u54CD\u4EFB\u52A1\uFF0C\u53EA\u662F\u8FD9\u4E00\u680F\u6CA1\u6CD5\u6309\u9879\u76EE\u8FC7\u6EE4\uFF09\u3002"
    ) : null,
    toast === null ? null : (0, import_react12.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status"
    }, toast.text),
    // 为什么注入
    (0, import_react12.createElement)("div", { className: "dmo-lane-head" }, "\u4E3A\u4EC0\u4E48\u6CE8\u5165"),
    data.reasons.length === 0 ? (0, import_react12.createElement)(
      "div",
      { className: "dmo-note" },
      data.recalled === 0 ? "\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u68C0\u7D22\u8BB0\u5F55\u3002\u8BB0\u5FC6\u53EA\u5728\u88AB\u68C0\u7D22\u65F6\u624D\u6CE8\u5165\u2014\u2014\u8FD9\u662F\u6210\u672C\u8BBE\u8BA1\uFF0C\u4E0D\u662F\u7F3A\u9677\u3002" : `\u672C\u4F1A\u8BDD\u6709 ${count(data.recalled)} \u6B21\u68C0\u7D22\uFF0C\u4F46\u4E8B\u4EF6\u91CC\u6CA1\u6709\u53EF\u56DE\u6307\u7684\u6761\u76EE id\uFF08\u53EF\u80FD\u662F\u65E7\u7248\u672C\u5199\u5165\u7684\u8BB0\u5F55\uFF09\u3002`
    ) : data.reasons.map((reason) => (0, import_react12.createElement)(
      "div",
      { key: reason.id, className: "dmo-card" },
      (0, import_react12.createElement)("div", { className: "dmo-card-title" }, truncate(reason.title, 46)),
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react12.createElement)(Badge, { tone: "brand" }, reason.why),
        (0, import_react12.createElement)("span", null, `${count(reason.tokens)} tokens`),
        reason.at === "" ? null : (0, import_react12.createElement)("span", null, orEmpty(reason.at.slice(0, 19).replace("T", " "))),
        reason.anchor === null ? null : (0, import_react12.createElement)(
          AnchorNote,
          { state: reason.anchorState === "stale" ? "stale" : "fresh" },
          reason.anchorState === "stale" ? "\u951A\u70B9\u5931\u6548" : "\u951A\u70B9\u6709\u6548",
          (0, import_react12.createElement)(
            "div",
            { className: "dmo-row-sub" },
            `${orEmpty(reason.anchor.path)}${reason.anchor.symbol === void 0 ? "" : ` \xB7 ${reason.anchor.symbol}`}`,
            reason.anchor.hash === void 0 ? "" : ` \xB7 hash ${reason.anchor.hash.slice(0, 8)}`
          )
        )
      )
    )),
    // 未命中转草稿
    (0, import_react12.createElement)("div", { className: "dmo-lane-head", style: { marginTop: 4 } }, "\u672A\u547D\u4E2D"),
    data.recentMisses.length === 0 ? (0, import_react12.createElement)("div", { className: "dmo-note" }, "\u672C\u4F1A\u8BDD\u6CA1\u6709\u672A\u547D\u4E2D\u3002") : data.recentMisses.map((miss, index) => (0, import_react12.createElement)(
      "div",
      {
        key: `${miss.at}-${index}`,
        className: "dmo-row-item"
      },
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-row-main" },
        (0, import_react12.createElement)("div", { className: "dmo-row-text" }, truncate(miss.query ?? "", 40)),
        (0, import_react12.createElement)("div", { className: "dmo-row-sub" }, orEmpty(miss.at.slice(0, 19).replace("T", " ")))
      ),
      (0, import_react12.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          draftFromMiss(miss.query ?? "");
        }
      }, "\u8F6C\u8349\u7A3F")
    )),
    data.recentMisses.length === 0 ? null : (0, import_react12.createElement)(
      "div",
      { className: "dmo-anchor-note", "data-state": "stale" },
      (0, import_react12.createElement)("span", null, "\u8FD9\u4E9B\u68C0\u7D22\u843D\u7A7A\u4E86"),
      (0, import_react12.createElement)(
        "div",
        { className: "dmo-row-sub" },
        "\u540C\u4E00\u4E2A\u95EE\u9898\u6EE1 3 \u6B21\u4F1A\u81EA\u52A8\u8FDB\u300C\u8BE5\u8865\u4E86\u300D\uFF0C\u4E5F\u53EF\u4EE5\u73B0\u5728\u5C31\u8865\u3002"
      )
    ),
    (0, import_react12.createElement)(
      "div",
      { className: "dmo-row", style: { marginTop: 4 } },
      (0, import_react12.createElement)(Button, { small: true, onClick: reload }, "\u5237\u65B0"),
      (0, import_react12.createElement)(Button, { small: true, onClick: () => {
        goMisses(true);
      } }, "\u53BB\u672A\u547D\u4E2D\u5DE5\u4F5C\u53F0")
    )
  );
}

// packages/dsh-plugin/src/client/capture-tab.ts
var import_react13 = require("react");
var CAPTURE_KIND = "memory-ops";
var KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
function CapturePane() {
  const [text, setText] = (0, import_react13.useState)("");
  const [kind, setKind] = (0, import_react13.useState)("\u60F3\u6CD5");
  const [busy, setBusy] = (0, import_react13.useState)(false);
  const [result, setResult] = (0, import_react13.useState)(null);
  const [undo, setUndo] = (0, import_react13.useState)(null);
  const [recent, setRecent] = (0, import_react13.useState)([]);
  (0, import_react13.useEffect)(() => {
    void call("inbox", { domain: "personal" }).then((list) => {
      setRecent([...list.entries].reverse().slice(0, 5).map((entry) => ({
        content: entry.content,
        kind: entry.kind,
        at: entry.date
      })));
    }).catch(() => {
    });
  }, []);
  const [seconds, setSeconds] = (0, import_react13.useState)(0);
  (0, import_react13.useEffect)(() => {
    if (undo === null) {
      setSeconds(0);
      return void 0;
    }
    setSeconds(30);
    const timer = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          clearInterval(timer);
          setUndo(null);
          return 0;
        }
        return value - 1;
      });
    }, 1e3);
    return () => {
      clearInterval(timer);
    };
  }, [undo]);
  function submit() {
    const content = text.trim();
    if (content === "" || busy) return;
    setBusy(true);
    setResult(null);
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      void call(
        "captureBatch",
        { text: content, kind }
      ).then((payload) => {
        const accepted = payload.accepted?.length ?? 0;
        const blocked = payload.blocked ?? [];
        if (blocked.length === 0) {
          setResult({
            ok: true,
            captured: { path: `\u5DF2\u5B58\u5165 ${accepted} \u6761` }
          });
        } else {
          setResult({
            ok: false,
            reason: `${accepted} \u6761\u5DF2\u5B58\u5165\uFF0C${blocked.length} \u6761\u88AB\u62E6\u622A\uFF1A${blocked[0]?.reason ?? ""}`
          });
        }
        if (accepted > 0) {
          setText("");
          const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          setRecent((current) => [
            ...lines.map((line) => ({ content: line, kind, at: stamp })),
            ...current
          ].slice(0, 5));
        }
      }).catch((failure) => {
        setResult({ ok: false, reason: failure instanceof Error ? failure.message : String(failure) });
      }).finally(() => {
        setBusy(false);
      });
      return;
    }
    void call("capture", { content, kind }).then((payload) => {
      setResult(payload);
      if (payload.ok) {
        setText("");
        setUndo({ path: payload.captured?.path ?? "", content, lineIndex: -1 });
        const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        setRecent((current) => [{ content, kind, at: stamp }, ...current].slice(0, 5));
      }
    }).catch((failure) => {
      setResult({
        ok: false,
        reason: failure instanceof Error ? failure.message : String(failure)
      });
    }).finally(() => {
      setBusy(false);
    });
  }
  function undoLast() {
    if (undo === null) return;
    setBusy(true);
    void call("inbox", { domain: "personal" }).then((list) => {
      const match = [...list.entries].reverse().find((entry) => entry.content === undo.content);
      if (match === void 0) throw new Error("\u627E\u4E0D\u5230\u521A\u5B58\u5165\u7684\u90A3\u4E00\u6761\uFF08\u53EF\u80FD\u5DF2\u88AB\u5904\u7406\uFF09");
      return call("deleteInbox", { domain: "personal", lineIndexes: [match.lineIndex] });
    }).then(() => {
      setResult({ ok: true, captured: { path: "\u5DF2\u64A4\u9500" } });
      setUndo(null);
    }).catch((failure) => {
      setResult({ ok: false, reason: failure instanceof Error ? failure.message : String(failure) });
    }).finally(() => {
      setBusy(false);
    });
  }
  return (0, import_react13.createElement)(
    "div",
    { className: "dmo-capture" },
    // 类型药丸：比下拉少一次点击，且五个类型常驻可见
    (0, import_react13.createElement)(
      "div",
      { className: "dmo-types", role: "group", "aria-label": "\u8BB0\u5F55\u7C7B\u578B" },
      KINDS.map((item) => (0, import_react13.createElement)(Chip, {
        key: item,
        label: item,
        active: kind === item,
        onClick: () => {
          setKind(item);
        }
      }))
    ),
    (0, import_react13.createElement)("textarea", {
      className: "dmo-textarea dmo-capture-input",
      placeholder: "\u4E00\u53E5\u8BDD\u8D76\u7D27\u5B58\u4E86\uFF08\u2318/Ctrl + Enter \u63D0\u4EA4\uFF09",
      value: text,
      "aria-label": "\u6355\u83B7\u5185\u5BB9",
      onChange: (event) => {
        setText(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" && (event.metaKey === true || event.ctrlKey === true)) {
          event.preventDefault();
          submit();
        }
      }
    }),
    (0, import_react13.createElement)(
      "div",
      { className: "dmo-capture-hint" },
      "\u2318/Ctrl + Enter \u5B58\u5165 \xB7 \u591A\u884C\u4F1A\u9010\u6761\u62C6\u5F00 \xB7 30 \u79D2\u5185\u53EF\u64A4\u9500"
    ),
    (0, import_react13.createElement)(
      "div",
      { className: "dmo-capture-foot" },
      (0, import_react13.createElement)(Button, {
        variant: "primary",
        disabled: busy || text.trim() === "",
        onClick: submit
      }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u8BB0\u4E00\u6761"),
      undo === null ? (0, import_react13.createElement)(
        "span",
        { className: "dmo-row-sub", style: { marginTop: 0 } },
        `${count(text.length)} \u5B57`
      ) : (0, import_react13.createElement)(Button, { small: true, disabled: busy, onClick: undoLast }, `\u64A4\u9500 ${seconds}s`)
    ),
    // 结果反馈：隐私拦截必须解释清楚「为什么拒」，并给脱敏后的可用文本
    result === null ? null : result.ok ? (0, import_react13.createElement)(
      "div",
      { className: "dmo-toast dmo-toast-ok", role: "status" },
      `\u5DF2\u5B58\u5165 ${orEmpty(result.captured?.path)}`
    ) : (0, import_react13.createElement)(
      "div",
      { className: "dmo-toast dmo-toast-err", role: "alert" },
      (0, import_react13.createElement)("div", null, orEmpty(result.reason)),
      result.blocked === true && result.masked !== void 0 ? (0, import_react13.createElement)(
        "div",
        { style: { marginTop: 6 } },
        (0, import_react13.createElement)("div", { className: "dmo-label" }, "\u8131\u654F\u540E\u53EF\u7528\uFF1A"),
        (0, import_react13.createElement)("div", { style: { wordBreak: "break-all" } }, truncate(result.masked, 120)),
        (0, import_react13.createElement)(
          "div",
          { style: { marginTop: 6 } },
          (0, import_react13.createElement)(Button, {
            small: true,
            onClick: () => {
              setText(result.masked ?? "");
            }
          }, "\u586B\u5165\u8131\u654F\u6587\u672C")
        )
      ) : null
    ),
    recent.length === 0 ? null : (0, import_react13.createElement)(
      "div",
      { style: { marginTop: 10 } },
      (0, import_react13.createElement)(
        "div",
        { className: "dmo-group-head" },
        (0, import_react13.createElement)("h3", { className: "dmo-group-title" }, "\u521A\u521A\u6355\u83B7"),
        (0, import_react13.createElement)("span", { className: "dmo-group-count" }, `${recent.length} \u6761`)
      ),
      recent.map((item, index) => (0, import_react13.createElement)(
        "div",
        { key: `${item.at}-${index}`, className: "dmo-recent-row" },
        (0, import_react13.createElement)("span", { className: "dmo-recent-main" }, truncate(item.content, 42)),
        (0, import_react13.createElement)("span", { className: "dmo-recent-time" }, `${item.kind} \xB7 ${item.at.slice(5)}`)
      ))
    ),
    (0, import_react13.createElement)(
      "div",
      { className: "dmo-note" },
      "\u6355\u83B7\u524D\u8FC7\u9690\u79C1\u95F8\u95E8\uFF1A\u5BC6\u94A5 / \u79C1\u94A5 / \u8EAB\u4EFD\u8BC1 / \u5185\u7F51 IP \u4F1A\u88AB\u62D2\u5199\u5E76\u7559\u5BA1\u8BA1\u3002"
    ),
    (0, import_react13.createElement)(
      "div",
      { className: "dmo-card-meta" },
      (0, import_react13.createElement)(Badge, { tone: "idle" }, "INBOX \u4E94\u5217"),
      (0, import_react13.createElement)(Badge, { tone: "idle" }, "\u539F\u5B50\u5199")
    )
  );
}

// packages/dsh-plugin/src/client/remember.ts
var import_react14 = require("react");

// packages/dsh-plugin/src/client/remember-logic.ts
var COMMAND_NAME = "remember";
var KINDS2 = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
var STORES = /* @__PURE__ */ new Map();
function rememberStoreOf(sessionId) {
  const existing = STORES.get(sessionId);
  if (existing !== void 0) return existing;
  let state2 = { open: false, content: "", toast: null };
  const listeners2 = /* @__PURE__ */ new Set();
  const store2 = {
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getSnapshot() {
      return state2;
    },
    set(next) {
      if (next.open === state2.open && next.content === state2.content && next.toast === state2.toast) return;
      state2 = next;
      for (const listener of listeners2) listener();
    }
  };
  STORES.set(sessionId, store2);
  return store2;
}
function openRememberDialog(sessionId, content = "") {
  const store2 = rememberStoreOf(sessionId);
  store2.set({ ...store2.getSnapshot(), open: true, content });
}
function closeRememberDialog(sessionId) {
  const store2 = rememberStoreOf(sessionId);
  store2.set({ ...store2.getSnapshot(), open: false, content: "" });
}
function setRememberToast(sessionId, toast) {
  const store2 = rememberStoreOf(sessionId);
  store2.set({ ...store2.getSnapshot(), toast });
}
function parseRememberLine(line) {
  const text = String(line ?? "").trim();
  const match = /^\/remember(?:\s+([\s\S]*))?$/.exec(text);
  if (match === null) return { matched: false, content: "" };
  return { matched: true, content: (match[1] ?? "").trim() };
}

// packages/dsh-plugin/src/client/remember.ts
var HANDLED = "handled";
function registerRemember(ctx) {
  const disposers = [];
  try {
    disposers.push(ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
      name: "conversation.input.overlay",
      id: "memory-ops-remember",
      order: 20,
      // 浮层是 session 作用域：宿主把 sessionId 传给 inject，
      // 返回的 hooks 会变成组件的 useXxx 钩子（与 dsh-context 同构）。
      inject: (sessionId) => ({
        hooks: { remember: rememberStoreOf(typeof sessionId === "string" && sessionId !== "" ? sessionId : "default") },
        warm: true
      })
    }, RememberOverlay)));
  } catch (error) {
    console.error("[memory-ops] /remember \u6D6E\u5C42\u6CE8\u518C\u5931\u8D25\uFF1A", error);
  }
  try {
    const dispose = ctx.inject(["inputTriggers"], (triggerCtx) => {
      const inputTriggers = triggerCtx.inputTriggers;
      if (inputTriggers === void 0 || typeof inputTriggers.registerSource !== "function") return;
      return inputTriggers.registerSource({
        trigger: "/",
        name: COMMAND_NAME,
        order: 40,
        async candidates(_session, req) {
          const query = String(req?.query ?? "").trim().toLowerCase();
          if (req?.position !== "leading") return [];
          if (query !== "" && !COMMAND_NAME.startsWith(query)) return [];
          return [{
            name: COMMAND_NAME,
            label: "/remember",
            description: "\u6253\u5F00\u8BB0\u5FC6\u5E93\u6355\u83B7\u5BF9\u8BDD\u6846\uFF0C\u628A\u4E00\u53E5\u8BDD\u5B58\u8FDB\u8BB0\u5F55\u6D41",
            section: "\u8BB0\u5FC6\u5E93"
          }];
        },
        onPick(pick) {
          openRememberDialog(pick.session?.sessionId ?? "default");
          return HANDLED;
        },
        async matchEnter(session, line, _signal, envelope) {
          const parsed = parseRememberLine(line);
          if (!parsed.matched) return void 0;
          if (envelope.attachments > 0) return void 0;
          openRememberDialog(session.sessionId ?? "default", parsed.content);
          return HANDLED;
        }
      });
    });
    if (typeof dispose === "function") disposers.push(dispose);
  } catch (error) {
    console.error("[memory-ops] /remember \u89E6\u53D1\u6E90\u6CE8\u518C\u5931\u8D25\uFF1A", error);
  }
  return () => {
    for (const dispose of disposers) dispose();
  };
}
function RememberOverlay(props) {
  const useRemember = props.useRemember;
  const state2 = typeof useRemember === "function" ? useRemember((snapshot) => snapshot) : { open: false, content: "", toast: null };
  const [text, setText] = (0, import_react14.useState)("");
  const [kind, setKind] = (0, import_react14.useState)("\u60F3\u6CD5");
  const [busy, setBusy] = (0, import_react14.useState)(false);
  const [error, setError] = (0, import_react14.useState)(null);
  const [blocked, setBlocked] = (0, import_react14.useState)(null);
  const inputRef = (0, import_react14.useRef)(null);
  const sessionId = typeof props.sessionId === "string" ? props.sessionId : "default";
  (0, import_react14.useEffect)(() => {
    if (!state2.open) return;
    setText(state2.content);
    setError(null);
    setBlocked(null);
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [state2.open, state2.content]);
  (0, import_react14.useEffect)(() => {
    if (state2.toast === null) return void 0;
    const timer = setTimeout(() => {
      setRememberToast(sessionId, null);
    }, 5e3);
    return () => {
      clearTimeout(timer);
    };
  }, [state2.toast, sessionId]);
  function close() {
    closeRememberDialog(sessionId);
  }
  function submit() {
    const content = text.trim();
    if (content === "" || busy) return;
    setBusy(true);
    setError(null);
    setBlocked(null);
    void call("capture", { content, kind }).then((result) => {
      if (result.ok) {
        closeRememberDialog(sessionId);
        setRememberToast(sessionId, {
          text: `\u5DF2\u5B58\u5165 ${orEmpty(result.captured?.path)}`,
          ok: true,
          savedContent: content,
          savedAt: Date.now()
        });
        return;
      }
      if (result.blocked === true) {
        setBlocked({ reason: result.reason ?? "\u7591\u4F3C\u654F\u611F\u4FE1\u606F", masked: result.masked ?? "" });
        return;
      }
      setError(result.reason ?? result.error ?? "\u672A\u77E5\u9519\u8BEF");
    }).catch((failure) => {
      setError(failure instanceof Error ? failure.message : String(failure));
    }).finally(() => {
      setBusy(false);
    });
  }
  function undo() {
    const saved = state2.toast?.savedContent ?? "";
    if (saved === "") return;
    setBusy(true);
    void call("inbox", { domain: "personal" }).then((list) => {
      const rows = list.entries ?? [];
      const target = [...rows].reverse().find((row) => row.content === saved);
      if (target === void 0) throw new Error("\u627E\u4E0D\u5230\u521A\u5B58\u5165\u7684\u90A3\u4E00\u6761\uFF08\u53EF\u80FD\u5DF2\u88AB\u5904\u7406\uFF09");
      return call("deleteInbox", { domain: "personal", lineIndexes: [target.lineIndex] });
    }).then(() => {
      setRememberToast(sessionId, { text: "\u5DF2\u64A4\u9500", ok: true });
    }).catch((failure) => {
      setRememberToast(sessionId, {
        text: `\u64A4\u9500\u5931\u8D25\uFF1A${failure instanceof Error ? failure.message : String(failure)}`,
        ok: false
      });
    }).finally(() => {
      setBusy(false);
    });
  }
  if (!state2.open) {
    if (state2.toast === null) return null;
    return (0, import_react14.createElement)(
      "div",
      {
        className: `dmo-remember-toast ${state2.toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
        role: "status",
        "aria-live": "polite"
      },
      (0, import_react14.createElement)("span", null, state2.toast.text),
      state2.toast.savedContent === void 0 ? null : (0, import_react14.createElement)("button", {
        type: "button",
        className: "dmo-remember-undo",
        disabled: busy,
        onClick: undo
      }, "\u64A4\u9500"),
      (0, import_react14.createElement)("button", {
        type: "button",
        className: "dmo-remember-dismiss",
        "aria-label": "\u5173\u95ED\u63D0\u793A",
        onClick: () => {
          setRememberToast(sessionId, null);
        }
      }, "\xD7")
    );
  }
  return (0, import_react14.createElement)(
    "div",
    {
      className: "dmo-remember-backdrop",
      // 点遮罩关闭；卡片内的点击不冒泡上来
      onClick: close,
      role: "presentation"
    },
    (0, import_react14.createElement)(
      "div",
      {
        className: "dmo-remember-card",
        role: "dialog",
        "aria-modal": "false",
        "aria-label": "\u5B58\u8FDB\u8BB0\u5FC6\u5E93",
        onClick: (event) => {
          event.stopPropagation();
        },
        onKeyDown: (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
          }
          if (event.key === "Enter" && (event.metaKey === true || event.ctrlKey === true)) {
            event.preventDefault();
            submit();
          }
        }
      },
      (0, import_react14.createElement)(
        "div",
        { className: "dmo-remember-head" },
        (0, import_react14.createElement)("span", { className: "dmo-remember-title" }, "\u5B58\u8FDB\u8BB0\u5FC6\u5E93"),
        (0, import_react14.createElement)("button", {
          type: "button",
          className: "dmo-remember-close",
          "aria-label": "\u5173\u95ED",
          onClick: close
        }, "\xD7")
      ),
      (0, import_react14.createElement)(
        "div",
        { className: "dmo-remember-body" },
        (0, import_react14.createElement)(
          "div",
          { className: "dmo-row" },
          (0, import_react14.createElement)("select", {
            className: "dmo-select",
            value: kind,
            "aria-label": "\u8BB0\u5F55\u7C7B\u578B",
            onChange: (event) => {
              setKind(event.target.value);
            }
          }, KINDS2.map((item) => (0, import_react14.createElement)("option", { key: item, value: item }, item)))
        ),
        (0, import_react14.createElement)("textarea", {
          ref: inputRef,
          className: "dmo-textarea dmo-remember-input",
          value: text,
          placeholder: "\u4E00\u53E5\u8BDD\u8D76\u7D27\u5B58\u4E86\uFF08\u2318/Ctrl + Enter \u63D0\u4EA4\uFF0CEsc \u53D6\u6D88\uFF09",
          "aria-label": "\u6355\u83B7\u5185\u5BB9",
          onChange: (event) => {
            setText(event.target.value);
          }
        }),
        // 隐私闸门：解释「为什么拒」并给脱敏后可用的文本
        blocked === null ? null : (0, import_react14.createElement)(
          "div",
          { className: "dmo-toast dmo-toast-err", role: "alert" },
          (0, import_react14.createElement)("div", null, blocked.reason),
          (0, import_react14.createElement)("div", { className: "dmo-label", style: { marginTop: 6 } }, "\u8131\u654F\u540E\u53EF\u7528\uFF1A"),
          (0, import_react14.createElement)("div", { style: { wordBreak: "break-all" } }, truncate(blocked.masked, 120)),
          (0, import_react14.createElement)(
            "div",
            { style: { marginTop: 6 } },
            (0, import_react14.createElement)(Button, {
              small: true,
              onClick: () => {
                setText(blocked.masked);
                setBlocked(null);
              }
            }, "\u586B\u5165\u8131\u654F\u6587\u672C")
          )
        ),
        error === null ? null : (0, import_react14.createElement)("div", { className: "dmo-toast dmo-toast-err", role: "alert" }, error),
        (0, import_react14.createElement)(
          "div",
          { className: "dmo-remember-foot" },
          (0, import_react14.createElement)(
            "span",
            { className: "dmo-row-sub", style: { marginTop: 0 } },
            "\u5B58\u5165\u540E\u53EF\u5728\u6D6E\u5C42\u91CC 30 \u79D2\u5185\u64A4\u9500"
          ),
          (0, import_react14.createElement)(
            "div",
            { className: "dmo-row", style: { flex: "0 0 auto" } },
            (0, import_react14.createElement)(Button, { onClick: close }, "\u53D6\u6D88"),
            (0, import_react14.createElement)(Button, {
              variant: "primary",
              disabled: busy || text.trim() === "",
              onClick: submit
            }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u4E00\u6761")
          )
        )
      )
    )
  );
}

// packages/dsh-plugin/src/client/register.ts
function safe(label, run) {
  try {
    const result = run();
    return typeof result === "function" ? result : () => {
    };
  } catch (error) {
    console.error(`[memory-ops] \u8868\u9762\u300C${label}\u300D\u6CE8\u518C\u5931\u8D25\uFF1A`, error);
    return () => {
    };
  }
}
function registerMemoryPanel(ctx) {
  const disposers = [];
  disposers.push(safe("sidebar.panellist", () => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 30,
    label: () => "\u8BB0\u5FC6\u5E93"
  }, PanelIcon))));
  disposers.push(safe("main", () => ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID,
    inject: () => ({ ctx })
  }, MemoryOpsPage))));
  return () => {
    for (const dispose of disposers) dispose();
  };
}
function registerSessionView(ctx) {
  let layoutService;
  const disposeWait = ctx.inject?.(["layout"], (child) => {
    const service = child.get?.("layout");
    if (service !== void 0 && typeof service.selectPanel === "function") layoutService = service;
    return () => {
      layoutService = void 0;
    };
  });
  const disposeView = safe("conversation.view", () => ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: PANEL_ID,
    order: 40,
    label: () => "\u8BB0\u5FC6",
    inject: () => ({
      ctx,
      onGotoMisses: () => {
        gotoPane(ctx, "misses", layoutService);
      }
    })
  }, SessionMemoryView)));
  return () => {
    disposeView();
    disposeWait?.();
  };
}
function registerCaptureTab(ctx) {
  const disposers = [];
  disposers.push(safe("sidebarRightTabs", () => {
    const service = ctx.get("sidebarRightTabs");
    if (service === void 0 || typeof service.register !== "function") return () => {
    };
    return service.register({
      id: PANEL_ID,
      kind: CAPTURE_KIND,
      title: () => "\u5FEB\u901F\u6355\u83B7",
      guide: [{
        id: "capture",
        order: 40,
        title: () => "\u5FEB\u901F\u6355\u83B7",
        description: () => "\u4E00\u53E5\u8BDD\u8D76\u7D27\u5B58\u4E86\uFF0C\u4E0D\u79BB\u5F00\u804A\u5929\u3002"
      }]
    });
  }));
  disposers.push(safe("sidebar.right.pane.tab", () => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: PANEL_ID,
    inject: () => ({ ctx })
  }, CapturePane))));
  disposers.push(safe("sidebar.right.pane.tab.title", () => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
    name: "sidebar.right.pane.tab.title",
    key: PANEL_ID
  }, () => (0, import_react15.createElement)("span", null, "\u5FEB\u901F\u6355\u83B7")))));
  return () => {
    for (const dispose of disposers) dispose();
  };
}
function registerRememberCommand(ctx) {
  return safe("inputTriggers + overlay", () => registerRemember(ctx));
}

// packages/dsh-plugin/src/client/styles.ts
var STYLE_ID = "dsh-memory-ops-style";
var CSS = `
.dmo-root { display: flex; flex-direction: column; height: 100%; min-height: 0; font-size: 13px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); }
.dmo-root * { box-sizing: border-box; }

/* \u2014\u2014 \u5B50\u5BFC\u822A\uFF085 \u5206\u533A\uFF09\u2014\u2014 */
.dmo-tabs { display: flex; gap: 2px; padding: 8px 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); flex: 0 0 auto; overflow-x: auto; }
.dmo-tab { appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 6px 9px; border-radius: 6px 6px 0 0; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; }
.dmo-tab:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dmo-tab[aria-selected="true"] { color: var(--dsw-alias-brand-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 600; }
.dmo-tab:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-tab-badge { display: inline-block; min-width: 15px; margin-left: 5px; padding: 0 4px; border-radius: 8px; font-size: 10px; line-height: 15px; text-align: center; background: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-bg-base); }

.dmo-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 10px; }
.dmo-body-flat { padding: 0; }

/* \u2014\u2014 KPI \u5E26 \u2014\u2014 */
.dmo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 6px; margin-bottom: 10px; }
.dmo-kpi { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 7px 8px; background: var(--dsw-alias-bg-layer-1); min-width: 0; }
.dmo-kpi-label { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-kpi-value { font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; margin-top: 1px; }
.dmo-kpi-note { font-size: 10px; color: var(--dsw-alias-label-secondary); }
.dmo-kpi-btn { appearance: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.dmo-kpi-btn:hover { border-color: var(--dsw-alias-border-l2); }
.dmo-kpi-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-kpi-more { float: right; font-size: 10px; color: var(--dsw-alias-brand-primary); font-weight: 600; }

/* \u2014\u2014 \u5E38\u9A7B\u524D\u7F00\u6784\u6210 \u2014\u2014 */
.dmo-resident-group { margin: 8px 0; }
.dmo-resident-head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.dmo-resident-row { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0 4px 8px; border-left: 2px solid var(--dsw-alias-border-l1); }
.dmo-resident-main { flex: 1 1 auto; min-width: 0; }
.dmo-link { color: var(--dsw-alias-brand-primary); cursor: pointer; }
.dmo-link:hover { text-decoration: underline; }

/* \u2014\u2014 \u5361\u7247 \u2014\u2014 */
.dmo-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 9px; margin-bottom: 7px; background: var(--dsw-alias-bg-layer-1); }
.dmo-card-title { font-size: 13px; font-weight: 600; line-height: 1.4; word-break: break-word; }
.dmo-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dmo-card-body { margin-top: 6px; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; word-break: break-word; }
.dmo-card-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }

/* \u2014\u2014 \u5FBD\u6807 \u2014\u2014 */
.dmo-badge { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 9px; font-size: 10px; font-weight: 600; line-height: 15px; white-space: nowrap; }
.dmo-badge-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-badge-warn { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dmo-badge-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent); color: var(--dsw-alias-state-error-primary); }
.dmo-badge-idle { background: color-mix(in srgb, var(--dsw-alias-state-idle-primary) 22%, transparent); color: var(--dsw-alias-label-secondary); }
.dmo-badge-brand { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent); color: var(--dsw-alias-brand-primary); }

/* \u2014\u2014 \u6309\u94AE \u2014\u2014 */
.dmo-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); border-radius: 6px; padding: 3px 9px; font-size: 12px; cursor: pointer; line-height: 1.5; }
.dmo-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dmo-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-btn:disabled { opacity: .45; cursor: not-allowed; }
.dmo-btn-primary { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); font-weight: 600; }
.dmo-btn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dmo-btn-sm { padding: 1px 6px; font-size: 11px; }

/* \u2014\u2014 \u8F93\u5165 \u2014\u2014 */
.dmo-input, .dmo-select, .dmo-textarea { width: 100%; font: inherit; font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 7px; }
.dmo-textarea { min-height: 70px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.5; }
.dmo-input:focus, .dmo-select:focus, .dmo-textarea:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary); }
.dmo-field { margin-bottom: 8px; }
.dmo-label { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary); margin-bottom: 3px; }
.dmo-row { display: flex; gap: 6px; align-items: center; }
/**
 * \u5355\u884C\u5DE5\u5177\u680F\uFF1A\u641C\u7D22\u6846 + \u82E5\u5E72\u7B5B\u9009\u4E0B\u62C9\u6324\u5728\u540C\u4E00\u884C\u3002
 *
 * \u4E3A\u4EC0\u4E48\u8981\u5355\u72EC\u4E00\u4E2A\u7C7B\uFF1A.dmo-select \u5E26 width:100%\uFF08\u8868\u5355\u91CC\u9700\u8981\u6491\u6EE1\uFF09\uFF0C
 * \u653E\u8FDB flex \u884C\u4F1A\u88AB\u5F53\u6210\u300C\u5360\u6EE1\u6574\u884C\u300D\u800C\u88AB\u8FEB\u6362\u884C\u2014\u2014\u5B9E\u6D4B\u8BB0\u5F55\u6D41\u5C31\u53D8\u6210\u4E86\u4E09\u884C\uFF1A
 * \u641C\u7D22 / \u72B6\u6001 / \u7C7B\u578B\u5404\u5360\u4E00\u884C\uFF0C\u767D\u5360 60px \u9AD8\u5EA6\u4E14\u5272\u88C2\u4E86\u300C\u8FD9\u4EE8\u662F\u540C\u4E00\u7EC4\u7B5B\u9009\u9879\u300D\u7684\u8BED\u4E49\u3002
 * \u8FD9\u91CC\u663E\u5F0F\u8986\u76D6\u6210 width:auto\uFF0C\u8BA9\u5B83\u4EEC\u771F\u6B63\u5E76\u6392\u3002
 *
 * \u26A0\uFE0F \u6CE8\u610F\uFF1A\u672C\u6587\u4EF6\u6574\u4F53\u662F\u6A21\u677F\u5B57\u7B26\u4E32\uFF0C\u6CE8\u91CA\u91CC**\u4E0D\u80FD\u51FA\u73B0\u53CD\u5F15\u53F7**\uFF0C
 * \u5426\u5219\u4F1A\u63D0\u524D\u95ED\u5408\u5B57\u7B26\u4E32\u3001\u628A\u540E\u9762\u7684 CSS \u53D8\u6210\u4EE3\u7801\u3002\u8FD9\u4E2A\u5751\u521A\u8E29\u8FC7\u4E00\u6B21\u3002
 */
.dmo-toolbar { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
.dmo-toolbar > .dmo-select { width: auto; flex: 0 0 auto; }
.dmo-toolbar > .dmo-input { flex: 1 1 90px; min-width: 0; }
/* \u7A84\u5C4F\uFF08\u4FA7\u680F 400px \u5DE6\u53F3\uFF09\u653E\u4E0D\u4E0B\u5C31\u5141\u8BB8\u6362\u884C\uFF0C\u4F46\u6BCF\u9879\u5404\u81EA\u4FDD\u6301\u7D27\u51D1 */
@media (max-width: 520px) {
  .dmo-toolbar { flex-wrap: wrap; }
  .dmo-toolbar > .dmo-input { flex: 1 1 100%; }
}
.dmo-row > * { min-width: 0; }

/* \u2014\u2014 \u5217\u8868\u884C \u2014\u2014 */
.dmo-row-item { display: flex; gap: 7px; align-items: flex-start; padding: 6px 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-row-item:last-child { border-bottom: 0; }
.dmo-row-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text { font-size: 12px; line-height: 1.5; word-break: break-word; }
.dmo-row-sub { font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
.dmo-check { flex: 0 0 auto; margin-top: 3px; accent-color: var(--dsw-alias-brand-primary); }

/* \u2014\u2014 \u72B6\u6001\u5757 \u2014\u2014 */
.dmo-empty { padding: 22px 10px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.7; }
.dmo-empty-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); margin-bottom: 4px; }
.dmo-error { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; padding: 9px 10px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }
.dmo-degrade { border-left: 3px solid var(--dsw-alias-state-warn-primary); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent); padding: 6px 9px; border-radius: 4px; font-size: 11.5px; line-height: 1.55; margin-bottom: 8px; }
.dmo-note { font-size: 11px; color: var(--dsw-alias-label-secondary); line-height: 1.55; margin: 6px 0; }
.dmo-skeleton { height: 52px; border-radius: 8px; margin-bottom: 7px; background: linear-gradient(90deg, var(--dsw-alias-bg-layer-1) 25%, var(--dsw-alias-bg-layer-2) 37%, var(--dsw-alias-bg-layer-1) 63%); background-size: 400% 100%; animation: dmo-shimmer 1.3s ease-in-out infinite; }
@keyframes dmo-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .dmo-skeleton { animation: none; } }

/* \u2014\u2014 \u9884\u7B97\u8D26\u672C \u2014\u2014 */
.dmo-budget { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 9px; margin-bottom: 8px; background: var(--dsw-alias-bg-layer-1); }
.dmo-budget-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11.5px; }
.dmo-budget-name { flex: 0 0 58px; color: var(--dsw-alias-label-secondary); }
.dmo-budget-bar { flex: 1 1 auto; height: 5px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dmo-budget-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-brand-primary); }
.dmo-budget-fill-over { background: var(--dsw-alias-state-warn-primary); }
.dmo-budget-num { flex: 0 0 auto; font-variant-numeric: tabular-nums; font-weight: 600; }
/* \u9884\u7B97\u8D26\u672C\u6BCF\u6BB5\uFF1A\u6807\u9898\u884C + \u8FDB\u5EA6\u6761 + \u8BF4\u660E */
.dmo-budget-item { padding: 7px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-budget-item:last-child { border-bottom: 0; padding-bottom: 0; }
.dmo-budget-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }

/* \u2014\u2014 \u7F6E\u4FE1\u5EA6 stepper \u2014\u2014 */
.dmo-stepper { display: flex; align-items: center; gap: 3px; margin: 7px 0; }
.dmo-step { flex: 1 1 0; height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-layer-2); }
.dmo-step-on { background: var(--dsw-alias-state-success-primary); }
.dmo-step-now { background: var(--dsw-alias-brand-primary); }

/* \u2014\u2014 \u8BC1\u636E\u94FE \u2014\u2014 */
.dmo-evidence { border-left: 2px solid var(--dsw-alias-border-l2); padding-left: 8px; margin: 5px 0; font-size: 11.5px; line-height: 1.55; }
.dmo-evidence-src { color: var(--dsw-alias-label-secondary); font-size: 10.5px; }

/* \u2014\u2014 \u53F3\u4FA7\u680F\u6355\u83B7 \u2014\u2014 */
.dmo-capture { display: flex; flex-direction: column; gap: 7px; padding: 10px; }
.dmo-capture-input { min-height: 62px; }
.dmo-capture-foot { display: flex; gap: 6px; align-items: center; justify-content: space-between; }
.dmo-toast { font-size: 11.5px; line-height: 1.5; padding: 6px 8px; border-radius: 6px; }
.dmo-toast-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-toast-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent); color: var(--dsw-alias-state-error-primary); }

/* \u2014\u2014 \u4F1A\u8BDD\u8BB0\u5FC6 tab \u2014\u2014 */
.dmo-session { padding: 12px; display: flex; flex-direction: column; gap: 9px; }
.dmo-session-kpis { display: flex; gap: 6px; }
.dmo-session-kpi { flex: 1 1 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px; text-align: center; background: var(--dsw-alias-bg-layer-1); }
.dmo-session-kpi b { display: block; font-size: 17px; font-variant-numeric: tabular-nums; }
.dmo-session-kpi span { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }

/* \u2014\u2014 \u672A\u547D\u4E2D\u6D41\u6C34\u7EBF \u2014\u2014 */
.dmo-lane { margin-bottom: 9px; }
.dmo-lane-head { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; margin-bottom: 4px; }
.dmo-lane-count { font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-weight: 400; }

/* \u2014\u2014 /remember \u5F39\u7A97\uFF08\u6D6E\u5728\u8F93\u5165\u6846\u5361\u7247\u5185\uFF09\u2014\u2014 */
.dmo-remember-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
}
.dmo-remember-card {
  width: min(480px, 100% - 32px);
  max-height: min(78vh, 620px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0, 0, 0, 0.4));
  font-size: 13px;
}
.dmo-remember-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.dmo-remember-title { font-size: 14px; font-weight: 600; }
.dmo-remember-close {
  margin-left: auto;
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.dmo-remember-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.dmo-remember-close:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-remember-body { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; }
.dmo-remember-input { min-height: 96px; }
.dmo-remember-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }

/* \u4FDD\u5B58\u63D0\u793A\uFF1A\u6D6E\u5C42\u5173\u95ED\u540E\u77ED\u6682\u51FA\u73B0\uFF0C\u5E26\u64A4\u9500 */
.dmo-remember-toast {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  z-index: 190;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: var(--dsw-shadow-lv2, 0 4px 14px rgba(0, 0, 0, 0.28));
  max-width: min(560px, calc(100vw - 32px));
}
.dmo-remember-undo {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.dmo-remember-undo:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dmo-remember-undo:disabled { opacity: .45; cursor: not-allowed; }
.dmo-remember-dismiss {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
  font-family: inherit;
}
.dmo-remember-dismiss:hover { color: var(--dsw-alias-label-primary); }

/* \u2014\u2014 \u4FA7\u680F\u56FE\u6807 \u2014\u2014 */
.dmo-icon { display: block; }
/* ============================================================
 * v3.5 \u8865\u9F50\u8BBE\u8BA1\u7A3F\u7684\u89C6\u89C9\u4EF6
 * \u8BBE\u8BA1\u7A3F plugin-v3.html \u91CC\u8FD9\u4E9B\u7EC4\u4EF6\u90FD\u6709\uFF0C\u5B9E\u73B0\u4E00\u76F4\u7F3A\uFF1B
 * \u540D\u5B57\u6CBF\u7528\u8BBE\u8BA1\u7A3F\u7684\u8BED\u4E49\uFF08chip / band / tag / anchor-note\uFF09\uFF0C
 * \u4F46\u503C\u4E00\u5F8B\u7528\u5BBF\u4E3B token\uFF0C\u4E0D\u5199\u6B7B\u989C\u8272\u3002
 * ============================================================ */

/* \u2014\u2014 \u72B6\u6001\u7B5B\u9009\u836F\u4E38\uFF08\u8BB0\u5FC6\u5206\u533A\uFF09\u2014\u2014 */
.dmo-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.dmo-chip {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-secondary);
  border-radius: 12px; padding: 2px 9px; font: inherit; font-size: 11.5px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px; line-height: 1.6;
}
.dmo-chip:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dmo-chip[aria-pressed="true"] {
  background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base); font-weight: 600;
}
.dmo-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-chip-num { font-variant-numeric: tabular-nums; opacity: .8; }

/* \u2014\u2014 \u4E94\u6001\u8BA1\u6570\u6761\uFF08\u672A\u547D\u4E2D\uFF09\u2014\u2014 */
.dmo-band { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 9px; }
.dmo-band-cell {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
  padding: 6px 4px; text-align: center; background: var(--dsw-alias-bg-layer-1); min-width: 0;
}
.dmo-band-cell[data-active="true"] { border-color: var(--dsw-alias-brand-primary); }
.dmo-band-v { font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
.dmo-band-l { font-size: 10px; color: var(--dsw-alias-label-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-band-cell[data-tone="warn"] .dmo-band-v { color: var(--dsw-alias-state-warn-primary); }
.dmo-band-cell[data-tone="ok"] .dmo-band-v { color: var(--dsw-alias-state-success-primary); }

/* \u2014\u2014 \u5206\u7EC4\u5BB9\u5668\uFF08\u672C\u9879\u76EE / \u672A\u547D\u4E2D\uFF09\u2014\u2014 */
.dmo-group { margin-bottom: 11px; }
.dmo-group-head { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.dmo-group-title { font-size: 12px; font-weight: 600; margin: 0; }
.dmo-group-count { font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-weight: 400; }

/* \u2014\u2014 \u76F4\u89D2\u5C0F\u7B7E\uFF08\u8BBE\u8BA1\u7A3F\u7684 tag\uFF0C\u4E0E\u5706\u89D2 badge \u533A\u5206\uFF09\u2014\u2014 */
.dmo-tag {
  display: inline-flex; align-items: center; gap: 3px; padding: 0 5px;
  border-radius: 4px; font-size: 10px; font-weight: 600; line-height: 15px;
  border: 1px solid currentColor; white-space: nowrap; opacity: .95;
}
.dmo-tag-fact { color: var(--dsw-alias-state-success-primary); }
.dmo-tag-infer { color: var(--dsw-alias-state-warn-primary); }
.dmo-tag-mute { color: var(--dsw-alias-label-secondary); }

/* \u2014\u2014 \u951A\u70B9\u72B6\u6001\u6761\uFF08\u8BE6\u60C5\u9875\uFF09\u2014\u2014 */
.dmo-anchor-note {
  display: flex; gap: 6px; align-items: flex-start;
  padding: 6px 9px; border-radius: 6px; font-size: 11.5px; line-height: 1.55;
  margin: 6px 0;
}
.dmo-anchor-note[data-state="stale"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border-left: 3px solid var(--dsw-alias-state-warn-primary);
}
.dmo-anchor-note[data-state="fresh"] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent);
  border-left: 3px solid var(--dsw-alias-state-success-primary);
}
.dmo-anchor-note code, .dmo-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; }

/* \u2014\u2014 \u8BC1\u636E\u5F15\u6587\uFF08\u8BBE\u8BA1\u7A3F\u7528 <q> \u81EA\u52A8\u52A0\u300C\u300D\uFF09\u2014\u2014 */
.dmo-quote { margin: 0; font-size: 11.5px; line-height: 1.55; }
.dmo-quote::before { content: "\u300C"; }
.dmo-quote::after { content: "\u300D"; }

/* \u2014\u2014 \u8BB0\u5F55\u6D41\u5E38\u9A7B\u6355\u83B7\u6846 \u2014\u2014 */
.dmo-capture-inline { margin-bottom: 9px; }
.dmo-capture-inline .dmo-textarea { min-height: 46px; }
.dmo-capture-hint { font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-top: 3px; }

/* \u2014\u2014 \u6279\u91CF\u64CD\u4F5C\u9AD8\u4EAE\u6761\uFF08\u8BBE\u8BA1\u7A3F bulk\uFF09\u2014\u2014 */
.dmo-bulk {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 6px 8px; margin-bottom: 8px; border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}

/* \u2014\u2014 \u300C\u521A\u521A\u6355\u83B7\u300D\u7D27\u51D1\u5217\u8868\uFF08\u5FEB\u901F\u6355\u83B7\uFF09\u2014\u2014 */
.dmo-recent-row {
  display: flex; align-items: baseline; gap: 6px;
  padding: 4px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px;
}
.dmo-recent-row:last-child { border-bottom: 0; }
.dmo-recent-main { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dmo-recent-time { flex: 0 0 auto; font-size: 10px; color: var(--dsw-alias-label-secondary); }

/* \u2014\u2014 \u7C7B\u578B chips\uFF08\u5FEB\u901F\u6355\u83B7\uFF0C\u66FF\u4EE3\u4E0B\u62C9\uFF09\u2014\u2014 */
.dmo-types { display: flex; flex-wrap: wrap; gap: 4px; }

`;
function installStyles() {
  if (typeof document === "undefined") return () => {
  };
  const existing = document.getElementById(STYLE_ID);
  if (existing !== null) return () => {
  };
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
  return () => {
    style.remove();
  };
}

// packages/dsh-plugin/src/client/index.ts
var inject = ["slots"];
function apply(ctx) {
  const disposers = [];
  disposers.push(installStyles());
  disposers.push(registerMemoryPanel(ctx));
  disposers.push(registerSessionView(ctx));
  disposers.push(registerCaptureTab(ctx));
  disposers.push(registerRememberCommand(ctx));
  ctx.effect(() => () => {
    for (const dispose of disposers) dispose();
  }, "dsh-memory-ops: 4 surfaces");
}

    })(module, exports, require);
    return module.exports;
  },
});
