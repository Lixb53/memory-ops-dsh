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

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/register.ts
var import_react15 = require("react");

// src/client/pane-nav.ts
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

// src/client/panel.ts
var import_react11 = require("react");

// src/client/ui.ts
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
function count(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY;
  return value.toLocaleString("zh-CN");
}
function tag(text, tone = "") {
  return h("span", {
    className: "dmo-tag",
    "data-tone": tone === "" ? void 0 : tone
  }, text);
}
function SectionHead({ title, count: count2, action }) {
  return h(
    "div",
    { className: "dmo-section-head" },
    h("h2", { className: "dmo-section-title" }, title),
    count2 === void 0 ? null : h("span", { className: "dmo-section-count" }, count2),
    action === void 0 ? null : h("span", { style: { marginLeft: "auto" } }, action)
  );
}
function PaneHead({ pageName, lede, ledeSub }) {
  return h(
    "div",
    null,
    pageName === void 0 ? null : h("h1", { className: "dmo-page-name" }, pageName),
    h("p", { className: "dmo-lede" }, lede),
    ledeSub === void 0 ? null : h("p", { className: "dmo-lede-sub" }, ledeSub)
  );
}
function Primary({ children, onClick, disabled, small, attrs }) {
  return h("button", {
    type: "button",
    className: `dmo-btn dmo-btn-primary${small === true ? " dmo-btn-sm" : ""}`,
    onClick: disabled === true ? void 0 : onClick,
    disabled,
    ...attrs ?? {}
  }, children);
}
function Btn({ children, onClick, disabled, small, quiet, attrs }) {
  const cls = ["dmo-btn"];
  if (small === true) cls.push("dmo-btn-sm");
  if (quiet === true) cls.push("dmo-btn-quiet");
  return h("button", {
    type: "button",
    className: cls.join(" "),
    onClick: disabled === true ? void 0 : onClick,
    disabled,
    ...attrs ?? {}
  }, children);
}
function TextLink({ children, onClick, attrs }) {
  return h("button", {
    type: "button",
    className: "dmo-textlink",
    onClick,
    ...attrs ?? {}
  }, children);
}
function EmptyState({ title, body, actions }) {
  return h(
    "div",
    { className: "dmo-empty" },
    h("p", { className: "dmo-empty-title" }, title),
    h("p", { className: "dmo-empty-body" }, body),
    actions === void 0 ? null : h("div", { className: "dmo-empty-actions" }, actions)
  );
}
function ErrorAlert({ title, body, actions }) {
  return h(
    "div",
    { className: "dmo-alert", role: "alert" },
    h("p", { className: "dmo-alert-title" }, title),
    h("p", { className: "dmo-alert-body" }, body),
    actions === void 0 ? null : h("div", { className: "dmo-alert-actions" }, actions)
  );
}
function Notice({ title, text, tone }) {
  return h(
    "div",
    { className: "dmo-notice", "data-tone": tone },
    h("p", { className: "dmo-notice-title" }, title),
    h("p", { className: "dmo-notice-text" }, text)
  );
}
function InlineDone({ ok, text, onUndo }) {
  return h(
    "div",
    { className: "dmo-inline-done", "data-tone": ok ? "ok" : "err", role: "status" },
    h("span", { className: "dmo-inline-done-text" }, text),
    onUndo === void 0 ? null : TextLink({ children: "\u64A4\u9500", onClick: onUndo })
  );
}
function SkeletonRows({ rows = 3, height = 52 }) {
  return h(
    "div",
    { "aria-busy": "true", "aria-live": "polite" },
    Array.from({ length: rows }, (_, i) => h("div", { key: i, className: "dmo-skeleton", style: { height } }))
  );
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
      { style: { marginTop: "var(--s2)" } },
      h(Button, { onClick: onRetry, small: true }, "\u91CD\u8BD5")
    )
  );
}
function Skeleton({ rows = 3, height = 52 }) {
  return SkeletonRows({ rows, height });
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
    { style: { marginTop: "var(--s2)" } },
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
function AnchorNote({ state: state2, children }) {
  return h("div", { className: "dmo-anchor-note", "data-state": state2, role: "note" }, children);
}

// src/client/session-context.ts
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

// src/client/panes/today.ts
var import_react5 = require("react");

// src/client/api.ts
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

// src/client/data.ts
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

// src/client/panes/today.ts
function hintOf(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/密钥|私钥|身份证|内网 IP|拒写/.test(message)) {
    return "\u660E\u6587 Markdown \u4E0D\u80FD\u5B58\u5BC6\u94A5\u3002\u53EF\u4EE5\u7528\u8131\u654F\u7248\u672C\u91CD\u5B58\u3002";
  }
  if (/写锁超时|EEXIST/.test(message)) {
    return "\u53E6\u4E00\u4E2A\u8FDB\u7A0B\u6B63\u5728\u5199\u540C\u4E00\u4E2A\u6587\u4EF6\uFF0C\u7B49\u4E00\u4E24\u79D2\u518D\u8BD5\u3002";
  }
  return "\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u8FD9\u662F\u8BFB\u53D6\u6216\u5199\u5165\u95EE\u9898\u3002";
}
function pickSuggestion(queue, fillable, openInbox, entryCount) {
  if (queue.length > 0) {
    const first = queue[0];
    const conf = first.confidence === null ? "\u672A\u6807" : first.confidence.toFixed(1);
    return {
      label: "\u5EFA\u8BAE\u5148\u505A\u8FD9\u4E00\u4EF6",
      title: "\u6709\u4E00\u6761\u63A8\u65AD\u7B49\u4F60\u62CD\u677F",
      body: `\u300C${truncate(first.title, 24)}\u300D\u2014\u2014\u7F6E\u4FE1\u5EA6 ${conf}\u3002\u786E\u8BA4\u540E\u5B83\u4F1A\u53C2\u4E0E\u540E\u7EED\u4F1A\u8BDD\uFF1B\u4E0D\u786E\u5B9A\u5C31\u9A73\u56DE\uFF0C\u5E76\u5199\u4E00\u53E5\u4E3A\u4EC0\u4E48\u3002`,
      primaryText: "\u786E\u8BA4\u8FD9\u6761",
      // v6 修复：core 的 confirm/detail 要的是 path（personal/principles.md），
      // 不是点分 id（personal.principles）——早先前传 first.id，点了必 ENOENT。
      primary: { action: "confirm", path: first.path },
      secondary: { action: "open-detail", path: first.path, text: "\u5148\u770B\u5168\u6587" }
    };
  }
  if (fillable > 0) {
    return {
      label: "\u5EFA\u8BAE\u5148\u505A\u8FD9\u4E00\u4EF6",
      title: "\u8865\u4E00\u6761\u641C\u4E0D\u5230\u7684\u4E1C\u897F",
      body: `\u6709 ${fillable} \u4E2A\u95EE\u9898\u88AB\u53CD\u590D\u95EE\u5230\uFF0C\u5E93\u91CC\u8FD8\u6CA1\u6709\u7B54\u6848\u3002`,
      primaryText: "\u53BB\u8865\u5E93",
      primary: { action: "goto", pane: "todo" },
      secondary: { action: "goto", pane: "todo", text: "\u770B\u660E\u7EC6" }
    };
  }
  if (openInbox > 0) {
    return {
      label: "\u5EFA\u8BAE\u5148\u505A\u8FD9\u4E00\u4EF6",
      title: "\u8BB0\u5F55\u6D41\u91CC\u8FD8\u6709\u6CA1\u7ED3\u7684\u4E8B",
      body: `${openInbox} \u6761\u6CA1\u7ED3\u3002\u505A\u5B8C\u6807\u5B8C\u6210\uFF0C\u4E0D\u505A\u5C31\u4E22\u6389\u2014\u2014\u7559\u7740\u4F1A\u8BA9\u300C\u5F85\u529E\u300D\u5931\u53BB\u610F\u4E49\u3002`,
      primaryText: "\u53BB\u5904\u7406",
      primary: { action: "goto", pane: "todo" },
      secondary: { action: "goto", pane: "capture", text: "\u8BB0\u65B0\u7684" }
    };
  }
  return {
    label: "\u73B0\u5728\u6CA1\u6709\u5F85\u529E",
    title: "\u5E93\u91CC\u4E00\u5207\u90FD\u5904\u7406\u5B8C\u4E86",
    body: `${entryCount} \u6761\u8BB0\u5FC6\u30010 \u6761\u5F85\u529E\u3002\u8FD9\u65F6\u5019\u6700\u6709\u7528\u7684\u4E8B\u662F\u770B\u770B\u6709\u6CA1\u6709\u8BE5\u9000\u5F79\u7684\uFF0C\u6216\u8005\u8BB0\u4E0B\u4ECA\u5929\u7684\u4E00\u4E2A\u7ED3\u8BBA\u3002`,
    primaryText: "\u770B\u770B\u5E93\u91CC\u6709\u4EC0\u4E48",
    primary: { action: "goto", pane: "memory" },
    secondary: { action: "goto", pane: "capture", text: "\u8BB0\u4E00\u6761" }
  };
}
function trailLine(value, text, pane, onGoto) {
  return h(
    "button",
    {
      key: text,
      type: "button",
      className: "dmo-trail-line",
      onClick: () => {
        onGoto(pane);
      }
    },
    h("span", { className: "dmo-trail-num" }, String(value)),
    h("span", { className: "dmo-trail-text" }, text)
  );
}
function TodayPane({ ctx, onOpenDetail }) {
  const { cwd, project } = useSessionProject(ctx);
  const snapshot = useBridge("snapshot", scopeBody(cwd, project), [cwd, project]);
  const inbox = useBridge("inbox", { domain: "personal" });
  const misses = useBridge("misses", {});
  const [captureText, setCaptureText] = (0, import_react5.useState)("");
  const [captureKind] = (0, import_react5.useState)("\u60F3\u6CD5");
  const [lastCapture, setLastCapture] = (0, import_react5.useState)(null);
  const [feedback, setFeedback] = (0, import_react5.useState)(null);
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [suggestFeedback, setSuggestFeedback] = (0, import_react5.useState)(null);
  function submitCapture() {
    const text = captureText.trim();
    if (text === "" || busy) return;
    setBusy(true);
    void call("capture", { content: text, kind: captureKind }).then((result) => {
      if (result.ok) {
        setLastCapture({ content: text });
        setCaptureText("");
        setFeedback({ ok: true, text: "\u5DF2\u5B58\u5165\u8BB0\u5F55\u6D41" });
        inbox.reload();
        snapshot.reload();
        misses.reload();
      } else {
        setFeedback({ ok: false, text: result.reason ?? "\u6CA1\u5B58\u4E0A" });
      }
    }).catch((error) => {
      setFeedback({ ok: false, text: `${error instanceof Error ? error.message : String(error)}` });
    }).finally(() => {
      setBusy(false);
    });
  }
  function undoCapture() {
    if (lastCapture === null || busy) return;
    setBusy(true);
    void call("inbox", { domain: "personal" }).then((list) => {
      const match = [...list.entries].reverse().find((entry) => entry.content === lastCapture.content);
      if (match === void 0) throw new Error("\u627E\u4E0D\u5230\u521A\u5B58\u5165\u7684\u90A3\u4E00\u6761\uFF08\u53EF\u80FD\u5DF2\u88AB\u5904\u7406\uFF09");
      return call("deleteInbox", { domain: "personal", lineIndexes: [match.lineIndex] });
    }).then(() => {
      setLastCapture(null);
      setFeedback({ ok: true, text: "\u5DF2\u64A4\u9500" });
      inbox.reload();
      snapshot.reload();
    }).catch((error) => {
      setFeedback({ ok: false, text: `${error instanceof Error ? error.message : String(error)}` });
    }).finally(() => {
      setBusy(false);
    });
  }
  function confirmEntry(path) {
    setBusy(true);
    void call("confirm", { path }).then(() => {
      const remaining = snapshot.data?.queue.filter((item) => item.id !== path).length ?? 0;
      setSuggestFeedback({
        ok: true,
        text: "\u5DF2\u786E\u8BA4" + (remaining > 0 ? ` \xB7 \u8FD8\u5269 ${remaining} \u6761\u5F85\u62CD\u677F` : " \xB7 \u5F85\u62CD\u677F\u6E05\u7A7A\u4E86")
      });
      snapshot.reload();
    }).catch((error) => {
      setSuggestFeedback({ ok: false, text: hintOf(error) });
    }).finally(() => {
      setBusy(false);
    });
  }
  const entries = snapshot.data?.entries ?? [];
  const queue = snapshot.data?.queue ?? [];
  const openInbox = (inbox.data?.entries ?? []).filter((row) => row.state === "open" || row.state === "todo").length;
  const fillable = misses.data?.counts?.["should-fill"] ?? 0;
  const todoTotal = queue.length + openInbox + fillable;
  const isEmpty = snapshot.data !== void 0 && entries.length === 0;
  const onGoto = (pane) => {
    gotoPane(ctx, pane);
  };
  if (snapshot.phase === "loading") {
    return (0, import_react5.createElement)(
      "div",
      null,
      SkeletonRows({ rows: 1, height: 28 }),
      SkeletonRows({ rows: 1, height: 22 }),
      SkeletonRows({ rows: 2, height: 96 })
    );
  }
  if (snapshot.phase === "error") {
    return (0, import_react5.createElement)(
      "div",
      null,
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u8BB0\u5FC6\u5E93",
        body: "\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u8FD9\u662F\u8BFB\u53D6\u95EE\u9898\u3002\u5148\u91CD\u8BD5\uFF1B\u5982\u679C\u4E00\u76F4\u5931\u8D25\uFF0C\u53BB\u300C\u5E93\u5065\u5EB7\u300D\u770B\u5E93\u6839\u76EE\u5F55\u8FD8\u5728\u4E0D\u5728\u3002",
        actions: [
          Primary({ children: "\u91CD\u8BD5", onClick: snapshot.reload, attrs: { "data-action": "retry" } }),
          Btn({ children: "\u53BB\u5E93\u5065\u5EB7", onClick: () => {
            onGoto("health");
          }, attrs: { "data-action": "goto", "data-pane": "health" } })
        ]
      })
    );
  }
  if (isEmpty) {
    return (0, import_react5.createElement)(
      "div",
      { className: "dmo-pane" },
      PaneHead({ lede: "\u8FD9\u662F\u4F60\u7684\u7B2C\u4E00\u6761\u8BB0\u5FC6", ledeSub: "\u5199\u4E00\u53E5\u4F60\u4ECA\u5929\u60F3\u8BB0\u4F4F\u7684\u8BDD\uFF0Cagent \u4E0B\u6B21\u5C31\u4F1A\u7528\u4E0A\u5B83\u3002" }),
      (0, import_react5.createElement)(
        "div",
        { className: "dmo-capture" },
        (0, import_react5.createElement)("textarea", {
          className: "dmo-capture-input",
          "data-field": "captureText",
          "aria-label": "\u8BB0\u4E00\u6761",
          placeholder: "\u4E00\u53E5\u8BDD\u8D76\u7D27\u5B58\u4E86\u2026",
          value: captureText,
          onChange: (event) => {
            setCaptureText(event.target.value);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.ctrlKey === true || event.metaKey === true)) {
              event.preventDefault();
              submitCapture();
            }
          }
        }),
        (0, import_react5.createElement)(
          "div",
          { className: "dmo-capture-foot" },
          Primary({
            children: busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u8FDB\u53BB",
            onClick: submitCapture,
            disabled: busy || captureText.trim() === "",
            attrs: { "data-action": "capture" }
          }),
          h("span", { className: "dmo-capture-hint" }, "Ctrl / \u2318 + Enter")
        ),
        feedback === null ? null : InlineDone({
          ok: feedback.ok,
          text: feedback.text,
          onUndo: lastCapture === null ? void 0 : undoCapture
        })
      ),
      lastCapture === null ? null : (0, import_react5.createElement)(
        "div",
        { style: { marginTop: "var(--s2)" } },
        Btn({ children: "\u64A4\u9500\u521A\u624D\u90A3\u6761", onClick: undoCapture, disabled: busy, attrs: { "data-action": "undo-capture" } })
      )
    );
  }
  const lede = todoTotal === 0 ? `\u6CA1\u6709\u5F85\u529E\u3002\u5E93\u91CC ${count(entries.length)} \u6761\uFF0C\u8BB0\u5F55\u6D41 ${count(inbox.data?.throughput.total ?? 0)} \u6761` : `\u6709 ${count(todoTotal)} \u4EF6\u4E8B\u538B\u7740\uFF0C\u5148\u4ECE\u6700\u4E0A\u9762\u90A3\u4EF6\u5F00\u59CB`;
  const sug = pickSuggestion(queue, fillable, openInbox, entries.length);
  const tape = (0, import_react5.createElement)(
    "div",
    { className: "dmo-trail", role: "group", "aria-label": "\u5168\u5C40\u6307\u6807" },
    trailLine(todoTotal, "\u4EF6\u4E8B\u538B\u7740", "todo", onGoto),
    trailLine(misses.data?.total ?? 0, "\u641C\u4E0D\u5230", "todo", onGoto),
    trailLine(entries.length, "\u6761\u8BB0\u5FC6", "memory", onGoto),
    trailLine(
      snapshot.data?.stats.layers.l0.tokens ?? 0,
      "tokens \u7D22\u5F15",
      "health",
      onGoto
    )
  );
  return (0, import_react5.createElement)(
    "div",
    { className: "dmo-pane" },
    tape,
    PaneHead({ lede, ledeSub: "\u8FD9\u4E2A\u9762\u677F\u53EA\u56DE\u7B54\u4E00\u4E2A\u95EE\u9898\uFF1A\u4F60\u73B0\u5728\u8BE5\u505A\u54EA\u4EF6\u4E8B\u3002\u5176\u4F59\u90FD\u6536\u5728\u4E0B\u9762\u3002" }),
    (0, import_react5.createElement)(
      "div",
      { className: "dmo-suggest" },
      h("p", { className: "dmo-suggest-label" }, sug.label),
      h("h2", { className: "dmo-suggest-title" }, sug.title),
      h("p", { className: "dmo-suggest-body" }, sug.body),
      (0, import_react5.createElement)(
        "div",
        { className: "dmo-suggest-actions" },
        Primary({
          children: sug.primaryText,
          onClick: () => {
            if (sug.primary.action === "confirm" && sug.primary.path !== void 0) confirmEntry(sug.primary.path);
            else if (sug.primary.pane !== void 0) onGoto(sug.primary.pane);
          },
          disabled: busy,
          attrs: { "data-action": sug.primary.action === "confirm" ? "suggest-confirm" : "goto", "data-path": sug.primary.path ?? "" }
        }),
        (() => {
          const sec = sug.secondary;
          if (sec === void 0) return null;
          if (sec.action === "open-detail") {
            return Btn({
              children: sec.text,
              quiet: true,
              onClick: () => {
                (onOpenDetail ?? (() => {
                  onGoto("memory");
                }))(sec.path);
              },
              attrs: { "data-action": "open-detail", "data-path": sec.path }
            });
          }
          return Btn({
            children: sec.text,
            quiet: true,
            onClick: () => {
              onGoto(sec.pane);
            },
            attrs: { "data-action": "goto", "data-pane": sec.pane }
          });
        })()
      ),
      suggestFeedback === null ? null : InlineDone({ ok: suggestFeedback.ok, text: suggestFeedback.text })
    ),
    SectionHead({ title: "\u968F\u624B\u8BB0\u4E00\u6761", count: "1 \u6B65" }),
    (0, import_react5.createElement)(
      "div",
      { className: "dmo-capture" },
      (0, import_react5.createElement)("textarea", {
        className: "dmo-capture-input",
        "data-field": "captureText",
        "aria-label": "\u8BB0\u4E00\u6761",
        placeholder: "\u4E00\u53E5\u8BDD\u8D76\u7D27\u5B58\u4E86\u2026",
        value: captureText,
        onChange: (event) => {
          setCaptureText(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" && (event.ctrlKey === true || event.metaKey === true)) {
            event.preventDefault();
            submitCapture();
          }
        }
      }),
      (0, import_react5.createElement)(
        "div",
        { className: "dmo-capture-foot" },
        Btn({ children: busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u8FDB\u53BB", onClick: submitCapture, disabled: busy || captureText.trim() === "", attrs: { "data-action": "capture" } }),
        h("span", { className: "dmo-capture-hint" }, "Ctrl / \u2318 + Enter")
      ),
      feedback === null ? null : InlineDone({
        ok: feedback.ok,
        text: feedback.text,
        onUndo: lastCapture === null ? void 0 : undoCapture
      })
    )
  );
}

// src/client/panes/capture.ts
var import_react6 = require("react");
var KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
var INBOX_STATE_LABEL = {
  open: "\u672A\u5F00\u59CB",
  todo: "\u8FDB\u884C\u4E2D",
  done: "\u5DF2\u5B8C\u6210",
  dropped: "\u5DF2\u4E22\u5F03"
};
function CapturePane() {
  const inbox = useBridge("inbox", { domain: "personal" });
  const [text, setText] = (0, import_react6.useState)("");
  const [kind, setKind] = (0, import_react6.useState)("\u60F3\u6CD5");
  const [busy, setBusy] = (0, import_react6.useState)(false);
  const [feedback, setFeedback] = (0, import_react6.useState)(null);
  const [lastLines, setLastLines] = (0, import_react6.useState)(null);
  const [lastContent, setLastContent] = (0, import_react6.useState)("");
  function submit() {
    const content = text.trim();
    if (content === "" || busy) return;
    setBusy(true);
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
    const done = (ok, message, written) => {
      setFeedback({ ok, text: message });
      if (ok) {
        setText("");
        setLastLines(written);
        setLastContent(lines.length === 1 ? lines[0] : `${lines[0]}\u2026\u7B49 ${lines.length} \u6761`);
        inbox.reload();
      }
      setBusy(false);
    };
    if (lines.length > 1) {
      void call(
        "captureBatch",
        { text: content, kind }
      ).then((result) => {
        const okCount = result.accepted?.length ?? 0;
        const blockedCount = result.blocked?.length ?? 0;
        done(
          blockedCount === 0,
          blockedCount === 0 ? `\u5DF2\u62C6\u6210 ${okCount} \u6761\u5B58\u5165\u8BB0\u5F55\u6D41` : `${okCount} \u6761\u5DF2\u5B58\u5165\uFF0C${blockedCount} \u6761\u88AB\u62E6\u622A`,
          []
        );
      }).catch((error) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
        setBusy(false);
      });
      return;
    }
    void call("capture", { content, kind }).then((result) => {
      if (result.ok) {
        void call("inbox", { domain: "personal" }).then((list) => {
          const match = [...list.entries].reverse().find((entry) => entry.content === content);
          done(true, "\u5DF2\u5B58\u5165\u8BB0\u5F55\u6D41", match === void 0 ? [] : [match.lineIndex]);
        }).catch(() => done(true, "\u5DF2\u5B58\u5165\u8BB0\u5F55\u6D41", []));
      } else {
        done(false, result.reason ?? "\u6CA1\u5B58\u4E0A", []);
      }
    }).catch((error) => {
      setFeedback({ ok: false, text: `\u6CA1\u5B58\u4E0A\uFF1A${error instanceof Error ? error.message : String(error)}\u3002\u5185\u5BB9\u8FD8\u5728\u8F93\u5165\u6846\u91CC\uFF0C\u53EF\u4EE5\u91CD\u8BD5\u3002` });
      setBusy(false);
    });
  }
  function undo() {
    if (lastLines === null || lastLines.length === 0 || busy) return;
    setBusy(true);
    void call("deleteInbox", { domain: "personal", lineIndexes: lastLines }).then(() => {
      setFeedback({ ok: true, text: `\u5DF2\u64A4\u9500\uFF1A\u300C${truncate(lastContent, 20)}\u300D` });
      setLastLines(null);
      inbox.reload();
    }).catch((error) => {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      setBusy(false);
    });
  }
  const head = PaneHead({
    pageName: "\u8BB0\u4E00\u6761",
    lede: "\u5148\u5B58\u4E0B\u6765\uFF0C\u4E4B\u540E\u5728\u300C\u5F85\u529E\u300D\u91CC\u6574\u7406",
    ledeSub: "\u4E0D\u9700\u8981\u60F3\u6E05\u695A\u600E\u4E48\u5199\u3002\u591A\u884C\u4F1A\u9010\u6761\u62C6\u5F00\u3002"
  });
  const captureCard = (0, import_react6.createElement)(
    "section",
    { className: "dmo-card-heavy" },
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-kindrow", role: "group", "aria-label": "\u8BB0\u5F55\u7C7B\u578B" },
      KINDS.map((item) => (0, import_react6.createElement)("button", {
        key: item,
        type: "button",
        className: "dmo-kindbtn",
        "data-kind": item,
        "aria-pressed": kind === item,
        onClick: () => {
          setKind(item);
        }
      }, item))
    ),
    (0, import_react6.createElement)(
      "div",
      { className: "dmo-capture" },
      (0, import_react6.createElement)("textarea", {
        className: "dmo-capture-input",
        style: { minHeight: 88 },
        "data-field": "captureText",
        "aria-label": "\u8BB0\u5F55\u5185\u5BB9",
        placeholder: "\u60F3\u5230\u4EC0\u4E48\u5199\u4EC0\u4E48\uFF0C\u591A\u884C\u4F1A\u9010\u6761\u62C6\u5F00",
        value: text,
        onChange: (event) => {
          setText(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" && (event.ctrlKey === true || event.metaKey === true)) {
            event.preventDefault();
            submit();
          }
        }
      }),
      (0, import_react6.createElement)(
        "div",
        { className: "dmo-capture-foot" },
        Primary({
          children: busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u8FDB\u53BB",
          onClick: submit,
          disabled: busy || text.trim() === "",
          attrs: { "data-action": "capture" }
        }),
        h("span", { className: "dmo-capture-hint" }, "Ctrl / \u2318 + Enter")
      ),
      feedback === null ? null : InlineDone({
        ok: feedback.ok,
        text: feedback.text,
        onUndo: lastLines !== null && lastLines.length > 0 ? undo : void 0
      })
    ),
    h(
      "p",
      { className: "dmo-note" },
      "\u5B58\u4E4B\u524D\u4F1A\u68C0\u67E5\u6709\u6CA1\u6709\u5BC6\u94A5\u3001\u79C1\u94A5\u3001\u8EAB\u4EFD\u8BC1\u53F7\u3001\u5185\u7F51 IP\u2014\u2014\u6709\u5C31\u62D2\u5199\uFF0C\u5E76\u7ED9\u51FA\u8131\u654F\u7248\u672C\u3002"
    )
  );
  if (inbox.phase === "loading") {
    return (0, import_react6.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      captureCard,
      (0, import_react6.createElement)(
        "section",
        { className: "dmo-card-quiet" },
        SectionHead({ title: "\u6700\u8FD1\u8BB0\u7684" }),
        SkeletonRows({ rows: 3, height: 40 })
      )
    );
  }
  if (inbox.phase === "error") {
    return (0, import_react6.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      captureCard,
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u5386\u53F2\u8BB0\u5F55",
        body: "\u5199\u5165\u4ECD\u7136\u53EF\u7528\u2014\u2014\u4E0A\u9762\u90A3\u4E2A\u8F93\u5165\u6846\u4E0D\u53D7\u5F71\u54CD\u3002\u8FD9\u91CC\u53EA\u662F\u300C\u6700\u8FD1\u8BB0\u7684\u300D\u5217\u8868\u8BFB\u4E0D\u51FA\u6765\u3002",
        actions: [Btn({ children: "\u91CD\u8BD5\u8BFB\u53D6", onClick: inbox.reload, attrs: { "data-action": "retry" } })]
      })
    );
  }
  if (inbox.data === void 0 || inbox.data.entries.length === 0) {
    return (0, import_react6.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      captureCard,
      (0, import_react6.createElement)(
        "section",
        { className: "dmo-card-quiet" },
        SectionHead({ title: "\u6700\u8FD1\u8BB0\u7684" }),
        h(EmptyState, {
          title: "\u8FD8\u6CA1\u6709\u8BB0\u8FC7",
          body: "\u8FD9\u91CC\u4F1A\u5217\u51FA\u4F60\u521A\u5B58\u4E0B\u7684\u6BCF\u4E00\u6761\u3002\u5B58\u5B8C\u7ACB\u523B\u80FD\u770B\u5230\uFF0C\u4E5F\u4F1A\u51FA\u73B0\u5728\u300C\u5F85\u529E\u300D\u91CC\u3002"
        })
      )
    );
  }
  const rows = inbox.data.entries.map((row) => (0, import_react6.createElement)(
    "li",
    { key: row.lineIndex, className: "dmo-row" },
    h("p", { className: "dmo-row-title" }, truncate(row.content, 90)),
    h(
      "div",
      { className: "dmo-meta-row" },
      h("span", { className: "dmo-meta" }, row.date),
      h("span", { className: "dmo-meta" }, row.kind),
      tag(INBOX_STATE_LABEL[row.state] ?? row.state, row.state === "done" ? "ok" : "warn"),
      row.destination === "\u2014" || row.destination === "" ? null : h("span", { className: "dmo-meta" }, `\u2192 ${truncate(row.destination, 24)}`)
    ),
    row.kindValid ? null : tag("\u7C7B\u578B\u975E\u6CD5", "err"),
    row.stateValid ? null : tag("\u72B6\u6001\u975E\u6CD5", "err")
  ));
  return (0, import_react6.createElement)(
    "div",
    { className: "dmo-pane" },
    head,
    captureCard,
    (0, import_react6.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      SectionHead({ title: "\u6700\u8FD1\u8BB0\u7684", count: `${inbox.data.entries.length} \u6761` }),
      (0, import_react6.createElement)("ul", { className: "dmo-list", role: "list" }, rows)
    )
  );
}

// src/client/panes/todo.ts
var import_react7 = require("react");
var INBOX_STATE_LABEL2 = {
  open: "\u672A\u5F00\u59CB",
  todo: "\u8FDB\u884C\u4E2D",
  done: "\u5DF2\u5B8C\u6210",
  dropped: "\u5DF2\u4E22\u5F03"
};
function TodoPane({ onOpenDetail }) {
  const snapshot = useBridge("snapshot", {});
  const inbox = useBridge("inbox", { domain: "personal" });
  const misses = useBridge("misses", {});
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [feedback, setFeedback] = (0, import_react7.useState)(null);
  const [suggestFeedback, setSuggestFeedback] = (0, import_react7.useState)(null);
  const [rejecting, setRejecting] = (0, import_react7.useState)(null);
  const [rejectReason, setRejectReason] = (0, import_react7.useState)("");
  const [drafting, setDrafting] = (0, import_react7.useState)(null);
  const [draftText, setDraftText] = (0, import_react7.useState)("");
  function run(action, success, target = "capture") {
    setBusy(true);
    void action().then(() => {
      if (target === "suggest") setSuggestFeedback({ ok: true, text: success });
      else setFeedback({ ok: true, text: success });
      snapshot.reload();
      inbox.reload();
      misses.reload();
    }).catch((error) => {
      const text = error instanceof Error ? error.message : String(error);
      if (target === "suggest") setSuggestFeedback({ ok: false, text });
      else setFeedback({ ok: false, text });
    }).finally(() => {
      setBusy(false);
    });
  }
  function confirmEntry(path) {
    run(() => call("confirm", { path }), "\u5DF2\u786E\u8BA4\uFF08\u5269\u4F59\u5F85\u62CD\u677F\u89C1\u4E0A\u65B9\u8BA1\u6570\uFF09", "suggest");
  }
  function undoRejectEntry(path) {
    run(() => call("undoReject", { path }), "\u5DF2\u64A4\u9500\u9A73\u56DE");
  }
  function rejectEntry(path) {
    if (rejectReason.trim() === "") return;
    setBusy(true);
    void call("reject", { path, reason: rejectReason.trim() }).then(() => {
      setFeedback({ ok: true, text: "\u5DF2\u9A73\u56DE\uFF0C30 \u5929\u5185\u4E0D\u518D\u63A8\u8350" });
      setRejecting(null);
      setRejectReason("");
      snapshot.reload();
    }).catch((error) => {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      setBusy(false);
    });
  }
  const queue = snapshot.data?.queue ?? [];
  const openRows = (inbox.data?.entries ?? []).filter((row) => row.state === "open" || row.state === "todo");
  const fillable = misses.data?.pipeline["should-fill"] ?? [];
  const draftingItems = misses.data?.pipeline.drafting ?? [];
  const todoTotal = queue.length + openRows.length + fillable.length + draftingItems.length;
  const head = PaneHead({
    pageName: "\u5F85\u529E",
    lede: todoTotal === 0 ? "\u4E09\u6BB5\u90FD\u6E05\u7A7A\u4E86" : `\u5171 ${todoTotal} \u4EF6\uFF0C\u5206\u4E09\u7C7B\uFF1A\u8981\u6211\u62CD\u677F\u7684\u3001\u8981\u6211\u6D41\u8F6C\u7684\u3001\u8981\u6211\u8865\u7684`
  });
  if (snapshot.phase === "error") {
    return (0, import_react7.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u5F85\u529E",
        body: "\u8FD9\u6B21\u8BFB\u53D6\u6574\u4F53\u5931\u8D25\uFF0C\u6240\u4EE5\u4E09\u6BB5\u90FD\u6CA1\u51FA\u6765\u3002\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\u2014\u2014\u5148\u91CD\u8BD5\uFF0C\u8FD8\u4E0D\u884C\u5C31\u53BB\u300C\u8BB0\u5FC6\u300D\u76F4\u63A5\u770B\u6761\u76EE\u3002",
        actions: [
          Primary({ children: "\u91CD\u8BD5", onClick: snapshot.reload, attrs: { "data-action": "retry" } }),
          Btn({ children: "\u53BB\u8BB0\u5FC6", onClick: () => {
            requestPane("memory");
          }, attrs: { "data-action": "goto", "data-pane": "memory" } })
        ]
      })
    );
  }
  if (snapshot.phase === "loading") return SkeletonRows({ rows: 3, height: 64 });
  if (todoTotal === 0) {
    return (0, import_react7.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      (0, import_react7.createElement)(
        "section",
        { className: "dmo-card-heavy" },
        h(EmptyState, {
          title: "\u6E05\u7A7A\u4E86",
          body: "\u4E0B\u6B21 agent \u641C\u4E0D\u5230\u4E1C\u897F\u3001\u6216\u8005\u6211\u4ECE\u5BF9\u8BDD\u91CC\u603B\u7ED3\u51FA\u65B0\u7684\u63A8\u65AD\u65F6\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u51FA\u73B0\u3002\u73B0\u5728\u4E0D\u7528\u7BA1\u5B83\u3002",
          actions: [
            Primary({ children: "\u8BB0\u4E00\u6761", onClick: () => {
              requestPane("capture");
            }, attrs: { "data-action": "goto", "data-pane": "capture" } }),
            Btn({ children: "\u53BB\u8BB0\u5FC6", onClick: () => {
              requestPane("memory");
            }, attrs: { "data-action": "goto", "data-pane": "memory" } })
          ]
        }),
        feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text })
      )
    );
  }
  const firstSection = queue.length > 0 ? "decisions" : fillable.length > 0 ? "fill" : "fill-notice";
  const decisionRows = queue.map((item, index) => {
    const usePrimary = firstSection === "decisions" && index === 0;
    const conf = item.confidence === null ? "\u2014" : item.confidence.toFixed(1);
    const evidence = item.evidence[0];
    return (0, import_react7.createElement)(
      "li",
      { key: item.id, className: "dmo-row" },
      h("p", { className: "dmo-row-title" }, truncate(item.title, 90)),
      h(
        "div",
        { className: "dmo-meta-row" },
        tag(
          item.status === "stale" ? "\u5F85\u590D\u6838" : item.kind === "retire" ? `${item.days ?? 0} \u5929\u672A\u5F15\u7528` : "\u63A8\u65AD\u5F85\u786E\u8BA4",
          item.kind === "retire" ? "err" : "warn"
        ),
        h("span", { className: "dmo-meta" }, item.domainLabel),
        h("span", { className: "dmo-meta" }, `\u7F6E\u4FE1 ${conf}`)
      ),
      evidence === void 0 ? null : (0, import_react7.createElement)(
        "div",
        { className: "dmo-evidence" },
        truncate(evidence.excerpt ?? "", 90),
        h("div", { className: "dmo-evidence-src" }, `${item.origin} \xB7 ${evidence.session ?? ""}`)
      ),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-row-actions" },
        /*
         * 驳回静默期内的条目（rejected，30 天内仍在队列）：
         * 唯一有意义的动作是「撤销驳回」——它不该再被确认或再驳回。
         */
        item.status === "rejected" ? Btn({
          children: "\u64A4\u9500\u9A73\u56DE",
          small: true,
          disabled: busy,
          onClick: () => {
            undoRejectEntry(item.path);
          },
          attrs: { "data-action": "undoReject", "data-path": item.id }
        }) : null,
        item.status === "rejected" ? null : item.kind === "retire" ? usePrimary ? Primary({ children: "\u5F52\u6863", small: true, disabled: busy, onClick: () => {
          run(() => call("archive", { path: item.path, reason: "\u5230\u671F\u9000\u5F79" }), "\u5DF2\u5F52\u6863");
        }, attrs: { "data-action": "archive", "data-path": item.id } }) : Btn({ children: "\u5F52\u6863", small: true, disabled: busy, onClick: () => {
          run(() => call("archive", { path: item.path, reason: "\u5230\u671F\u9000\u5F79" }), "\u5DF2\u5F52\u6863");
        }, attrs: { "data-action": "archive", "data-path": item.id } }) : usePrimary ? Primary({ children: "\u786E\u8BA4", small: true, disabled: busy, onClick: () => {
          confirmEntry(item.path);
        }, attrs: { "data-action": "confirm", "data-path": item.id } }) : Btn({ children: "\u786E\u8BA4", small: true, disabled: busy, onClick: () => {
          confirmEntry(item.path);
        }, attrs: { "data-action": "confirm", "data-path": item.id } }),
        TextLink({
          children: "\u770B\u5168\u6587",
          // v6 评审 P0-1：早先只有 attrs 没有 onClick——点了没反应。
          onClick: () => {
            (onOpenDetail ?? (() => {
              requestPane("memory");
            }))(item.path);
          },
          attrs: { "data-action": "open-detail", "data-path": item.id }
        })
      ),
      rejecting === item.id ? h(RejectBox, {
        reason: rejectReason,
        onReason: setRejectReason,
        busy,
        onCancel: () => {
          setRejecting(null);
          setRejectReason("");
        },
        onSubmit: () => {
          rejectEntry(item.path);
        }
      }) : (0, import_react7.createElement)(
        "details",
        { className: "dmo-more" },
        (0, import_react7.createElement)("summary", null, "\u5176\u5B83\u5904\u7406\u65B9\u5F0F"),
        (0, import_react7.createElement)(
          "div",
          { className: "dmo-more-body" },
          Btn({
            children: item.kind === "retire" ? "\u518D\u7559 90 \u5929" : "\u9A73\u56DE\uFF08\u9700\u8981\u5199\u7406\u7531\uFF09",
            small: true,
            disabled: busy,
            onClick: () => {
              if (item.kind === "retire") {
                run(() => call("keep", { path: item.path }), "\u5DF2\u518D\u7559 90 \u5929");
              } else {
                setRejecting(item.id);
              }
            },
            attrs: { "data-action": item.kind === "retire" ? "keep" : "reject", "data-path": item.id }
          }),
          h(
            "p",
            { className: "dmo-note" },
            item.kind === "retire" ? "\u518D\u7559\u4F1A\u5237\u65B0 updated\uFF0C\u8BA9 134 \u5929\u5012\u8BA1\u65F6\u91CD\u65B0\u5F00\u59CB\u3002" : "\u9A73\u56DE\u4F1A\u9759\u9ED8 30 \u5929\uFF0C\u6240\u4EE5\u5FC5\u987B\u5199\u4E00\u53E5\u4E3A\u4EC0\u4E48\u3002"
          )
        )
      )
    );
  });
  const flowRows = openRows.map((row) => (0, import_react7.createElement)(
    "li",
    { key: row.lineIndex, className: "dmo-row" },
    h("p", { className: "dmo-row-title" }, truncate(row.content, 90)),
    h(
      "div",
      { className: "dmo-meta-row" },
      h("span", { className: "dmo-meta" }, row.date),
      h("span", { className: "dmo-meta" }, row.kind),
      tag(INBOX_STATE_LABEL2[row.state] ?? row.state, "warn")
    ),
    (0, import_react7.createElement)(
      "div",
      { className: "dmo-row-actions" },
      Btn({
        children: "\u6807\u5B8C\u6210",
        small: true,
        disabled: busy,
        onClick: () => {
          run(() => call("updateInbox", { domain: "personal", lineIndex: row.lineIndex, patch: { state: "done" } }), "\u6807\u4E3A\u5DF2\u5B8C\u6210\uFF0C\u4ECE\u5F85\u529E\u79FB\u9664\u4E86");
        },
        attrs: { "data-action": "inbox-done", "data-line": String(row.lineIndex) }
      }),
      TextLink({ children: "\u6539\u5185\u5BB9", onClick: () => {
        setDrafting(`edit-${row.lineIndex}`);
        setDraftText(row.content);
      }, attrs: { "data-action": "inbox-edit", "data-line": String(row.lineIndex) } })
    ),
    drafting === `edit-${row.lineIndex}` ? (0, import_react7.createElement)(
      "div",
      { style: { marginTop: "var(--s2)" } },
      (0, import_react7.createElement)("textarea", {
        className: "dmo-textarea",
        "aria-label": "\u7F16\u8F91\u8BB0\u5F55\u5185\u5BB9",
        value: draftText,
        onChange: (event) => {
          setDraftText(event.target.value);
        }
      }),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-row-actions" },
        Btn({
          // v6 评审 P1-2：内联编辑提交降为次按钮——流转段永远不持有
          // 整页主按钮名额，这里再用 Primary 就会与拍板段同屏 2 处蓝实底。
          children: "\u4FDD\u5B58",
          small: true,
          disabled: busy || draftText.trim() === "",
          onClick: () => {
            run(
              () => call("updateInbox", { domain: "personal", lineIndex: row.lineIndex, patch: { content: draftText.trim() } }),
              "\u5185\u5BB9\u5DF2\u6539"
            );
            setDrafting(null);
          },
          attrs: { "data-action": "inbox-save", "data-line": String(row.lineIndex) }
        }),
        Btn({ children: "\u53D6\u6D88", small: true, onClick: () => {
          setDrafting(null);
        } })
      )
    ) : (0, import_react7.createElement)(
      "details",
      { className: "dmo-more" },
      (0, import_react7.createElement)("summary", null, "\u4E0D\u505A\u4E86"),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-more-body" },
        /*
         * 提升到档案：把这条速记沉淀成正式条目（新建/追加 md 并标 done+去向）。
         * 这是 INBOX 的唯一「毕业」出口，不能只留在记录流页里。
         */
        Btn({
          children: "\u63D0\u5347\u5230\u6863\u6848",
          small: true,
          disabled: busy,
          onClick: () => {
            run(() => call("promoteInbox", { domain: "personal", lineIndex: row.lineIndex }), "\u5DF2\u63D0\u5347\u5230\u6863\u6848");
          },
          attrs: { "data-action": "promoteInbox", "data-line": String(row.lineIndex) }
        }),
        Btn({
          children: "\u4E22\u6389\u8FD9\u6761",
          small: true,
          disabled: busy,
          onClick: () => {
            run(() => call("updateInbox", { domain: "personal", lineIndex: row.lineIndex, patch: { state: "dropped" } }), "\u4E22\u6389\u4E86\uFF0C\u4E0D\u518D\u51FA\u73B0\u5728\u5F85\u529E\u91CC");
          },
          attrs: { "data-action": "inbox-drop", "data-line": String(row.lineIndex) }
        }),
        h("p", { className: "dmo-note" }, "\u4E22\u6389\u8868\u793A\u300C\u6211\u5DF2\u7ECF\u5224\u65AD\u4E0D\u505A\u300D\u3002\u5B83\u4F1A\u4ECE\u5F85\u529E\u79FB\u9664\uFF0C\u8BB0\u5F55\u4ECD\u5728\u8BB0\u5F55\u6D41\u91CC\u3002")
      )
    )
  ));
  const fillSection = (() => {
    if (fillable.length > 0) {
      const rows = fillable.map((item, index) => {
        const usePrimary2 = firstSection === "fill" && index === 0;
        const writeBtn = usePrimary2 ? Primary({ children: "\u5199\u7ED3\u8BBA", small: true, onClick: () => {
          setDrafting(item.query);
          setDraftText("");
        }, attrs: { "data-action": "miss-write", "data-query": item.query } }) : Btn({ children: "\u5199\u7ED3\u8BBA", small: true, onClick: () => {
          setDrafting(item.query);
          setDraftText("");
        }, attrs: { "data-action": "miss-write", "data-query": item.query } });
        return (0, import_react7.createElement)(
          "li",
          { key: item.query, className: "dmo-row" },
          h("p", { className: "dmo-row-title" }, truncate(item.query, 90)),
          h(
            "div",
            { className: "dmo-meta-row" },
            tag("\u7B49\u4F60\u8865", "warn"),
            h("span", { className: "dmo-meta" }, `\u95EE\u8FC7 ${item.count} \u6B21`),
            h("span", { className: "dmo-meta" }, `${item.sessions} \u4E2A\u4F1A\u8BDD`)
          ),
          (0, import_react7.createElement)(
            "div",
            { className: "dmo-row-actions" },
            writeBtn,
            TextLink({ children: "\u4E0D\u8865", onClick: () => {
              run(() => call("missDelete", { query: item.query }), "\u5DF2\u6807\u8BB0\u4E0D\u8865");
            }, attrs: { "data-action": "miss-delete", "data-query": item.query } })
          ),
          drafting === item.query ? (0, import_react7.createElement)(
            "div",
            { style: { marginTop: "var(--s2)" } },
            (0, import_react7.createElement)("textarea", {
              className: "dmo-textarea",
              "aria-label": "\u5199\u7ED3\u8BBA",
              placeholder: "\u5199\u4E0B\u8FD9\u6761\u95EE\u9898\u7684\u7ED3\u8BBA\uFF0C\u786E\u8BA4\u540E\u843D\u5E93\u5E76\u8FDB\u5165 7 \u5929\u9A8C\u8BC1\u671F\u2026",
              value: draftText,
              onChange: (event) => {
                setDraftText(event.target.value);
              }
            }),
            (0, import_react7.createElement)(
              "div",
              { className: "dmo-row-actions" },
              Btn({
                // v6 评审 P1-2：同上——草稿提交降次按钮，
                // 该行可能同时显示条件主按钮「写结论」，不许 2 处蓝实底。
                children: "\u786E\u8BA4\u843D\u5E93",
                small: true,
                disabled: busy || draftText.trim() === "",
                onClick: () => {
                  run(
                    () => call("missConfirm", { query: item.query, content: draftText.trim(), type: "\u95EE\u9898" }),
                    "\u5DF2\u843D\u5E93\uFF0C\u8FDB\u5165 7 \u5929\u9A8C\u8BC1\u671F"
                  );
                  setDrafting(null);
                },
                attrs: { "data-action": "miss-confirm", "data-query": item.query }
              }),
              Btn({ children: "\u53D6\u6D88", small: true, onClick: () => {
                setDrafting(null);
              } })
            )
          ) : null
        );
      });
      return (0, import_react7.createElement)(
        "section",
        { className: "dmo-card-quiet" },
        SectionHead({
          title: "\u8981\u6211\u8865\u7684",
          count: String(fillable.length),
          /*
           * 批量草稿：只生成草稿、**不落库**——草稿必须人逐条确认才写入，
           * 这条产品立场（自动写库会产生无法审计的臆想）不变。
           */
          action: fillable.length > 1 ? Btn({
            children: `\u6279\u91CF\u751F\u6210 ${fillable.length} \u6761\u8349\u7A3F`,
            small: true,
            disabled: busy,
            onClick: () => {
              run(
                () => call("missBatchDraft", { queries: fillable.map((item) => item.query), type: "\u95EE\u9898" }),
                "\u5DF2\u751F\u6210\u8349\u7A3F\uFF0C\u53BB\u300C\u8349\u7A3F\u300D\u9010\u6761\u786E\u8BA4"
              );
            },
            attrs: { "data-action": "missBatchDraft" }
          }) : void 0
        }),
        (0, import_react7.createElement)("ul", { className: "dmo-list", role: "list" }, rows)
      );
    }
    const missTotal = misses.data?.total ?? 0;
    if (missTotal === 0) return [];
    const usePrimary = firstSection === "fill-notice";
    const fillBtn = usePrimary ? Primary({ children: "\u4ECD\u7136\u8865\u4E00\u6761", onClick: () => {
      setDrafting("");
      setDraftText("");
    }, attrs: { "data-action": "miss-write" } }) : Btn({ children: "\u4ECD\u7136\u8865\u4E00\u6761", small: true, attrs: { "data-action": "miss-write" } });
    return (0, import_react7.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      SectionHead({ title: "\u8981\u6211\u8865\u7684", count: "0" }),
      Notice({
        title: "\u8FD8\u6CA1\u6709\u5230\u8BE5\u8865\u7684\u65F6\u5019",
        text: `${missTotal} \u4E2A\u95EE\u9898\u5404\u88AB\u641C\u8FC7 1 \u6B21\uFF0C\u8FD8\u6CA1\u5230 3 \u6B21\u7684\u9608\u503C\u3002\u540C\u4E00\u4E2A\u95EE\u9898\u518D\u88AB\u641C\u5230 2 \u6B21\uFF0C\u5B83\u5C31\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u7B49\u4F60\u8865\u3002\u73B0\u5728\u8865\u4E5F\u884C\u2014\u2014\u53EA\u662F\u7CFB\u7EDF\u8FD8\u6CA1\u8BC1\u636E\u8BF4\u660E\u5B83\u503C\u5F97\u5360\u4F4D\u3002`,
        tone: "warn"
      }),
      (0, import_react7.createElement)(
        "div",
        { className: "dmo-row-actions" },
        fillBtn,
        h("span", { className: "dmo-note", style: { margin: 0 } }, `\u4F1A\u4ECE\u4E0A\u9762 ${missTotal} \u4E2A\u95EE\u9898\u91CC\u6311\u4E00\u4E2A\u5F00\u59CB`)
      )
    );
  })();
  return (0, import_react7.createElement)(
    "div",
    { className: "dmo-pane" },
    head,
    /*
     * 拍板段的反馈落在段首（动作来源是这一段），不塞到页面末尾——
     * 三段齐全时页面末尾在视口之外，「就地反馈」会变成看不见的反馈。
     *
     * v6 评审 P0-1：三段各自装进容器。拍板段 = 本页唯一重卡
     * （card-fill + l3 + 主操作所在）；流转与补库 = 静卡。
     * 行分隔的 border-l1 从此只在卡内出现。
     */
    suggestFeedback === null ? null : InlineDone({ ok: suggestFeedback.ok, text: suggestFeedback.text }),
    queue.length === 0 ? null : (0, import_react7.createElement)(
      "section",
      { className: "dmo-card-heavy" },
      SectionHead({ title: "\u8981\u6211\u62CD\u677F\u7684", count: String(queue.length) }),
      (0, import_react7.createElement)("ul", { className: "dmo-list", role: "list" }, decisionRows)
    ),
    openRows.length === 0 ? null : (0, import_react7.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      SectionHead({
        title: "\u8981\u6211\u6D41\u8F6C\u7684",
        count: String(openRows.length),
        /* 超过 1 条才给批量——单条时逐行点更快，批量按钮只是噪音 */
        action: openRows.length > 1 ? Btn({
          children: "\u5168\u90E8\u6807\u5B8C\u6210",
          small: true,
          disabled: busy,
          onClick: () => {
            run(
              () => call("batchInboxState", {
                domain: "personal",
                lineIndexes: openRows.map((row) => row.lineIndex),
                state: "done"
              }),
              `\u5DF2\u6807\u5B8C\u6210 ${openRows.length} \u6761`
            );
          },
          attrs: { "data-action": "batchInboxState" }
        }) : void 0
      }),
      (0, import_react7.createElement)("ul", { className: "dmo-list", role: "list" }, flowRows)
    ),
    /* 补库段自己带容器（静卡），未达阈值时是说明卡，missTotal=0 时是 null */
    fillSection,
    feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }),
    busy ? h("p", { className: "dmo-note" }, "\u5904\u7406\u4E2D\u2026") : null
  );
}

// src/client/panes/memory.ts
var import_react8 = require("react");
var STATUS_GROUPS = [
  { id: "", label: "\u5168\u90E8", match: () => true },
  { id: "pending", label: "\u8981\u6211\u62CD\u677F", match: (s) => s === "hypothesis" || s === "observed" },
  { id: "stale", label: "\u5F85\u590D\u6838", match: (s) => s === "stale" },
  { id: "confirmed", label: "\u5DF2\u786E\u8BA4", match: (s) => s === "confirmed" || s === "active" }
];
function MemoryPane({ ctx, detailPath, onOpenDetail }) {
  if (detailPath !== void 0) {
    return (0, import_react8.createElement)(MemoryDetail, { path: detailPath, onBack: () => {
      onOpenDetail(null);
    } });
  }
  return (0, import_react8.createElement)(MemoryList, { ctx, onOpenDetail });
}
function MemoryList({ ctx, onOpenDetail }) {
  const { cwd, project } = useSessionProject(ctx);
  const [scope, setScope] = (0, import_react8.useState)("all");
  const [query, setQuery] = (0, import_react8.useState)("");
  const [submitted, setSubmitted] = (0, import_react8.useState)("");
  const [statusFilter, setStatusFilter] = (0, import_react8.useState)("");
  const [domainFilter, setDomainFilter] = (0, import_react8.useState)("");
  const [selected, setSelected] = (0, import_react8.useState)([]);
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const [feedback, setFeedback] = (0, import_react8.useState)(null);
  const scopeParams = scope === "project" ? scopeBody(cwd, project) : {};
  const snapshot = useBridge("snapshot", scopeParams, [scope, cwd, project]);
  const search = useBridge(
    "search",
    { query: submitted, ...scopeParams, record: submitted.trim() !== "" },
    [submitted, scope, cwd, project]
  );
  function runBatch(action, success) {
    setBusy(true);
    void action().then((result) => {
      const failed = result?.failed?.length ?? 0;
      setFeedback({
        ok: failed === 0,
        text: failed === 0 ? success : `${success}\uFF0C\u4F46\u6709 ${failed} \u6761\u5931\u8D25\uFF08\u53EF\u80FD\u5DF2\u88AB\u6539\u52A8\uFF09`
      });
      setSelected([]);
      snapshot.reload();
    }).catch((error) => {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      setBusy(false);
    });
  }
  const entries = snapshot.data?.entries ?? [];
  const searching = submitted.trim() !== "";
  const rawList = searching ? (search.data?.hits ?? []).map((hit) => ({
    id: hit.id,
    path: hit.path,
    title: hit.title,
    status: hit.status,
    tokens: hit.tokens,
    domainLabel: hit.domainLabel,
    citeCount: void 0,
    snippet: hit.snippet
  })) : entries.map((entry) => ({
    id: entry.id,
    path: entry.path,
    title: entry.title,
    status: entry.status,
    tokens: entry.tokens,
    domainLabel: entry.domainLabel,
    citeCount: entry.citeCount,
    snippet: void 0
  }));
  const statusCounts = STATUS_GROUPS.map((group) => ({
    ...group,
    num: rawList.filter((item) => group.match(item.status)).length
  }));
  const statusMatched = statusFilter === "" ? rawList : rawList.filter((item) => STATUS_GROUPS.find((g) => g.id === statusFilter)?.match(item.status) ?? true);
  const list = domainFilter === "" ? statusMatched : statusMatched.filter((item) => item.domainLabel === domainFilter);
  const domainOptions = [...new Set(rawList.map((item) => item.domainLabel))];
  const listEmpty = list.length === 0;
  const searchBtn = listEmpty ? Btn({ children: "\u641C", onClick: () => {
    setSubmitted(query);
  }, attrs: { "data-action": "search" } }) : Primary({ children: "\u641C", onClick: () => {
    setSubmitted(query);
  }, attrs: { "data-action": "search" } });
  const head = PaneHead({
    pageName: "\u8BB0\u5FC6",
    lede: `\u5E93\u91CC\u4E00\u5171 ${count(entries.length)} \u6761\uFF0C${count(snapshot.data?.stats.tokens ?? 0)} tokens`,
    ledeSub: snapshot.data === void 0 ? void 0 : `\u6700\u91CD\u7684\u4E00\u6761\u5360 ${count(Math.max(...entries.map((e) => e.tokens), 0))} tokens\uFF1B\u8D85 80 \u884C ${count(snapshot.data.stats.overLimit)} \u7BC7\u3002`
  });
  const filterCard = (0, import_react8.createElement)(
    "section",
    { className: "dmo-card-quiet" },
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-toolbar" },
      (0, import_react8.createElement)("input", {
        className: "dmo-input",
        "data-field": "query",
        value: query,
        placeholder: "\u641C\u6807\u9898\u6216\u57DF\u2026",
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
      searchBtn
    ),
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-kindrow", role: "group", "aria-label": "\u6309\u72B6\u6001\u7B5B\u9009" },
      statusCounts.map((group) => (0, import_react8.createElement)("button", {
        key: group.id,
        type: "button",
        className: "dmo-kindbtn",
        "data-status": group.id,
        "aria-pressed": statusFilter === group.id,
        onClick: () => {
          setStatusFilter(group.id);
          setSelected([]);
        }
      }, `${group.label} ${group.num}`))
    ),
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-kindrow", role: "group", "aria-label": "\u6309\u57DF\u7B5B\u9009" },
      (0, import_react8.createElement)("button", {
        type: "button",
        className: "dmo-kindbtn",
        "data-scope": "",
        "aria-pressed": scope === "all" && domainFilter === "",
        onClick: () => {
          setScope("all");
          setDomainFilter("");
          setSelected([]);
        }
      }, `\u5168\u5E93 ${entries.length}`),
      (0, import_react8.createElement)("button", {
        type: "button",
        className: "dmo-kindbtn",
        "data-scope": "project",
        "aria-pressed": scope === "project",
        onClick: () => {
          setScope(scope === "project" ? "all" : "project");
          setSelected([]);
        }
      }, scope === "project" && snapshot.data?.project !== null && snapshot.data?.project !== void 0 ? `\u4EC5\u672C\u9879\u76EE \xB7 ${snapshot.data.project}` : "\u4EC5\u672C\u9879\u76EE"),
      domainOptions.map((name) => (0, import_react8.createElement)("button", {
        key: name,
        type: "button",
        className: "dmo-kindbtn",
        "data-domain": name,
        "aria-pressed": domainFilter === name,
        onClick: () => {
          setDomainFilter(domainFilter === name ? "" : name);
          setSelected([]);
        }
      }, name))
    )
  );
  if (snapshot.phase === "loading") return SkeletonRows({ rows: 4, height: 56 });
  if (snapshot.phase === "error") {
    return (0, import_react8.createElement)(
      "div",
      { className: "dmo-pane" },
      head,
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u8BB0\u5FC6",
        body: "\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u8FD9\u662F\u8BFB\u53D6\u95EE\u9898\u3002\u8BB0\u5FC6\u4E0D\u4F1A\u56E0\u4E3A\u8FD9\u6B21\u5931\u8D25\u800C\u6D88\u5931\u3002",
        actions: [Primary({ children: "\u91CD\u8BD5", onClick: snapshot.reload, attrs: { "data-action": "retry" } })]
      })
    );
  }
  const emptyBlock = searching ? h(EmptyState, {
    title: `\u6CA1\u641C\u5230\u300C${truncate(submitted, 20)}\u300D`,
    body: "\u68C0\u7D22\u843D\u7A7A\u672C\u8EAB\u5C31\u662F\u4E00\u6761\u4FE1\u53F7\u2014\u2014\u5B83\u5DF2\u8BB0\u8FDB\u300C\u5F85\u529E \xB7 \u8981\u6211\u8865\u7684\u300D\u3002\u6362\u4E2A\u8BCD\uFF0C\u6216\u53BB\u5F85\u529E\u770B\u8FD9\u6B21\u843D\u7A7A\u3002",
    actions: [
      Primary({ children: "\u6362\u4E2A\u8BCD", onClick: () => {
        setQuery("");
        setSubmitted("");
      }, attrs: { "data-action": "clear-search" } }),
      // v6 评审 P0-1：导航出口必须真的跳，不能只带测试钩子
      Btn({ children: "\u53BB\u5F85\u529E\u770B", onClick: () => {
        gotoPane(ctx, "todo");
      }, attrs: { "data-action": "goto", "data-pane": "todo" } })
    ]
  }) : entries.length === 0 ? h(EmptyState, {
    title: "\u5E93\u662F\u7A7A\u7684",
    body: "\u8FD8\u6CA1\u6709\u4EFB\u4F55\u8BB0\u5FC6\u3002\u8BB0\u4E00\u6761\uFF0C\u5B83\u5C31\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
    actions: [Primary({ children: "\u8BB0\u4E00\u6761", onClick: () => {
      gotoPane(ctx, "capture");
    }, attrs: { "data-action": "goto", "data-pane": "capture" } })]
  }) : h(EmptyState, {
    title: "\u8FD9\u4E2A\u7B5B\u9009\u4E0B\u6CA1\u6709",
    body: "\u6362\u4E2A\u7B5B\u9009\uFF0C\u6216\u8005\u6E05\u7A7A\u7B5B\u9009\u770B\u5168\u90E8\u3002",
    actions: [
      Primary({ children: "\u6E05\u7A7A\u7B5B\u9009", onClick: () => {
        setStatusFilter("");
        setDomainFilter("");
        setScope("all");
      }, attrs: { "data-action": "clear-filter" } }),
      Btn({ children: "\u8BB0\u4E00\u6761", onClick: () => {
        gotoPane(ctx, "capture");
      }, attrs: { "data-action": "goto", "data-pane": "capture" } })
    ]
  });
  const rows = list.map((entry) => (0, import_react8.createElement)(
    "li",
    { key: entry.id, className: "dmo-row" },
    (0, import_react8.createElement)("button", {
      type: "button",
      className: "dmo-row-button",
      "data-action": "open-detail",
      "data-path": entry.path,
      onClick: () => {
        onOpenDetail(entry.path);
      }
    }, truncate(entry.title, 60)),
    h(
      "div",
      { className: "dmo-meta-row" },
      tag(statusLabel(entry.status), entry.status === "confirmed" || entry.status === "active" ? "ok" : entry.status === "rejected" ? "err" : entry.status === "stale" || entry.status === "observed" || entry.status === "hypothesis" ? "warn" : ""),
      h("span", { className: "dmo-meta" }, `${entry.tokens} tokens`),
      h("span", { className: "dmo-meta" }, entry.domainLabel),
      h(
        "span",
        { className: "dmo-meta" },
        entry.citeCount === void 0 || entry.citeCount === 0 ? "\u672A\u5F15\u7528" : `\u5F15\u7528 ${entry.citeCount} \u6B21`
      ),
      entry.snippet === void 0 ? null : h("span", { className: "dmo-meta" }, truncate(entry.snippet, 60)),
      (0, import_react8.createElement)("input", {
        type: "checkbox",
        className: "dmo-check",
        checked: selected.includes(entry.path),
        "aria-label": `\u9009\u62E9\uFF1A${truncate(entry.title, 20)}`,
        onClick: (event) => {
          event.stopPropagation();
        },
        onChange: () => {
          setSelected((current) => current.includes(entry.path) ? current.filter((p) => p !== entry.path) : [...current, entry.path]);
        }
      })
    )
  ));
  return (0, import_react8.createElement)(
    "div",
    { className: "dmo-pane" },
    head,
    filterCard,
    selected.length === 0 ? null : (0, import_react8.createElement)(
      "div",
      { className: "dmo-bulk" },
      h("span", { className: "dmo-meta" }, `\u5DF2\u9009 ${selected.length} / ${list.length} \u6761`),
      Btn({
        children: `\u5F52\u6863\u9009\u4E2D ${selected.length} \u6761`,
        small: true,
        disabled: busy,
        onClick: () => {
          runBatch(() => call("batchArchive", { paths: selected, reason: "\u6279\u91CF\u9000\u5F79" }), `\u5DF2\u5F52\u6863 ${selected.length} \u6761`);
        },
        attrs: { "data-action": "batchArchive" }
      }),
      Btn({ children: "\u6E05\u7A7A\u9009\u62E9", small: true, disabled: busy, onClick: () => {
        setSelected([]);
      } })
    ),
    /* v6 评审 P0-1：台账装进本页唯一重卡；空态出口也留在卡内（空屏不许是灰字） */
    (0, import_react8.createElement)(
      "section",
      { className: "dmo-card-heavy" },
      SectionHead({ title: searching ? "\u68C0\u7D22\u7ED3\u679C" : "\u5168\u90E8\u8BB0\u5FC6", count: `${list.length} \u6761` }),
      searching && search.phase === "loading" ? SkeletonRows({ rows: 2, height: 44 }) : listEmpty ? emptyBlock : (0, import_react8.createElement)("ul", { className: "dmo-list dmo-list-clickable", role: "list" }, rows),
      searching && search.phase === "ready" && search.data !== void 0 && !listEmpty ? h(
        "p",
        { className: "dmo-note" },
        `\u547D\u4E2D ${count(search.data.total)} \u6761 \xB7 \u672C\u6B21\u8BFB\u53D6\u7EA6 ${count(search.data.cost)} tokens\uFF08\u5DF2\u8BB0\u8D26\uFF09`
      ) : null
    ),
    feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text })
  );
}
function MemoryDetail({ path, onBack }) {
  const detail = useBridge("detail", { path }, [path]);
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const [feedback, setFeedback] = (0, import_react8.useState)(null);
  const [rejecting, setRejecting] = (0, import_react8.useState)(false);
  const [rejectReason, setRejectReason] = (0, import_react8.useState)("");
  const [editing, setEditing] = (0, import_react8.useState)(false);
  const [draft, setDraft] = (0, import_react8.useState)(null);
  function run(action, success) {
    setBusy(true);
    void action().then(() => {
      setFeedback({ ok: true, text: success });
      setRejecting(false);
      setRejectReason("");
      setEditing(false);
      setDraft(null);
    }).catch((error) => {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      setBusy(false);
    });
  }
  if (detail.phase === "loading") return SkeletonRows({ rows: 4 });
  if (detail.phase === "error") {
    return (0, import_react8.createElement)(
      "div",
      null,
      (0, import_react8.createElement)(
        "div",
        { className: "dmo-back" },
        TextLink({ children: "\u2190 \u8FD4\u56DE\u5217\u8868", onClick: onBack, attrs: { "data-action": "back-to-list" } })
      ),
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u8FD9\u6761\u8BB0\u5FC6",
        body: "\u5B83\u53EF\u80FD\u5DF2\u88AB\u5220\u9664\u6216\u6539\u540D\u3002\u8FD4\u56DE\u5217\u8868\u91CD\u65B0\u627E\u2014\u2014\u8FD9\u4E0D\u5F71\u54CD\u5E93\u91CC\u5176\u5B83\u6761\u76EE\u3002",
        actions: [Primary({ children: "\u8FD4\u56DE\u5217\u8868", onClick: onBack, attrs: { "data-action": "back-to-list" } })]
      })
    );
  }
  const data = detail.data;
  if (data === void 0) {
    return (0, import_react8.createElement)(
      "div",
      { className: "dmo-pane" },
      (0, import_react8.createElement)(
        "div",
        { className: "dmo-back" },
        TextLink({ children: "\u2190 \u8FD4\u56DE\u5217\u8868", onClick: onBack, attrs: { "data-action": "back-to-list" } })
      ),
      h(ErrorAlert, {
        title: "\u6CA1\u8BFB\u5230\u8FD9\u6761\u8BB0\u5FC6",
        body: "\u4E0D\u662F\u5B83\u6CA1\u4E86\uFF0C\u662F\u8FD9\u6B21\u6CA1\u8BFB\u5230\u2014\u2014\u4E24\u8005\u4E0D\u4E00\u6837\u3002\u5148\u91CD\u8BD5\uFF0C\u6216\u8FD4\u56DE\u5217\u8868\u91CD\u65B0\u627E\u3002",
        actions: [
          Primary({ children: "\u91CD\u8BD5", onClick: detail.reload, attrs: { "data-action": "retry" } }),
          Btn({ children: "\u8FD4\u56DE\u5217\u8868", onClick: onBack, attrs: { "data-action": "back-to-list" } })
        ]
      })
    );
  }
  const { entry, trust } = data;
  const canConfirm = entry.status === "stale" || entry.status === "observed" || entry.status === "hypothesis";
  const canReject = entry.status !== "rejected";
  return (0, import_react8.createElement)(
    "div",
    { className: "dmo-pane" },
    (0, import_react8.createElement)(
      "div",
      { className: "dmo-back" },
      TextLink({ children: "\u2190 \u8FD4\u56DE\u5217\u8868", onClick: onBack, attrs: { "data-action": "back-to-list" } })
    ),
    (0, import_react8.createElement)(
      "section",
      { className: "dmo-card-heavy" },
      h("h1", { className: "dmo-detail-title" }, entry.title),
      h(
        "div",
        { className: "dmo-meta-row", style: { marginTop: 0 } },
        tag(
          statusLabel(entry.status),
          entry.status === "confirmed" || entry.status === "active" ? "ok" : entry.status === "rejected" ? "err" : entry.status === "stale" || entry.status === "observed" || entry.status === "hypothesis" ? "warn" : ""
        ),
        h("span", { className: "dmo-meta" }, entry.domainLabel),
        h("span", { className: "dmo-meta" }, `${entry.tokens} tokens`),
        h("span", { className: "dmo-meta" }, `${entry.lines} \u884C`),
        h("span", { className: "dmo-meta" }, `\u5F15\u7528 ${count(trust.citeCount)} \u6B21`)
      ),
      SectionHead({ title: "\u51ED\u4EC0\u4E48\u53EF\u4FE1" }),
      h(
        "div",
        { className: "dmo-meta-row", style: { marginTop: 0 } },
        h("span", { className: "dmo-meta" }, `\u7F6E\u4FE1\uFF1A${entry.confidence === null ? "\u2014" : entry.confidence.toFixed(1)}`),
        h("span", { className: "dmo-meta" }, `\u8BC1\u636E\uFF1A${count(trust.evidenceCount)}`),
        h("span", { className: "dmo-meta" }, `\u6700\u540E\u5F15\u7528\uFF1A${trust.lastCitedAt ?? "\u4ECE\u672A"}`)
      ),
      entry.evidence.length === 0 ? h("p", { className: "dmo-note" }, "\u8FD9\u6761\u6CA1\u6709\u8BC1\u636E\u6458\u5F55\u2014\u2014\u5B83\u6765\u81EA\u4F60\u4EB2\u53E3\u8BF4\u7684\u8BDD\uFF0C\u4E0D\u9700\u8981\u518D\u4E3E\u8BC1\u3002") : entry.evidence.map((item, index) => (0, import_react8.createElement)(
        "div",
        { key: index, className: "dmo-evidence" },
        truncate(item.excerpt ?? "", 120),
        h("div", { className: "dmo-evidence-src" }, `${item.gate ?? ""} \xB7 ${item.session ?? ""}`)
      )),
      SectionHead({ title: "\u6B63\u6587" }),
      editing ? (0, import_react8.createElement)(
        "div",
        null,
        (0, import_react8.createElement)("textarea", {
          className: "dmo-textarea",
          style: { minHeight: 190 },
          "aria-label": "\u6B63\u6587\u6E90\u7801",
          value: draft ?? entry.body,
          onChange: (event) => {
            setDraft(event.target.value);
          }
        }),
        (0, import_react8.createElement)(
          "div",
          { className: "dmo-row-actions" },
          Primary({
            children: busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58",
            disabled: busy,
            onClick: () => {
              run(() => call("writeBody", { path, body: draft ?? entry.body }), "\u5DF2\u4FDD\u5B58");
            },
            attrs: { "data-action": "writeBody", "data-path": path }
          }),
          Btn({ children: "\u53D6\u6D88", onClick: () => {
            setEditing(false);
            setDraft(null);
          } })
        )
      ) : h("div", { className: "dmo-body-block" }, entry.body.trim() === "" ? "\uFF08\u7A7A\uFF09" : entry.body),
      feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }),
      (0, import_react8.createElement)(
        "div",
        { className: "dmo-row-actions" },
        canConfirm && !editing ? Primary({
          children: "\u786E\u8BA4\u8FD9\u6761",
          disabled: busy,
          onClick: () => {
            run(() => call("confirm", { path }), "\u5DF2\u786E\u8BA4");
          },
          attrs: { "data-action": "confirm", "data-path": path }
        }) : Btn({ children: "\u7F16\u8F91\u6B63\u6587", disabled: busy || editing, onClick: () => {
          setEditing(true);
          setDraft(entry.body);
        }, attrs: { "data-action": "edit" } })
      ),
      canReject || editing ? (0, import_react8.createElement)(
        "div",
        { className: "dmo-row-actions" },
        canReject ? Btn({
          children: "\u9A73\u56DE\uFF08\u9700\u8981\u5199\u7406\u7531\uFF09",
          small: true,
          disabled: busy,
          onClick: () => {
            setRejecting((value) => !value);
          },
          attrs: { "data-action": "reject", "data-path": path }
        }) : null,
        Btn({
          children: "\u518D\u7559 90 \u5929",
          small: true,
          disabled: busy,
          onClick: () => {
            run(() => call("keep", { path }), "\u5DF2\u518D\u7559 90 \u5929");
          },
          attrs: { "data-action": "keep", "data-path": path }
        }),
        Btn({
          children: "\u5F52\u6863\u9000\u5F79",
          small: true,
          disabled: busy,
          onClick: () => {
            run(() => call("archive", { path }), "\u5DF2\u5F52\u6863");
          },
          attrs: { "data-action": "archive", "data-path": path }
        }),
        h(
          "p",
          { className: "dmo-note" },
          "\u9A73\u56DE\u4F1A\u9759\u9ED8 30 \u5929\uFF0C\u671F\u95F4\u4E0D\u518D\u63A8\u8350\u8FD9\u6761\u3002\u5F52\u6863\u540E\u4ECD\u53EF\u68C0\u7D22\uFF0C\u53EA\u662F\u4E0D\u518D\u8FDB\u4E0A\u4E0B\u6587\u3002"
        )
      ) : null,
      rejecting ? h(RejectBox, {
        reason: rejectReason,
        onReason: setRejectReason,
        busy,
        onCancel: () => {
          setRejecting(false);
          setRejectReason("");
        },
        onSubmit: () => {
          run(() => call("reject", { path, reason: rejectReason.trim() }), "\u5DF2\u9A73\u56DE\uFF0C30 \u5929\u5185\u4E0D\u518D\u63A8\u8350");
        }
      }) : null
    )
  );
}
function statusLabel(status) {
  const labels = {
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
  return labels[status] ?? status;
}

// src/client/panes/health.ts
var import_react10 = require("react");

// src/client/panes/maintenance.ts
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
    { id: "repair", label: "\u8865\u5168\u7F3A\u5931\u7684\u5143\u6570\u636E", badge: repair.data?.fixes.length ?? 0 },
    { id: "anchor", label: "\u68C0\u67E5\u5F15\u7528\u7684\u4EE3\u7801\u8FD8\u5728\u4E0D\u5728", badge: (anchor.data?.summary.stale ?? 0) + (anchor.data?.summary.missing ?? 0) },
    { id: "compact", label: "\u538B\u7F29\u7A7A\u884C", badge: compact.data?.total ?? 0 },
    { id: "promote", label: "\u5347\u7EA7\u53EF\u4FE1\u5EA6", badge: promote.data?.plans.length ?? 0 },
    { id: "review", label: "\u672C\u5468\u5C0F\u7ED3", badge: review.data?.todo.length ?? 0 }
  ];
  return (0, import_react9.createElement)(
    "div",
    { style: { marginTop: 12 } },
    (0, import_react9.createElement)(
      "div",
      { className: "dmo-lane-head" },
      "\u7EF4\u62A4\u4F5C\u4E1A",
      (0, import_react9.createElement)("span", { className: "dmo-lane-count" }, "\u5E73\u65F6\u4E0D\u7528\u7BA1\uFF1B\u6BCF\u9879\u90FD\u5148\u7ED9\u9884\u89C8\uFF0C\u4F60\u70B9\u4E86\u624D\u6267\u884C")
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
  const loading = Loading({ phase, error, onRetry, what: "\u5F15\u7528\u68C0\u67E5" });
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
  const loading = Loading({ phase, error, onRetry, what: "\u538B\u7F29\u5019\u9009" });
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
  const loading = Loading({ phase, error, onRetry, what: "\u5347\u7EA7\u8BA1\u5212" });
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
      { title: "\u6CA1\u6709\u53EF\u5347\u7EA7\u7684\u6761\u76EE" },
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
            run(() => call("promote", { apply: true }), `\u5DF2\u5347\u7EA7 ${data.plans.length} \u6761`, onRetry);
          }
        }, `\u6309\u8BA1\u5212\u5347\u7EA7\uFF08${data.plans.length} \u6761\uFF09`)
      )
    )
  );
}
function ReviewSection({ data, phase, error, onRetry, onOpenMemory }) {
  const loading = Loading({ phase, error, onRetry, what: "\u672C\u5468\u5C0F\u7ED3" });
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
  const loading = Loading({ phase, error, onRetry, what: "\u4FEE\u8865" });
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

// src/client/panes/health.ts
function CostRow({ name, value, note }) {
  return (0, import_react10.createElement)(
    "div",
    null,
    (0, import_react10.createElement)(
      "div",
      { className: "dmo-cost-row" },
      h("span", { className: "dmo-cost-name" }, name),
      h("span", { className: "dmo-cost-num" }, value)
    ),
    h("p", { className: "dmo-cost-note" }, note)
  );
}
function HealthPane({ onGotoToday }) {
  const overview = useBridge("overview", {});
  const health = useBridge("health", {});
  const [exporting, setExporting] = (0, import_react10.useState)(false);
  const [feedback, setFeedback] = (0, import_react10.useState)(null);
  function doExport(format, domain) {
    setExporting(true);
    void call("export", { format, domain }).then((result) => {
      setFeedback({ ok: true, text: `\u5DF2\u5BFC\u51FA ${result.count} \u6761\u5230 ${result.filename}` });
    }).catch((error) => {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      setExporting(false);
    });
  }
  if (overview.phase === "loading") return SkeletonRows({ rows: 3, height: 60 });
  if (overview.phase === "error") {
    return (0, import_react10.createElement)(
      "div",
      null,
      h(ErrorAlert, {
        title: "\u8BFB\u4E0D\u5230\u6210\u672C\u6570\u636E",
        body: "\u5E93\u672C\u8EAB\u53EF\u80FD\u6CA1\u95EE\u9898\uFF0C\u53EA\u662F\u8FD9\u6B21\u7B97\u4E0D\u51FA\u6765\u3002\u300C\u7B97\u4E0D\u51FA\u6765\u300D\u548C\u300C\u662F\u96F6\u300D\u662F\u4E24\u4EF6\u4E8B\uFF0C\u6240\u4EE5\u8FD9\u91CC\u4E0D\u663E\u793A 0\u3002",
        actions: [Primary({ children: "\u91CD\u8BD5", onClick: overview.reload, attrs: { "data-action": "retry" } })]
      })
    );
  }
  const data = overview.data;
  if (data === void 0) {
    return (0, import_react10.createElement)(
      "div",
      null,
      h(ErrorAlert, {
        title: "\u6CA1\u8BFB\u5230\u6210\u672C\u6570\u636E",
        body: "\u4E0D\u662F\u300C\u90FD\u662F\u96F6\u300D\uFF0C\u662F\u8FD9\u6B21\u6CA1\u8BFB\u5230\u2014\u2014\u4E24\u8005\u4E0D\u4E00\u6837\u3002\u5148\u91CD\u8BD5\uFF1B\u5982\u679C\u4E00\u76F4\u7A7A\u767D\uFF0C\u53BB\u300C\u4ECA\u5929\u300D\u770B\u5E93\u6839\u76EE\u5F55\u8FD8\u5728\u4E0D\u5728\u3002",
        actions: [Primary({ children: "\u91CD\u8BD5", onClick: overview.reload, attrs: { "data-action": "retry" } })]
      })
    );
  }
  return (0, import_react10.createElement)(
    "div",
    { className: "dmo-pane" },
    PaneHead({
      pageName: "\u5E93\u5065\u5EB7",
      lede: "\u6BCF\u8BF7\u6C42\u90FD\u4ED8\u7684\u94B1\uFF0C\u548C\u53EA\u5728\u88AB\u8BFB\u65F6\u624D\u4ED8\u7684\u94B1",
      ledeSub: "\u6DF7\u5728\u4E00\u8D77\u770B\u4F1A\u4F18\u5316\u9519\u4E1C\u897F\u2014\u2014\u6309\u5B83\u4F18\u5316\u7D22\u5F15\u6587\u4EF6\uFF0C\u6BCF\u8BF7\u6C42\u6210\u672C\u4E00\u5206\u4E0D\u7701\u3002"
    }),
    /* v6 评审 P0-1：成本区 = 本页唯一重卡；维护/导出 = 静卡。
       行分隔的 border-l1 从此只在卡内出现。 */
    (0, import_react10.createElement)(
      "section",
      { className: "dmo-card-heavy" },
      h("p", { className: "dmo-suggest-label" }, "\u6210\u672C\u6784\u6210"),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-cost" },
        CostRow({
          name: "\u6BCF\u8BF7\u6C42\u6210\u672C",
          value: count(data.kpi.residentTokens),
          note: `tokens / \u8BF7\u6C42\uFF0C\u9884\u7B97 ${count(data.kpi.residentBudget)}\u3002\u8FD9\u662F\u552F\u4E00\u6BCF\u8BF7\u6C42\u90FD\u4ED8\u7684\u94B1\uFF1Askill description + \u76EE\u5F55\u6846\u67B6\u3002\u8D85\u4E86\u8981\u538B\u7F29 skill description\uFF0C\u6539\u7D22\u5F15\u6587\u4EF6\u4E00\u5206\u4E0D\u7701\u3002`
        }),
        CostRow({
          name: "\u7D22\u5F15\u4F53\u79EF",
          value: count(data.kpi.indexTokens),
          note: "\u6240\u6709 layer: l0 \u6587\u4EF6\u4E4B\u548C\uFF0C\u53EA\u5728\u88AB read \u65F6\u624D\u8FDB\u4E0A\u4E0B\u6587\u3002\u8FD9\u4E2A\u6570\u5927\u4E0D\u4EE3\u8868\u8D35\u3002"
        }),
        CostRow({
          name: "\u5168\u5E93\u4F53\u79EF",
          value: count(data.tokens),
          note: `${count(data.files)} \u6761\u8BB0\u5FC6\u7684\u6B63\u6587\u5408\u8BA1\uFF0C\u542B frontmatter \u4E0E\u8BC1\u636E\u94FE\u3002`
        }),
        (0, import_react10.createElement)(
          "div",
          { className: "dmo-meta-row" },
          h("span", { className: "dmo-meta" }, `\u9A73\u56DE\u9759\u9ED8 ${count(health.data?.silenced.length ?? 0)} \u6761`),
          h("span", { className: "dmo-meta" }, `\u5F85\u590D\u6838 ${count(health.data?.stale.length ?? 0)} \u6761`),
          h("span", { className: "dmo-meta" }, `\u8D85 80 \u884C ${count(health.data?.overLimit ?? 0)} \u7BC7`),
          h("span", { className: "dmo-meta" }, `\u547D\u4E2D\u7387 ${data.rates.hitRate === null ? "\u2014" : `${Math.round(data.rates.hitRate * 100)}%`}`),
          h("span", { className: "dmo-meta" }, `\u786E\u8BA4\u7387 ${data.rates.confirmRate === null ? "\u2014" : `${Math.round(data.rates.confirmRate * 100)}%`}`),
          h("span", { className: "dmo-meta" }, `\u5F85\u62CD\u677F ${count(data.kpi.pending)}`),
          h("span", { className: "dmo-meta" }, "\u300C\u2014\u300D= \u5206\u6BCD\u4E3A 0\uFF0C\u4E0D\u662F 0%")
        )
      )
    ),
    (0, import_react10.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      SectionHead({ title: "\u7EF4\u62A4", count: "\u6309\u9700\u8DD1" }),
      h(
        "p",
        { className: "dmo-note", style: { marginTop: 0 } },
        "\u8FD9\u4E9B\u90FD\u4F1A\u6539\u8BB0\u5FC6\u7684\u5185\u5BB9\u6216\u53EF\u4FE1\u5EA6\uFF0C\u6240\u4EE5\u4E00\u5F8B\u5148\u7ED9\u9884\u89C8\u3001\u4F60\u70B9\u4E86\u624D\u6267\u884C\u3002"
      ),
      (0, import_react10.createElement)(MaintenancePanel, { onOpenMemory: () => {
      } })
    ),
    (0, import_react10.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      SectionHead({ title: "\u5BFC\u51FA" }),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-row-actions", style: { marginTop: 0 } },
        Btn({ children: "\u5168\u90E8 Markdown", small: true, disabled: exporting, onClick: () => {
          doExport("markdown");
        }, attrs: { "data-action": "export" } }),
        Btn({ children: "\u4EC5\u4E2A\u4EBA\u57DF", small: true, disabled: exporting, onClick: () => {
          doExport("markdown", "personal");
        }, attrs: { "data-action": "export" } }),
        Btn({ children: "\u4EC5\u5DE5\u4F5C\u57DF", small: true, disabled: exporting, onClick: () => {
          doExport("markdown", "work");
        }, attrs: { "data-action": "export" } })
      ),
      feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text })
    ),
    /* 前进方向：只读诊断页不该走死路（v4 裁决保留）。
       v6 评审 P1-3：本页唯一重卡是成本卡，这张前进卡降为静卡。 */
    (0, import_react10.createElement)(
      "section",
      { className: "dmo-card-quiet" },
      h("p", { className: "dmo-note", style: { marginTop: 0 } }, "\u770B\u5B8C\u4E86\u3002\u73B0\u5728\u8BE5\u505A\u7684\u4E8B\u5728\u300C\u4ECA\u5929\u300D\u3002"),
      (0, import_react10.createElement)(
        "div",
        { className: "dmo-row-actions" },
        Primary({ children: "\u56DE\u4ECA\u5929\uFF0C\u770B\u8BE5\u505A\u4EC0\u4E48", onClick: onGotoToday, attrs: { "data-action": "goto", "data-pane": "today" } })
      )
    )
  );
}

// src/client/panel.ts
var PANES = [
  { id: "today", label: "\u4ECA\u5929" },
  { id: "capture", label: "\u8BB0\u4E00\u6761" },
  { id: "todo", label: "\u5F85\u529E" },
  { id: "memory", label: "\u8BB0\u5FC6" },
  { id: "health", label: "\u5E93\u5065\u5EB7" }
];
function PanelIcon({ size }) {
  return (0, import_react11.createElement)(MemoryIcon, { size: typeof size === "number" ? size : 18 });
}
function MemoryOpsPage(props) {
  const ctx = props.ctx;
  const { cwd, project } = useSessionProject(ctx);
  const [pane, setPane] = (0, import_react11.useState)("today");
  const [detailPath, setDetailPath] = (0, import_react11.useState)(void 0);
  const requestedPane = usePaneRequest();
  (0, import_react11.useEffect)(() => {
    const next = consumePaneRequest();
    if (next === void 0) return;
    setPane(next);
    if (next !== "memory") setDetailPath(void 0);
  }, [requestedPane]);
  const snapshot = useBridge("snapshot", scopeBody(cwd, project), [cwd, project]);
  const queueCount = snapshot.data?.queue.length ?? 0;
  const openDetail = (path) => {
    setDetailPath(path ?? void 0);
    if (path !== null) setPane("memory");
  };
  let body;
  switch (pane) {
    case "capture":
      body = (0, import_react11.createElement)(CapturePane);
      break;
    case "todo":
      body = (0, import_react11.createElement)(TodoPane, { onOpenDetail: openDetail });
      break;
    case "memory":
      body = (0, import_react11.createElement)(MemoryPane, { ctx, detailPath, onOpenDetail: openDetail });
      break;
    case "health":
      body = (0, import_react11.createElement)(HealthPane, { onGotoToday: () => {
        setPane("today");
      } });
      break;
    default:
      body = (0, import_react11.createElement)(TodayPane, { ctx, onOpenDetail: openDetail });
  }
  return (0, import_react11.createElement)(
    "div",
    { className: "dmo-root" },
    (0, import_react11.createElement)(
      "div",
      { className: "dmo-head" },
      (0, import_react11.createElement)(
        "div",
        { className: "dmo-head-row" },
        (0, import_react11.createElement)("h1", { className: "dmo-app-name" }, "\u8BB0\u5FC6\u5E93"),
        (0, import_react11.createElement)("span", { className: "dmo-scope" }, snapshot.data?.root ?? "")
      ),
      (0, import_react11.createElement)(
        "nav",
        { className: "dmo-nav", role: "tablist" },
        PANES.map((item) => (0, import_react11.createElement)(
          "button",
          {
            key: item.id,
            type: "button",
            role: "tab",
            className: "dmo-nav-item",
            "data-pane": item.id,
            "aria-selected": pane === item.id,
            "aria-controls": "memory-ops-tabpanel",
            onClick: () => {
              setPane(item.id);
              if (item.id !== "memory") setDetailPath(void 0);
            }
          },
          item.label,
          item.id === "todo" && queueCount > 0 ? (0, import_react11.createElement)("span", { className: "dmo-nav-count" }, String(queueCount)) : null
        ))
      )
    ),
    (0, import_react11.createElement)("div", { className: "dmo-body", role: "tabpanel", id: "memory-ops-tabpanel" }, body)
  );
}

// src/client/session-view.ts
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
    const ok = gotoPane(ctx, "todo");
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
        (0, import_react12.createElement)("span", null, "\u672C\u6B21\u7528\u5230")
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
      { className: "dmo-hrow", style: { marginTop: 4 } },
      (0, import_react12.createElement)(Button, { small: true, onClick: reload }, "\u5237\u65B0"),
      (0, import_react12.createElement)(Button, { small: true, onClick: () => {
        goMisses(true);
      } }, "\u53BB\u672A\u547D\u4E2D\u5DE5\u4F5C\u53F0")
    )
  );
}

// src/client/capture-tab.ts
var import_react13 = require("react");
var CAPTURE_KIND = "memory-ops";
var KINDS2 = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
function CapturePane2() {
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
      KINDS2.map((item) => (0, import_react13.createElement)(Chip, {
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

// src/client/remember.ts
var import_react14 = require("react");
var import_react_dom = require("react-dom");

// src/client/remember-logic.ts
var COMMAND_NAME = "remember";
var KINDS3 = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
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

// src/client/remember.ts
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
    const lingerMs = state2.toast.savedContent === void 0 ? 5e3 : 3e4;
    const timer = setTimeout(() => {
      setRememberToast(sessionId, null);
    }, lingerMs);
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
    if (typeof document === "undefined") return null;
    return (0, import_react_dom.createPortal)((0, import_react14.createElement)(
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
    ), document.body);
  }
  if (typeof document === "undefined") return null;
  const foot = (0, import_react14.createElement)(
    "div",
    { className: "dmo-remember-foot" },
    (0, import_react14.createElement)(
      "span",
      { className: "dmo-row-sub", style: { marginTop: 0 } },
      "\u5B58\u5165\u540E\u53EF\u5728\u6D6E\u5C42\u91CC 30 \u79D2\u5185\u64A4\u9500"
    ),
    (0, import_react14.createElement)(
      "div",
      { className: "dmo-hrow", style: { flex: "0 0 auto" } },
      (0, import_react14.createElement)(Button, { onClick: close }, "\u53D6\u6D88"),
      (0, import_react14.createElement)(Button, {
        variant: "primary",
        disabled: busy || text.trim() === "",
        onClick: submit
      }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u4E00\u6761")
    )
  );
  const blockedBlock = blocked === null ? null : (0, import_react14.createElement)(
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
  );
  const body = (0, import_react14.createElement)(
    "div",
    { className: "dmo-remember-body" },
    (0, import_react14.createElement)(
      "div",
      { className: "dmo-hrow" },
      (0, import_react14.createElement)("select", {
        className: "dmo-select",
        value: kind,
        "aria-label": "\u8BB0\u5F55\u7C7B\u578B",
        onChange: (event) => {
          setKind(event.target.value);
        }
      }, KINDS3.map((item) => (0, import_react14.createElement)("option", { key: item, value: item }, item)))
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
    blockedBlock,
    error === null ? null : (0, import_react14.createElement)("div", { className: "dmo-toast dmo-toast-err", role: "alert" }, error),
    foot
  );
  const card = (0, import_react14.createElement)(
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
    body
  );
  const backdrop = (0, import_react14.createElement)("div", {
    className: "dmo-remember-backdrop",
    // 点遮罩关闭；卡片内的点击不冒泡上来
    onClick: close,
    role: "presentation"
  }, card);
  return (0, import_react_dom.createPortal)(backdrop, document.body);
}

// src/client/register.ts
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
        gotoPane(ctx, "todo", layoutService);
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
  }, CapturePane2))));
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

// src/client/styles.ts
var STYLE_ID = "dsh-memory-ops-style";
var CSS = `
/* \u2014\u2014 \u8BBE\u8BA1\u4EE4\u724C\uFF1A\u5C3A\u5BF8\u672C\u5730\u5B9A\u4E49\uFF0C\u989C\u8272\u4E00\u5F8B\u7528\u5BBF\u4E3B token \u2014\u2014
 *
 * \u26A0\uFE0F \u4EE4\u724C\u5FC5\u987B\u6302\u5728**\u6240\u6709\u63D2\u4EF6\u6839**\u4E0A\uFF0C\u4E0D\u80FD\u53EA\u6302 .dmo-root\uFF1A
 * \u4F1A\u8BDD tab\uFF08.dmo-session\uFF09\u4E0E /remember \u6D6E\u5C42\uFF08portal \u5230 document.body\uFF09
 * \u90FD\u4E0D\u5728 .dmo-root \u5B50\u6811\u91CC\uFF0C\u53EA\u6302 .dmo-root \u65F6\u90A3\u4E9B\u6811\u91CC\u7684 var(--s4)\u3001
 * var(--accent)\u3001var(--r-overlay) \u5168\u90E8\u89E3\u6790\u5931\u8D25\u2014\u2014\u5F39\u7A97\u5373\u4FBF\u7C7B\u540D\u8865\u56DE\u6765\u4E86\uFF0C
 * \u5185\u8FB9\u8DDD\u4E0E\u5706\u89D2\u4E5F\u662F\u574F\u7684\u3002:where() \u96F6\u7279\u5F02\u6027\uFF0C\u81EA\u5B9A\u4E49\u5C5E\u6027\u9760\u7EE7\u627F\u751F\u6548\u3002 */
:where(.dmo-root, .dmo-session, .dmo-capture-pane, .dmo-overlay, .dmo-remember-backdrop, .dmo-remember-toast) {
  --t1: 24px;  --t1-lh: 32px;
  --t2: 20px;  --t2-lh: 28px;
  --t3: 16px;  --t3-lh: 24px;
  --t4: 14px;  --t4-lh: 22px;
  --t5: 12px;  --t5-lh: 18px;
  --s1: 4px;  --s2: 8px;  --s3: 12px;
  --s4: 16px; --s5: 24px; --s6: 32px;
  --r-row: 0;
  --r-control: 6px;
  --r-container: 8px;
  --r-overlay: 12px;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur: 120ms;
  --dur-overlay: 180ms;
  --accent: var(--dsw-alias-state-business-primary);
  --accent-soft: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  --accent-line: color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, transparent);
}

.dmo-root {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base));
}
.dmo-root *, .dmo-root *::before, .dmo-root *::after { box-sizing: border-box; }
.dmo-root button, .dmo-root input, .dmo-root textarea, .dmo-root select { font: inherit; color: inherit; }

/* ============ \u9762\u677F\u5916\u58F3 ============ */
.dmo-head { flex: 0 0 auto; padding: var(--s3) var(--s3) 0; overflow: hidden; }
.dmo-head-row { display: flex; align-items: baseline; gap: var(--s2); margin-bottom: var(--s2); }
.dmo-app-name {
  font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600;
  letter-spacing: 0.02em; margin: 0;
}
.dmo-scope {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin-left: auto;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;
}

/* v6 \u5BFC\u822A\uFF1A\u5206\u6BB5\u63A7\u4EF6\u3002\u8F68\u9053 = module \u5E95 + \u63CF\u8FB9\uFF1B\u9009\u4E2D = \u767D\u5E95\u6D6E\u8D77 + \u52A0\u7C97\u3002
   \u8BA1\u6570\u7528\u84DD\u5B57\uFF08v4 \u7684\u7070\u5B57\u5728\u6DF1\u8272\u4E0B\u51E0\u4E4E\u4E0D\u53EF\u89C1\uFF09\u3002 */
.dmo-nav {
  display: flex; gap: var(--s1);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-container);
  padding: var(--s1); margin-bottom: var(--s3);
  overflow-x: auto; scrollbar-width: none;
}
.dmo-nav::-webkit-scrollbar { display: none; }
.dmo-nav-item {
  appearance: none; border: 1px solid transparent; background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--t5); line-height: var(--t5-lh);
  padding: var(--s1) var(--s2);
  border-radius: var(--r-control);
  cursor: pointer; white-space: nowrap; flex: 1 0 auto; text-align: center;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
              border-color var(--dur) var(--ease);
}
.dmo-nav-item:hover { color: var(--dsw-alias-label-primary); }
.dmo-nav-item:active { background: var(--dsw-alias-interactive-bg-hover); }
.dmo-nav-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-nav-item[aria-selected="true"] {
  background: var(--dsw-alias-bg-base);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary); font-weight: 600;
}
.dmo-nav-count {
  font-family: var(--mono); font-size: var(--t5); font-weight: 600;
  color: var(--accent); margin-left: var(--s1);
  font-variant-numeric: tabular-nums;
}

.dmo-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: var(--s3); display: flex; flex-direction: column; gap: var(--s3); }

/* \u5206\u533A\u6839\uFF1A\u9762\u677F\u4F53\u662F flex\uFF0C\u4F46\u5404\u5206\u533A\u8FD4\u56DE\u5355\u4E2A wrapper div\u2014\u2014
   \u6CA1\u6709\u8FD9\u4E2A\u7C7B\u7684\u8BDD s3 \u95F4\u8DDD\u4F20\u4E0D\u8FDB\u53BB\uFF0C\u533A\u5757\u4F1A\u6324\u6210\u4E00\u5768\uFF08\u8BC4\u5BA1 P0-1 \u7684\u6392\u7248\u534A\u8FB9\uFF09\u3002 */
.dmo-pane { display: flex; flex-direction: column; gap: var(--s3); }

/* ============ \u6392\u7248\u539F\u8BED ============ */
.dmo-lede {
  font-size: var(--t1); line-height: var(--t1-lh); font-weight: 600;
  letter-spacing: -0.01em; margin: 0 0 var(--s1); word-break: break-word;
}
.dmo-lede-sub {
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-secondary); margin: 0;
}
.dmo-page-name {
  font-size: var(--t5); line-height: var(--t5-lh); font-weight: 600;
  letter-spacing: 0.06em; margin: 0 0 var(--s1);
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
}

.dmo-section-head {
  display: flex; align-items: baseline; gap: var(--s2);
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding-top: var(--s2);
}
.dmo-section-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; letter-spacing: 0.02em; margin: 0; }
.dmo-section-count { font-family: var(--mono); font-size: var(--t5); color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }

/* \u5143\u4FE1\u606F\uFF1A\u7B49\u5BBD + \u6B21\u8981\u8272\uFF08\u7B2C\u4E8C\u5B57\u4F53\u8EAB\u4EFD\uFF09 */
.dmo-meta {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;
}
.dmo-meta-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s1) var(--s2); margin-top: 2px; }
.dmo-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: var(--s2) 0 0; }

/* ============ \u72B6\u6001\u7B7E\uFF08v6\uFF1Atint \u5E95 + \u65B9\u70B9 + \u6587\u5B57\uFF1B\u5706\u89D2 0\uFF09 ============ */
/* \u6587\u5B57\u4E00\u5F8B label-primary\u2014\u2014\u5F69\u8272\u53EA\u51FA\u73B0\u5728\u5E95\u4E0E\u65B9\u70B9\u4E0A\uFF08\u65B9\u5411\u5361 \xA7\u4E03-2 \u5BF9\u6BD4\u5EA6\u88C1\u51B3\uFF09\u3002 */
.dmo-tag {
  display: inline-flex; align-items: center; gap: var(--s1);
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  padding: 0 var(--s1); border-radius: var(--r-row);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  white-space: nowrap;
}
.dmo-tag::before {
  content: ""; flex: 0 0 auto; width: 6px; height: 6px;
  background: var(--dsw-alias-state-idle-primary);
}
.dmo-tag[data-tone="warn"] { background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)); }
.dmo-tag[data-tone="warn"]::before { background: var(--dsw-alias-state-warn-primary); }
.dmo-tag[data-tone="ok"] { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); }
.dmo-tag[data-tone="ok"]::before { background: var(--dsw-alias-state-success-primary); }
.dmo-tag[data-tone="err"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dmo-tag[data-tone="err"]::before { background: var(--dsw-alias-state-error-primary); }
.dmo-tag[data-tone="live"] { background: var(--accent-soft); }
.dmo-tag[data-tone="live"]::before { background: var(--accent); }

/* ============ \u5EFA\u8BAE\u5361 ============ */
.dmo-suggest {
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-container);
  padding: var(--s3);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
  display: flex; flex-direction: column; gap: var(--s1);
}
.dmo-suggest-label {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin: 0;
}
.dmo-suggest-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0; word-break: break-word; }
.dmo-suggest-body { font-size: var(--t4); line-height: var(--t4-lh); margin: 0; word-break: break-word; }
.dmo-suggest-actions { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-top: var(--s2); }

/* ============ \u6309\u94AE\uFF1A\u4E3B\u6309\u94AE = \u4E1A\u52A1\u84DD\u5B9E\u5E95\uFF08\u6BCF\u5C4F \u22641\uFF09 ============ */
.dmo-btn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  border-radius: var(--r-control); padding: var(--s1) var(--s3);
  font-size: var(--t4); line-height: var(--t4-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
              filter var(--dur) var(--ease);
}
.dmo-btn:hover:not(:disabled):not(.dmo-btn-primary) { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-btn:active:not(:disabled):not(.dmo-btn-primary) { background: var(--dsw-alias-interactive-bg-active); }
.dmo-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-btn:disabled { opacity: 0.42; cursor: not-allowed; }
.dmo-btn-primary {
  background: var(--dsw-alias-button-info-fill, var(--accent));
  border-color: var(--dsw-alias-button-info-fill, var(--accent));
  /* v6 \u8BC4\u5BA1 P1-4\uFF1Alabel-on-color \u4E24\u5957\u4E3B\u9898\u90FD\u662F\u767D\u8272\uFF08\u5BBF\u4E3B\u5B9E\u6D4B\uFF09\uFF0C
     \u6DF1\u8272\u4E0B\u767D\u5B57 on deepseek-400 \u53EA\u6709 \u22482.3:1\u3002\u6587\u5B57\u6539\u7528 bg-base\u2014\u2014
     \u6D45=\u767D\uFF08on deepseek-500 \u22484.6:1\uFF09\uFF0C\u6DF1=\u8FD1\u9ED1\uFF08on deepseek-400 \u22489:1\uFF09\u3002 */
  color: var(--dsw-alias-bg-base);
  font-weight: 600;
}
.dmo-btn-primary:hover:not(:disabled) {
  /* \u4E0D\u5207 info-hover\uFF08\u6D45\u8272\u4E0B\u5B83\u66F4\u4EAE\uFF0C\u767D\u5B57\u5BF9\u6BD4\u53CD\u800C\u8DCC\uFF09\uFF1B\u6309\u52A8\u4F5C\u538B\u6697\uFF0C\u4E24\u4E3B\u9898\u5BF9\u6BD4\u53EA\u5347\u4E0D\u964D */
  filter: brightness(0.92);
}
.dmo-btn-primary:active:not(:disabled) { filter: brightness(0.86); }
.dmo-btn-sm { padding: 0 var(--s2); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-btn-quiet {
  border-color: transparent; background: transparent;
  color: var(--dsw-alias-label-secondary); padding-left: var(--s2); padding-right: var(--s2);
}
.dmo-btn-quiet:hover:not(:disabled) {
  background: transparent; color: var(--dsw-alias-label-primary);
  text-decoration: underline; text-underline-offset: 2px;
}
.dmo-btn-danger {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.dmo-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }

.dmo-textlink {
  appearance: none; border: 0; background: none; padding: 0;
  color: var(--dsw-alias-link, var(--accent));
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  text-decoration: underline; text-underline-offset: 2px;
  text-decoration-color: color-mix(in srgb, var(--dsw-alias-link, var(--accent)) 40%, transparent);
  transition: text-decoration-color var(--dur) var(--ease);
}
.dmo-textlink:hover { text-decoration-color: currentColor; }
.dmo-textlink:active { text-decoration-color: currentColor; }
.dmo-textlink:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }

/* ============ \u8F93\u5165\u4E0E\u6355\u83B7 ============ */
.dmo-capture {
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-base); padding: var(--s2);
  transition: border-color var(--dur) var(--ease);
}
/* \u987A\u5E8F\u5373\u4F18\u5148\u7EA7\uFF1Afocus > active > hover\uFF08\u540C\u7279\u5F02\u6027\uFF0C\u540E\u5199\u80DC\u51FA\uFF09\u3002
   \u7126\u70B9\u73AF\u8C41\u514D\uFF08\u65B9\u5411\u5361 \xA7\u4E03-1 \u8F93\u5165\u7C7B\u4F8B\u5916\uFF09\uFF1A\u6574\u5757\u662F\u8F93\u5165\u533A\u65F6\uFF0C
   \u7126\u70B9\u7531\u5BB9\u5668\u8FB9\u6846\u53D8\u84DD\u8868\u8FBE\uFF08accent \u5B9E\u8272\u8FB9\uFF0C\u975E 2px outline\u2014\u2014\u4E24\u5C42\u73AF\u4F1A
   \u770B\u7740\u50CF\u63A7\u4EF6\u5957\u63A7\u4EF6\uFF09\uFF0C\u5185\u5C42\u7ED9\u4E00\u5C42\u6D45\u5E95\u8272\u4F5C\u4E3A\u843D\u70B9\u3002v6 \u8BC4\u5BA1 Quick-win 2
   \u8D28\u7591\u8FC7\u8FD9\u91CC\u6CA1\u6709 outline\uFF1B\u88C1\u51B3\uFF1A\u8FB9\u6846\u53D8\u84DD + \u5185\u5C42\u5E95\u8272\u5373\u6EE1\u8DB3
   \u300C\u952E\u76D8\u7528\u6237\u6709\u53EF\u89C1\u843D\u70B9\u300D\uFF0C\u4E0D\u8865\u7B2C\u4E8C\u5C42\u73AF\u3002 */
.dmo-capture:hover { border-color: var(--dsw-alias-border-l4); }
.dmo-capture:active { border-color: var(--dsw-alias-label-secondary); }
.dmo-capture:focus-within { border-color: var(--accent); }
.dmo-capture-input {
  width: 100%; border: 0; background: transparent; resize: vertical;
  min-height: 40px; font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s1); outline: none; border-radius: var(--r-control);
  transition: background var(--dur) var(--ease);
}
.dmo-capture-input::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.dmo-capture-input:focus-visible { background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1)); }
.dmo-capture-foot { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) var(--s1) 0; }
.dmo-capture-hint { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }

.dmo-input {
  width: 100%; border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--r-control); background: var(--dsw-alias-bg-base);
  padding: var(--s1) var(--s2); font-size: var(--t4); line-height: var(--t4-lh);
  transition: border-color var(--dur) var(--ease);
}
.dmo-input::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.dmo-input:hover { border-color: var(--dsw-alias-border-l4); }
.dmo-input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }

.dmo-toolbar { display: flex; gap: var(--s2); }
.dmo-toolbar > .dmo-input { flex: 1 1 auto; min-width: 0; }

/* \u7C7B\u578B/\u7B5B\u9009\u7B7E\uFF1A\u9009\u4E2D = \u84DD\u7EBF + \u84DD\u5B57 + \u84DD tint\uFF08v6\uFF09 */
.dmo-kindrow { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-kindbtn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
              border-color var(--dur) var(--ease);
}
.dmo-kindbtn:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.dmo-kindbtn:active { background: var(--dsw-alias-interactive-bg-active); }
.dmo-kindbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-kindbtn[aria-pressed="true"] {
  border-color: var(--accent-line); color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  font-weight: 600;
}

/* ============ \u53F0\u8D26\u884C\uFF1A36px \u5BC6\u6392\uFF08v6 \u6838\u5FC3\u8282\u594F\uFF09 ============ */
.dmo-list { list-style: none; margin: 0; padding: 0; }
.dmo-row { padding: var(--s2); border-bottom: 1px solid var(--dsw-alias-border-l1); min-height: 36px; }
.dmo-row:last-child { border-bottom: 0; }

/* \u6A2A\u5411\u6309\u94AE/\u63A7\u4EF6\u884C\u3002v4 \u66FE\u628A\u4E24\u79CD\u8BED\u4E49\u5171\u7528 .dmo-row\uFF08\u540E\u5199\u7684 display:flex
   \u8986\u76D6\u4E86\u53F0\u8D26\u884C\u5E03\u5C40\uFF09\uFF1Bv6 \u62C6\u5F00\uFF1A\u53F0\u8D26\u884C\u5F52 .dmo-row\uFF0C\u6A2A\u6392\u5F52 .dmo-hrow\u3002 */
.dmo-hrow { display: flex; gap: var(--s2); align-items: center; }
.dmo-hrow > * { min-width: 0; }
.dmo-list-clickable .dmo-row {
  margin: 0 calc(var(--s2) * -1); padding-left: var(--s2); padding-right: var(--s2);
  border-radius: var(--r-row);
  transition: background var(--dur) var(--ease);
}
.dmo-list-clickable .dmo-row:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-1)); }
.dmo-row-title { font-size: var(--t4); line-height: var(--t4-lh); margin: 0; word-break: break-word; }
.dmo-row-button {
  appearance: none; border: 0; background: none; padding: 0; text-align: left;
  width: 100%; color: inherit; cursor: pointer;
  font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word;
  transition: color var(--dur) var(--ease);
}
.dmo-row-button:hover { color: var(--dsw-alias-link, var(--accent)); }
.dmo-row-button:active { color: var(--dsw-alias-link, var(--accent)); }
.dmo-row-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-row-actions { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); flex-wrap: wrap; }

/* ============ \u56DB\u6001 ============ */
.dmo-skeleton {
  background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-1));
  border-radius: var(--r-control);
  animation: dmo-breathe 1.2s ease-in-out infinite; margin-bottom: var(--s2);
}
@keyframes dmo-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.dmo-empty { padding: var(--s5) var(--s3); text-align: center; }
.dmo-empty-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-empty-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s4); }
.dmo-empty-actions { display: flex; gap: var(--s2); justify-content: center; flex-wrap: wrap; }

/* \u9519\u8BEF\u6001\uFF1Atint \u5E95 + \u53EF\u89C1\u7EA2\u8FB9\uFF1B\u6807\u9898 primary\uFF0C\u8BF4\u6E05\u600E\u4E48\u89E3\u51B3 */
.dmo-alert {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border-radius: var(--r-container); padding: var(--s3);
}
.dmo-alert-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; color: var(--dsw-alias-label-primary); margin: 0 0 var(--s1); }
.dmo-alert-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-alert-actions { display: flex; gap: var(--s2); flex-wrap: wrap; }

/* \u63D0\u793A\u6761\uFF1Atint \u5E95 + \u65B9\u70B9\u4FE1\u53F7\uFF0C\u4E0D\u7528\u5DE6\u4FA7\u5F69\u8FB9 */
.dmo-notice {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  padding: var(--s2) var(--s3);
}
.dmo-notice-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-notice-text { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0; }
.dmo-notice[data-tone="warn"] {
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent));
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
}
.dmo-notice[data-tone="err"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
}

/* \u5C31\u5730\u53CD\u9988\uFF1Atint \u5E95\u6761\uFF0C\u6587\u672C\u7EE7\u627F\u5BB9\u5668\u8272 */
.dmo-inline-done {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s2); border-radius: var(--r-control);
  background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent));
  color: var(--dsw-alias-label-primary);
  margin-top: var(--s2);
  animation: dmo-fade var(--dur) var(--ease);
}
@keyframes dmo-fade { from { opacity: 0; } to { opacity: 1; } }
.dmo-inline-done[data-tone="err"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.dmo-inline-done-text { color: inherit; }

/* ============ \u4ECA\u5929\u9875\uFF1AKPI \u8D26\u5E26\uFF08v6\uFF1A\u5355\u6761 4 \u683C\uFF0C\u6570\u5B57\u53F3\u5BF9\u9F50\u57FA\u7EBF\uFF09 ============ */
.dmo-trail {
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--r-container); overflow: hidden;
}
.dmo-trail-line {
  display: flex; flex-direction: column; align-items: flex-end; gap: 0;
  padding: var(--s2) var(--s1);
  border: 0; border-left: 1px solid var(--dsw-alias-border-l1);
  appearance: none; background: transparent;
  cursor: pointer; color: var(--dsw-alias-label-primary);
  text-align: right; min-width: 0;
  transition: background var(--dur) var(--ease);
}
.dmo-trail-line:first-child { border-left: 0; align-items: flex-start; text-align: left; padding-left: var(--s3); }
.dmo-trail-line:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-trail-line:active { background: var(--dsw-alias-interactive-bg-active); }
.dmo-trail-line:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.dmo-trail-num {
  font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.dmo-trail-line:first-child .dmo-trail-num { color: var(--accent); }
.dmo-trail-text {
  font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

/* ============ \u8BE6\u60C5 ============ */
.dmo-back { margin-bottom: var(--s2); }
.dmo-detail-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s1); word-break: break-word; }
.dmo-evidence {
  border-left: 2px solid var(--dsw-alias-border-l3); padding-left: var(--s2);
  margin: var(--s2) 0; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
}
.dmo-body-block {
  font-size: var(--t4); line-height: var(--t4-lh); white-space: pre-wrap;
  word-break: break-word; margin: var(--s2) 0; max-height: 220px; overflow-y: auto;
  background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-control); padding: var(--s2) var(--s3);
}
.dmo-more { margin-top: var(--s2); }
.dmo-more > summary {
  cursor: pointer; font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); list-style: none;
  display: inline-flex; align-items: center; gap: var(--s1); padding: 0;
  transition: color var(--dur) var(--ease);
}
.dmo-more > summary::-webkit-details-marker { display: none; }
.dmo-more > summary::before { content: "\u25B8"; display: inline-block; font-size: var(--t5); transition: transform var(--dur) var(--ease); }
.dmo-more[open] > summary::before { transform: rotate(90deg); }
.dmo-more[open] > summary { margin-bottom: var(--s2); }
.dmo-more > summary:hover { color: var(--dsw-alias-label-primary); }
.dmo-more > summary:active { color: var(--dsw-alias-label-primary); text-decoration: underline; }
.dmo-more > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-more-body { padding: var(--s2) var(--s3); display: flex; flex-direction: column; gap: var(--s2); background: var(--dsw-alias-bg-module-platform, transparent); border-radius: var(--r-control); }

/* ============ \u6210\u672C\u884C\uFF08\u5E93\u5065\u5EB7\uFF09\uFF1A\u6570\u5B57\u53F3\u5BF9\u9F50\u540C\u4E00\u57FA\u7EBF ============ */
.dmo-cost { padding-top: var(--s1); }
.dmo-cost-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; }
.dmo-cost-name { font-size: var(--t4); line-height: var(--t4-lh); }
.dmo-cost-num {
  margin-left: auto; font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.dmo-cost-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s2); }
.dmo-jobs { display: flex; flex-wrap: wrap; gap: var(--s1); margin-top: var(--s2); }

/* ============ \u6742\u9879 ============ */
.dmo-degrade {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
  border-radius: var(--r-container);
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent));
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
}
.dmo-error {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  border-radius: var(--r-container);
  padding: var(--s3); font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
}
.dmo-row-sub { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: var(--s1); }
.dmo-row-item { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); min-height: 36px; }
.dmo-row-item:last-child { border-bottom: 0; }
.dmo-row-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text { font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word; }
.dmo-check { flex: 0 0 auto; margin-top: 3px; accent-color: var(--accent); }
.dmo-quote { margin: 0; font-size: var(--t4); line-height: var(--t4-lh); }
.dmo-quote::before { content: "\u300C"; }
.dmo-quote::after { content: "\u300D"; }
.dmo-mono { font-family: var(--mono); font-size: var(--t5); }

/* ============ \u6D6E\u5C42\uFF1A\u552F\u4E00\u6709\u9634\u5F71\u7684\u5730\u65B9 ============ */
.dmo-overlay {
  position: fixed; inset: 0; z-index: 40;
  display: flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
  animation: dmo-fade var(--dur-overlay) var(--ease);
}
.dmo-overlay-card {
  width: min(400px, calc(100vw - 32px));
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-overlay);
  padding: var(--s4);
  box-shadow: 0 12px 32px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.4));
}
.dmo-overlay-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s2); }
.dmo-overlay-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-overlay-actions { display: flex; gap: var(--s2); justify-content: flex-end; }

/* ============ /remember \u6D6E\u5C42\uFF08v4 \u91CD\u5199\u65F6\u88AB\u6574\u6BB5\u5220\u9664 \u2192 \u5F39\u7A97\u4E0D\u53EF\u89C1\u7684 bug \u6839\u56E0\uFF1B
   \u672C\u6BB5\u662F\u56DE\u5F52\u951A\u70B9\uFF0C\u4EFB\u4F55\u6837\u5F0F\u91CD\u6784\u90FD\u5FC5\u987B\u4FDD\u7559\u8FD9\u4E9B\u7C7B\uFF09 ============ */
.dmo-remember-backdrop {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
  animation: dmo-fade var(--dur-overlay) var(--ease);
}
.dmo-remember-card {
  width: min(480px, calc(100% - 32px));
  max-height: min(78vh, 620px);
  display: flex; flex-direction: column; gap: var(--s2);
  padding: var(--s4);
  border-radius: var(--r-overlay);
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 12px 32px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.4));
}
.dmo-remember-head { display: flex; align-items: baseline; gap: var(--s2); }
.dmo-remember-title { font-size: var(--t4); font-weight: 600; }
.dmo-remember-close {
  margin-left: auto; appearance: none; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); font-size: var(--t3); line-height: 1;
  padding: var(--s1) var(--s2); border-radius: var(--r-control); cursor: pointer;
  font-family: inherit;
}
.dmo-remember-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-remember-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-remember-body { display: flex; flex-direction: column; gap: var(--s2); min-height: 0; overflow-y: auto; }
.dmo-remember-input { min-height: 96px; }
.dmo-remember-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); }
.dmo-remember-toast {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  z-index: 190; display: flex; align-items: center; gap: var(--s2);
  padding: var(--s2) var(--s3); border-radius: var(--r-overlay);
  font-size: var(--t4); line-height: var(--t4-lh);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 4px 14px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.28));
  max-width: min(560px, calc(100vw - 32px));
}
.dmo-remember-undo {
  appearance: none; border: 1px solid var(--dsw-alias-border-l3);
  background: transparent; color: var(--accent);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); cursor: pointer; font-family: inherit;
}
.dmo-remember-undo:hover:not(:disabled) { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-remember-undo:disabled { opacity: 0.45; cursor: not-allowed; }
.dmo-remember-dismiss {
  appearance: none; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); cursor: pointer;
  font-size: var(--t4); line-height: 1; padding: 0 var(--s1); font-family: inherit;
}
.dmo-remember-dismiss:hover { color: var(--dsw-alias-label-primary); }

/* ============ \u65E7\u8868\u9762\uFF08\u4F1A\u8BDD tab / \u53F3\u4FA7\u6355\u83B7\uFF09\u6CBF\u7528 v6 \u8BED\u8A00 ============ */
.dmo-session { padding: var(--s3); display: flex; flex-direction: column; gap: var(--s2); }
.dmo-session-kpis { display: flex; gap: var(--s2); }
.dmo-session-kpi {
  flex: 1 1 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2); text-align: center;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-session-kpi b { display: block; font-family: var(--mono); font-size: var(--t2); font-variant-numeric: tabular-nums; font-weight: 600; }
.dmo-session-kpi span { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-capture-pane { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); }
.dmo-recent-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-recent-row:last-child { border-bottom: 0; }
.dmo-recent-main { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dmo-recent-time { flex: 0 0 auto; font-size: var(--t5); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-toast { font-size: var(--t4); line-height: var(--t4-lh); padding: var(--s2); border-radius: var(--r-control); }
.dmo-toast-ok { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); color: var(--dsw-alias-label-primary); }
.dmo-toast-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); color: var(--dsw-alias-label-primary); }
.dmo-lane-head { display: flex; align-items: center; gap: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin-bottom: var(--s1); }
.dmo-lane-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; font-family: var(--mono); }
.dmo-budget {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-budget-row { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) 0; font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-budget-name { flex: 0 0 58px; color: var(--dsw-alias-label-secondary); }
.dmo-budget-bar { flex: 1 1 auto; height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-2)); overflow: hidden; }
.dmo-budget-fill { height: 100%; border-radius: 3px; background: var(--accent); }
.dmo-budget-fill-over { background: var(--dsw-alias-state-warn-primary); }
.dmo-budget-num { flex: 0 0 auto; font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 600; }
.dmo-budget-item { padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-budget-item:last-child { border-bottom: 0; padding-bottom: 0; }
.dmo-budget-head { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-bottom: var(--s1); }
.dmo-badge {
  display: inline-flex; align-items: center; gap: var(--s1); padding: 0 var(--s1);
  border-radius: var(--r-row); font-family: var(--mono);
  font-size: var(--t5); font-weight: 600; line-height: var(--t5-lh);
  white-space: nowrap; color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dmo-badge::before { content: ""; flex: 0 0 auto; width: 6px; height: 6px; background: var(--dsw-alias-state-idle-primary); }
.dmo-badge-ok { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); }
.dmo-badge-ok::before { background: var(--dsw-alias-state-success-primary); }
.dmo-badge-warn { background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)); }
.dmo-badge-warn::before { background: var(--dsw-alias-state-warn-primary); }
.dmo-badge-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dmo-badge-err::before { background: var(--dsw-alias-state-error-primary); }
.dmo-badge-idle { background: var(--dsw-alias-interactive-bg-hover); }
.dmo-badge-idle::before { background: var(--dsw-alias-state-idle-primary); }
.dmo-badge-brand { background: var(--accent-soft); }
.dmo-badge-brand::before { background: var(--accent); }
.dmo-stepper { display: flex; align-items: center; gap: 3px; margin: var(--s2) 0; }
.dmo-step { flex: 1 1 0; height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-2)); }
.dmo-step-on { background: var(--dsw-alias-state-success-primary); }
.dmo-step-now { background: var(--accent); }
.dmo-evidence-src { color: var(--dsw-alias-label-secondary); font-size: var(--t5); line-height: var(--t5-lh); font-family: var(--mono); }
.dmo-anchor-note {
  display: flex; gap: var(--s2); align-items: flex-start;
  padding: var(--s2) var(--s3); border-radius: var(--r-control);
  font-size: var(--t4); line-height: var(--t4-lh); margin: var(--s2) 0;
}
.dmo-anchor-note[data-state="stale"] {
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
}
.dmo-anchor-note[data-state="fresh"] {
  background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent));
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 35%, transparent);
}
.dmo-anchor-note code, .dmo-mono { font-family: var(--mono); font-size: var(--t5); }
.dmo-resident-row { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s1) 0 var(--s1) var(--s2); border-left: 2px solid var(--dsw-alias-border-l2); }
.dmo-resident-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text-link { color: var(--dsw-alias-label-primary); cursor: pointer; }
.dmo-row-text-link:hover { color: var(--dsw-alias-link, var(--accent)); text-decoration: underline; text-underline-offset: 2px; }
.dmo-link { color: var(--dsw-alias-link, var(--accent)); cursor: pointer; }
.dmo-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.dmo-bulk {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  padding: var(--s2) var(--s3); margin-bottom: var(--s2); border-radius: var(--r-container);
  background: var(--accent-soft); border: 1px solid var(--accent-line);
}
.dmo-chips { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-chip {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); line-height: var(--t5-lh);
  cursor: pointer; display: inline-flex; align-items: center; gap: var(--s1);
}
.dmo-chip:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.dmo-chip[aria-pressed="true"] { border-color: var(--accent-line); color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); font-weight: 600; }
.dmo-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-chip-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.dmo-band { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--s1); }
.dmo-band-cell {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-control);
  padding: var(--s2) var(--s1); text-align: center; min-width: 0;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-band-cell[data-active="true"] { border-color: var(--accent-line); background: var(--accent-soft); }
.dmo-band-v { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; font-variant-numeric: tabular-nums; font-family: var(--mono); }
.dmo-band-l { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-band-cell[data-tone="warn"] .dmo-band-v { color: var(--dsw-alias-state-warn-primary); }
.dmo-band-cell[data-tone="ok"] .dmo-band-v { color: var(--dsw-alias-state-success-primary); }
.dmo-group { margin-bottom: var(--s3); }
.dmo-group-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-group-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-group-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; font-family: var(--mono); }
.dmo-skeleton-old {
  height: 52px; border-radius: var(--r-control); margin-bottom: var(--s2);
  background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-1));
  animation: dmo-breathe 1.2s ease-in-out infinite;
}
.dmo-error-old { border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); border-radius: var(--r-container); padding: var(--s2) var(--s3); font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }
.dmo-capture-inline { margin-bottom: var(--s2); }
.dmo-capture-inline .dmo-textarea { min-height: 46px; }
.dmo-textarea {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-control);
  padding: var(--s1) var(--s2); min-height: 70px; resize: vertical;
  font-family: var(--mono);
}
.dmo-textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
.dmo-label { display: block; font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-bottom: var(--s1); }
.dmo-select {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-control);
  padding: var(--s1) var(--s2);
}
.dmo-select:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
.dmo-toolbar > .dmo-select { width: auto; flex: 0 0 auto; }
.dmo-field { margin-bottom: var(--s2); }
.dmo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: var(--s2); }
.dmo-kpi {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2); min-width: 0;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-kpi-label { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-kpi-value { font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh); font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 1px; }
.dmo-kpi-note { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-kpi-btn { appearance: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.dmo-kpi-btn:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); border-color: var(--dsw-alias-border-l3); }
.dmo-kpi-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-kpi-more { float: right; font-size: var(--t5); line-height: var(--t5-lh); color: var(--accent); font-weight: 600; }
.dmo-resident-group { margin: var(--s2) 0; }
.dmo-resident-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: 3px; }
.dmo-card {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}

/* ============ v6 \u5BB9\u5668\uFF08\u8BC4\u5BA1 P0-1\uFF09 ============
   \u63D2\u4EF6\u7AEF\u66FE\u628A\u53F0\u8D26\u88F8\u94FA\u5728\u9762\u677F\u5E95\u4E0A\uFF0C\u884C\u95F4\u53EA\u9760 border-l1\uFF08\u6D45\u8272 4% \u9ED1\uFF0C\u8089\u773C\u4E0D\u53EF\u89C1\uFF09
   \u5206\u9694\u2014\u2014\u8FD9\u6B63\u662F\u65B9\u5411\u5361 \xA7\u96F6\u70B9\u540D\u7684 v5\u300C\u592A\u7D20\u300D\u6839\u56E0\uFF0C\u800C\u4E14\u8BA9\u5DF2\u901A\u8FC7\u622A\u56FE\u8BC4\u5BA1\u7684
   \u539F\u578B\u4E0E\u5B9E\u9645\u4EA4\u4ED8\u7684\u63D2\u4EF6\u53D8\u6210\u4E24\u5957\u754C\u9762\u3002\u89C4\u5219\uFF1A\u5217\u8868/\u6210\u672C\u533A\u5FC5\u987B\u88C5\u8FDB\u5BB9\u5668\uFF0C
   border-l1 \u53EA\u5141\u8BB8\u51FA\u73B0\u5728\u5BB9\u5668\u5185\u90E8\u3002
   .dmo-card-heavy = \u91CD\u5361\uFF08card-fill + l3\uFF09\uFF0C\u6BCF\u5C4F \u22641\uFF1B.dmo-card-quiet = \u9759\u5361\u3002 */
.dmo-card-heavy {
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--r-container);
  padding: var(--s3);
  display: flex; flex-direction: column; gap: var(--s2);
}
.dmo-card-quiet {
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-container);
  padding: var(--s3);
  display: flex; flex-direction: column; gap: var(--s2);
}
.dmo-card-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; word-break: break-word; }
.dmo-card-meta { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; margin-top: var(--s1); font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-card-body { margin-top: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); white-space: pre-wrap; word-break: break-word; }
.dmo-card-actions { display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s2); }
.dmo-lane { margin-bottom: var(--s2); }
.dmo-types { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-recent-wrap { margin-top: var(--s3); }
.dmo-recent-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-recent-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-recent-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-icon { display: block; }

/* v6 \u8BC4\u5BA1 P1-1\uFF1A/remember \u6D6E\u5C42 portal \u5230 document.body\uFF0C\u4E0D\u5728 .dmo-root \u5B50\u6811\u91CC\uFF0C
   \u53EA\u5199 .dmo-root * \u4F1A\u6F0F\u6389\u5B83\u3002\u964D\u7EA7\u8303\u56F4\u5FC5\u987B\u8986\u76D6\u5168\u90E8\u63D2\u4EF6\u6839\u3002 */
@media (prefers-reduced-motion: reduce) {
  .dmo-root *, .dmo-root *::before, .dmo-root *::after,
  .dmo-remember-backdrop, .dmo-remember-backdrop *,
  .dmo-remember-toast, .dmo-overlay, .dmo-overlay * {
    animation: none !important; transition: none !important;
  }
}
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

// src/client/index.ts
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
