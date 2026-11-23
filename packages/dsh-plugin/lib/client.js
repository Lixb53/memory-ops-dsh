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
var import_react18 = require("react");

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
var import_react14 = require("react");

// src/client/v9/data.ts
var import_react4 = require("react");

// src/client/data.ts
var import_react2 = require("react");

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
function useBridge(route, body, deps = []) {
  const [phase, setPhase] = (0, import_react2.useState)("loading");
  const [data, setData] = (0, import_react2.useState)(void 0);
  const [error, setError] = (0, import_react2.useState)(void 0);
  const [nonce, setNonce] = (0, import_react2.useState)(0);
  const reload = (0, import_react2.useCallback)(() => {
    setNonce((value) => value + 1);
  }, []);
  const bodyKey = JSON.stringify(body);
  (0, import_react2.useEffect)(() => {
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

// src/client/v9/data.ts
function useWorkbenchData(ctx) {
  const { cwd, project } = useSessionProject(ctx);
  const scope = scopeBody(cwd, project);
  const snapshot = useBridge("snapshot", scope, [cwd, project]);
  const overview = useBridge("overview", {}, []);
  const inbox = useBridge("inbox", { domain: "personal" }, []);
  const misses = useBridge("misses", {}, []);
  const { reload: reloadSnapshot } = snapshot;
  const { reload: reloadOverview } = overview;
  const { reload: reloadInbox } = inbox;
  const { reload: reloadMisses } = misses;
  const reloadAll = (0, import_react4.useCallback)(() => {
    reloadSnapshot();
    reloadOverview();
    reloadInbox();
    reloadMisses();
  }, [reloadSnapshot, reloadOverview, reloadInbox, reloadMisses]);
  return { snapshot, overview, inbox, misses, scope, cwd, reloadAll };
}
function phaseOf(sources, isEmpty) {
  if (sources.some((source) => source.phase === "error")) return "error";
  if (sources.some((source) => source.phase === "loading" || source.data === void 0)) return "loading";
  if (isEmpty) return "empty";
  return "ready";
}
function sourcesFor(pane, data) {
  if (pane === "today") return [data.snapshot, data.overview, data.inbox, data.misses];
  if (pane === "capture") return [data.inbox];
  if (pane === "todo") return [data.snapshot, data.inbox, data.misses];
  if (pane === "memory") return [data.snapshot];
  return [data.overview];
}

// src/client/v9/actions.ts
function classify(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/密钥|私钥|身份证|内网 IP|拒写|脱敏/.test(message)) return "privacy";
  if (/写锁超时|EEXIST|EBUSY/.test(message)) return "lock";
  if (/ENOENT|找不到|不存在/.test(message)) return "missing";
  return "unknown";
}
function hintOf(error) {
  const kind = classify(error);
  if (kind === "privacy") return "\u660E\u6587 Markdown \u4E0D\u80FD\u5B58\u5BC6\u94A5\u3002\u6362\u6210\u5360\u4F4D\u7B26\u518D\u5B58\uFF0C\u539F\u6587\u4E0D\u8981\u8FDB\u5E93\u3002";
  if (kind === "lock") return "\u53E6\u4E00\u4E2A\u8FDB\u7A0B\u6B63\u5728\u5199\u540C\u4E00\u4E2A\u6587\u4EF6\uFF0C\u7B49\u4E00\u4E24\u79D2\u518D\u8BD5\u3002";
  if (kind === "missing") return "\u76EE\u6807\u6761\u76EE\u4E0D\u5728\u5E93\u91CC\u4E86\uFF08\u53EF\u80FD\u521A\u88AB\u79FB\u52A8\u6216\u5F52\u6863\uFF09\u3002\u91CD\u53D6\u4E00\u6B21\u518D\u770B\u3002";
  return "\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u8FD9\u662F\u8BFB\u53D6\u6216\u5199\u5165\u95EE\u9898\u3002";
}
async function confirmEntry(path) {
  await call("confirm", { path });
}
async function rejectEntry(path, reason) {
  const trimmed = reason.trim();
  if (trimmed === "") throw new Error("\u9A73\u56DE\u8981\u5199\u7406\u7531\uFF1A\u5426\u5219 30 \u5929\u540E\u6CA1\u4EBA\u77E5\u9053\u4E3A\u4EC0\u4E48\u5426\u6389\u5B83");
  await call("reject", { path, reason: trimmed });
}
async function undoReject(path) {
  await call("undoReject", { path });
}
async function archiveEntry(path) {
  await call("archive", { path });
}
async function keepEntry(path) {
  await call("keep", { path });
}
async function captureOne(content, kind) {
  const trimmed = content.trim();
  if (trimmed === "") throw new Error("\u5185\u5BB9\u4E3A\u7A7A\uFF0C\u672A\u5199\u5165");
  const result = await call("capture", { content: trimmed, kind });
  if (result?.ok !== true) throw new Error(result?.reason ?? "\u6CA1\u5B58\u4E0A");
  return result;
}
async function patchInboxRow(lineIndex, patch) {
  await call("updateInbox", { domain: "personal", lineIndex, patch });
}
async function deleteInboxRows(lineIndexes) {
  await call("deleteInbox", { domain: "personal", lineIndexes });
}
async function draftMiss(query) {
  await call("missDraft", { query });
}
async function undoCapture(content) {
  const list = await call("inbox", { domain: "personal" });
  const match = [...list.entries].reverse().find((row) => row.content === content);
  if (match === void 0) throw new Error("\u627E\u4E0D\u5230\u521A\u5B58\u5165\u7684\u90A3\u4E00\u6761\uFF08\u53EF\u80FD\u5DF2\u88AB\u5904\u7406\uFF09");
  await deleteInboxRows([match.lineIndex]);
}
async function searchEntries(query, record) {
  await call("search", { query, record });
}
async function writeBody(path, body) {
  await call("writeBody", { path, body });
}
async function exportData(format, domain) {
  return call("export", { format, domain });
}
async function batchArchive(paths, reason) {
  if (paths.length === 0) throw new Error("\u6CA1\u6709\u8981\u5F52\u6863\u7684\u6761\u76EE");
  await call("batchArchive", { paths, reason });
}
async function batchInboxState(lineIndexes, state2) {
  if (lineIndexes.length === 0) throw new Error("\u6CA1\u6709\u8981\u6539\u7684\u884C");
  await call("batchInboxState", { domain: "personal", lineIndexes, state: state2 });
}
async function promoteInboxRow(lineIndex) {
  await call("promoteInbox", { domain: "personal", lineIndex });
}
async function confirmMiss(query, content) {
  const trimmed = content.trim();
  if (trimmed === "") throw new Error("\u8865\u4E0A\u7684\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
  await call("missConfirm", { query, content: trimmed, type: "\u95EE\u9898", domain: "personal" });
}
async function batchDraftMiss(queries) {
  if (queries.length === 0) throw new Error("\u6CA1\u6709\u8981\u5199\u8349\u7A3F\u7684\u6761\u76EE");
  await call("missBatchDraft", { queries, type: "\u95EE\u9898" });
}
async function deleteMiss(query) {
  await call("missDelete", { query });
}

// src/client/v9/stage.ts
var import_react6 = require("react");

// src/client/v9/primitives.ts
var import_react5 = require("react");
var h = import_react5.createElement;
var EMPTY = "\u2014";
function num(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY;
  return value.toLocaleString("zh-CN");
}
function withUnit(value, unit) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY;
  return `${num(value)} ${unit}`;
}
function toneOf(tone) {
  if (tone === "warn" || tone === "err" || tone === "ok") return tone;
  return "idle";
}
var LEDE_MAX = 20;
function assertLede(text) {
  if ([...text].length > LEDE_MAX) {
    throw new Error(`\u5224\u5B9A\u53E5\u8D85\u8FC7 ${LEDE_MAX} \u5B57\uFF1A${text}`);
  }
  if (/[\r\n]/.test(text)) {
    throw new Error(`\u5224\u5B9A\u53E5\u4E0D\u8BB8\u6362\u884C\uFF1A${text}`);
  }
  return text;
}
function Figure({ value }) {
  return h("span", { className: "mo-t0 mo-num", "data-figure": "" }, num(value));
}
function Lede({ text }) {
  return h("p", { className: "mo-lede", "data-lede": "" }, assertLede(text));
}
function SectionHead({ title, note }) {
  return h(
    "div",
    { className: "mo-section-head" },
    h("h2", { className: "mo-section-title" }, title),
    note === void 0 ? null : h("span", { className: "mo-section-note mo-num" }, note)
  );
}
function Row({ spec, onSelect }) {
  const tone = toneOf(spec.tone);
  return h(
    "li",
    { className: "mo-row-item" },
    h(
      "button",
      {
        type: "button",
        className: "mo-row-button",
        "data-select": spec.id,
        "aria-current": spec.current === true ? "true" : void 0,
        onClick: () => {
          onSelect(spec.id);
        }
      },
      h("span", { className: `mo-tonebar mo-tone-${tone}` }),
      h("span", { className: "mo-row-title", "data-dense": spec.dense === true ? "true" : void 0 }, spec.title),
      h("span", { className: "mo-row-col mo-row-col-src" }, spec.source ?? ""),
      h(
        "span",
        { className: "mo-row-col mo-row-col-num mo-num" },
        spec.num === void 0 ? EMPTY : num(spec.num)
      ),
      h(
        "span",
        { className: "mo-row-col mo-row-col-state" },
        h("span", { className: `mo-tonebar-inline mo-tone-${tone}` }),
        spec.state ?? ""
      ),
      h("span", { className: "mo-row-meta" }, spec.meta ?? "")
    )
  );
}
function TableHead({ columns }) {
  return h(
    "div",
    { className: "mo-table-head" },
    columns.map((column, index) => h("span", {
      key: column.label,
      className: column.num === true ? "mo-is-num" : void 0,
      style: index === 0 ? void 0 : void 0
    }, column.label))
  );
}
function Skeleton({ rows = 4, label = "\u8BFB\u53D6\u4E2D" }) {
  return h(
    "div",
    { className: "mo-skel-wrap", role: "presentation" },
    Array.from({ length: rows }, (_, index) => h("div", { key: index, className: "mo-skel-row" })),
    h("p", { className: "mo-skel-note" }, label)
  );
}
function EmptyBlock({ title, text, hint, action }) {
  return h(
    "div",
    { className: "mo-state-block mo-state-empty" },
    h("h2", { className: "mo-state-title" }, title),
    h("p", { className: "mo-state-text" }, text),
    hint === void 0 ? null : h("p", { className: "mo-state-hint mo-num" }, hint),
    action === void 0 ? null : h(
      "div",
      { className: "mo-state-actions" },
      h("button", { type: "button", className: "mo-btn-ghost", "data-act": action.actName, onClick: action.act }, action.label)
    )
  );
}
function ErrorBlock({ title, text, example, onRetry }) {
  return h(
    "div",
    { className: "mo-state-block mo-state-error", role: "alert" },
    h("h2", { className: "mo-state-title" }, title),
    h("p", { className: "mo-state-text" }, text),
    example === void 0 ? null : h("p", { className: "mo-state-hint mo-num" }, `\u793A\u4F8B\uFF1A${example}`),
    h("button", { type: "button", className: "mo-btn-ghost", "data-act": "retry", onClick: onRetry }, "\u91CD\u8BD5")
  );
}
function Props({ rows }) {
  return h(
    "dl",
    { className: "mo-props" },
    rows.map((row) => h(
      "div",
      { key: row.label, className: "mo-prop" },
      h("dt", null, row.label),
      h("dd", null, row.value)
    ))
  );
}
function BtnInk({ children, onClick, disabled, actName, id }) {
  return h("button", {
    type: "button",
    id,
    className: "mo-btn-ink",
    "data-act": actName,
    disabled,
    onClick: disabled === true ? void 0 : onClick
  }, children);
}
function BtnGhost({ children, onClick, disabled, actName, id }) {
  return h("button", {
    type: "button",
    id,
    className: "mo-btn-ghost",
    "data-act": actName,
    disabled,
    onClick: disabled === true ? void 0 : onClick
  }, children);
}
function TextLink({ children, onClick, actName }) {
  return h("button", { type: "button", className: "mo-textlink", "data-act": actName, onClick }, children);
}
function InlineDone({ ok, text, undo }) {
  return h(
    "div",
    { className: "mo-inline-done", "data-tone": ok ? "ok" : "err", role: "status" },
    h("span", { className: `mo-tonebar-inline mo-tone-${ok ? "ok" : "err"}` }),
    h("span", null, text),
    undo === void 0 ? null : TextLink({ children: undo.label, onClick: undo.act, actName: "undo" })
  );
}
function FaceSwitch({ face, onChange }) {
  const button = (id, label) => h("button", {
    type: "button",
    className: "mo-face-btn",
    role: "switch",
    "aria-checked": face === id === true ? "true" : "false",
    "data-face": id,
    onClick: () => {
      onChange(id);
    }
  }, label);
  return h(
    "div",
    { className: "mo-faces" },
    h(
      "div",
      { className: "mo-face-switch", role: "group", "aria-label": "\u6E05\u5355\u89C6\u89D2" },
      button("content", "\u5185\u5BB9\u9762"),
      button("cost", "\u6210\u672C\u9762")
    ),
    h(
      "span",
      { className: "mo-face-note" },
      face === "cost" ? "\u6309\u4F53\u79EF\u964D\u5E8F\uFF0C\u56DE\u7B54\u300C\u54EA\u6761\u6700\u8D35\u300D" : "\u6309\u5E93\u5185\u987A\u5E8F\uFF0C\u56DE\u7B54\u300C\u6211\u5B58\u4E86\u4EC0\u4E48\u300D"
    )
  );
}
function KindButtons({ kinds, kind, onKind }) {
  return h(
    "div",
    { className: "mo-toolbar", role: "group", "aria-label": "\u7C7B\u578B" },
    kinds.map((item) => h("button", {
      key: item,
      type: "button",
      className: "mo-kindbtn",
      "data-kind": item,
      "aria-pressed": item === kind ? "true" : "false",
      onClick: () => {
        onKind(item);
      }
    }, item))
  );
}

// src/client/v9/view-model.ts
function estimateTokens(text) {
  const value = String(text ?? "");
  if (value === "") return 0;
  let wide = 0;
  let rest = 0;
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isWide = code >= 11904 && code <= 40959 || code >= 44032 && code <= 55215 || code >= 63744 && code <= 64255 || code >= 65280 && code <= 65519 || code >= 12288 && code <= 12351;
    if (isWide) wide += 1;
    else rest += 1;
  }
  return Math.ceil(wide + rest / 4);
}
var PANES = [
  { id: "today", idx: "01", label: "\u4ECA\u5929", unit: "\u4EF6\u8981\u52A8\u624B" },
  { id: "capture", idx: "02", label: "\u8BB0\u4E00\u6761", unit: "\u6761\u4ECA\u5929\u5DF2\u8BB0" },
  { id: "todo", idx: "03", label: "\u5F85\u529E", unit: "\u4EF6\u538B\u7740" },
  { id: "memory", idx: "04", label: "\u8BB0\u5FC6", unit: "\u6761\u8BB0\u5FC6" },
  { id: "health", idx: "05", label: "\u5E93\u5065\u5EB7", unit: "tokens / \u8BF7\u6C42" }
];
var LEDE_MAX2 = 20;
function clip(text, max = LEDE_MAX2) {
  const chars = [...text];
  if (chars.length <= max) return text;
  return `${chars.slice(0, max - 1).join("")}\u2026`;
}
function plain(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return "\u2014";
  return value.toLocaleString("zh-CN");
}
function memoryEntries(snapshot) {
  if (snapshot === void 0) return [];
  return snapshot.entries.filter((entry) => !entry.id.endsWith(".INBOX"));
}
function openInboxRows(inbox) {
  if (inbox === void 0) return [];
  return inbox.entries.filter((row) => row.state === "open" || row.state === "todo");
}
function daysSince(date, now = /* @__PURE__ */ new Date()) {
  const parts = date.split("-").map(Number);
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const at = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const diff = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - at;
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.round(diff / 864e5));
}
function todayKey(now = /* @__PURE__ */ new Date()) {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}
function countsOf(input) {
  const entries = memoryEntries(input.snapshot);
  const queue = input.snapshot?.queue.length ?? 0;
  const flow = openInboxRows(input.inbox).length;
  const fillable = input.misses?.counts?.["should-fill"] ?? 0;
  const observing = input.misses?.counts?.["observing"] ?? 0;
  const today = todayKey();
  const capturedToday = (input.inbox?.entries ?? []).filter((row) => row.date === today).length;
  const resident = input.overview?.kpi.residentTokens ?? input.overview?.resident.billedTokens ?? 0;
  return {
    queue,
    flow,
    refill: fillable + observing,
    fillable,
    observing,
    entries: entries.length,
    confirmed: input.snapshot?.stats.counts.confirmed ?? 0,
    inboxTotal: input.inbox?.entries.length ?? 0,
    capturedToday,
    resident,
    injected: input.overview?.resident.injectedTokens ?? 0,
    frame: input.overview?.resident.frameTokens ?? 0,
    catalog: input.overview?.resident.catalogTokens ?? 0,
    overLimit: input.snapshot?.stats.overLimit ?? 0,
    misses: input.misses?.total ?? 0,
    pinned: entries.filter((entry) => entry.pinned).length,
    urgent: queue + flow + fillable + observing
  };
}
function countFor(pane, counts) {
  if (pane === "capture") return counts.capturedToday;
  if (pane === "todo") return counts.urgent;
  if (pane === "memory") return counts.entries;
  if (pane === "health") return counts.resident;
  return counts.urgent;
}
function countDisplay(pane, phase, counts) {
  if (phase === "error" || phase === "loading") return null;
  if (phase === "empty") return pane === "health" ? counts.resident : 0;
  return countFor(pane, counts);
}
function figureFor(pane, phase, counts) {
  if (phase === "error" || phase === "loading") return null;
  if (phase === "empty") {
    return pane === "health" ? counts.resident : 0;
  }
  return countFor(pane, counts);
}
function ledeFor(pane, phase, counts) {
  if (phase === "error") return "\u8BFB\u4E0D\u5230\u6570\u636E\uFF0C\u5148\u91CD\u8BD5";
  if (phase === "loading") return "\u6B63\u5728\u8BFB\u53D6\u8FD9\u4E00\u9875";
  if (phase === "empty") {
    if (pane === "today") return "\u73B0\u5728\u6CA1\u6709\u538B\u7740\u7684\u4E8B";
    if (pane === "capture") return "\u4ECA\u5929\u8FD8\u6CA1\u8BB0\u4EFB\u4F55\u4E00\u6761";
    if (pane === "todo") return "\u4E09\u6BB5\u90FD\u7A7A\u4E86";
    if (pane === "memory") return "\u8FD9\u6761\u7B5B\u9009\u4E0B\u6CA1\u6709\u6761\u76EE";
    return "\u6CA1\u6709\u4EFB\u4F55\u5E38\u9A7B\u5185\u5BB9";
  }
  if (pane === "today") {
    return clip(counts.queue > 0 ? `${plain(counts.urgent)} \u4EF6\u8981\u52A8\u624B\uFF0C\u5148\u62CD\u8FD9 ${plain(counts.queue)} \u6761` : `${plain(counts.urgent)} \u4EF6\u8981\u52A8\u624B\uFF0C\u5148\u770B\u6700\u4E0A\u9762\u90A3\u4EF6`);
  }
  if (pane === "capture") return "\u5199\u4E00\u6761\uFF0C\u843D\u8FDB\u4E2A\u4EBA INBOX";
  if (pane === "todo") {
    return clip(counts.queue > 0 ? `${plain(counts.urgent)} \u4EF6\u538B\u7740\uFF0C\u5148\u6E05\u5F85\u62CD\u677F` : `${plain(counts.urgent)} \u4EF6\u538B\u7740\uFF0C\u5148\u770B\u6D41\u8F6C\u4E2D`);
  }
  if (pane === "memory") return clip(`${plain(counts.entries)} \u6761\u91CC ${plain(counts.confirmed)} \u6761\u5DF2\u786E\u8BA4`);
  return clip(counts.injected > 0 ? `${plain(counts.resident)} \u91CC\u4F60\u80FD\u5173\u7684\u53EA\u6709 ${plain(counts.injected)}` : `${plain(counts.resident)} \u5168\u662F\u5BBF\u4E3B\u6CE8\u5165\u7684`);
}
function bandNoteFor(pane, phase, counts) {
  if (phase === "error") return "\u8BFB\u4E0D\u5230\uFF1A\u8FD9\u4E00\u5E26\u7684\u6570\u5B57\u663E\u793A\u4E3A \u2014";
  if (phase === "loading") return "\u8BFB\u53D6\u4E2D";
  if (phase === "empty") {
    return counts.resident === 0 ? "0 \u6761\u7F6E\u9876 \xB7 \u6CA1\u6709\u6BCF\u8BF7\u6C42\u6210\u672C" : clip(`0 \u6761\u7F6E\u9876 \xB7 \u6BCF\u8BF7\u6C42\u4ECD\u6709 ${plain(counts.resident)}\uFF08\u6846\u67B6\u4E0E\u6280\u80FD\u4E0D\u53EF\u5173\uFF09`, 56);
  }
  if (pane === "health") {
    return clip(
      `${plain(counts.resident)} = \u6846\u67B6 ${plain(counts.frame)} + \u6280\u80FD ${plain(counts.catalog)} + \u7F6E\u9876 ${plain(counts.injected)}`,
      56
    );
  }
  return clip(
    `\u7F6E\u9876 ${plain(counts.pinned)} \u6761 \xB7 \u5168\u90E8\u6CE8\u5165 \xB7 \u6BB5\u9884\u7B97 256 \u5DF2\u7528 ${plain(counts.injected)}`,
    56
  );
}
function bandFigureFor(phase, counts) {
  if (phase === "error" || phase === "loading") return null;
  return counts.resident;
}
function cluesOf(input, now = /* @__PURE__ */ new Date()) {
  const counts = countsOf(input);
  const clues = [];
  const firstFlow = openInboxRows(input.inbox)[0];
  if (counts.queue > 0) {
    const first = input.snapshot?.queue[0];
    const days = first?.days ?? null;
    clues.push({
      id: "clue-decide",
      title: `${plain(counts.queue)} \u6761\u63A8\u65AD\u7B49\u4F60\u62CD\u677F`,
      meta: `\u6700\u65E9\u4E00\u6761\uFF1A${clip(first?.title ?? "", 18)} \xB7 \u7B49 ${plain(days)} \u5929`,
      group: "\u62CD\u677F",
      num: counts.queue,
      state: "\u5F85\u62CD\u677F",
      tone: "warn",
      action: "goto-todo",
      actionLabel: "\u53BB\u62CD\u677F",
      detail: "\u91C7\u7EB3\u540E\u8FDB\u5165\u68C0\u7D22\u4E0E\u7F6E\u9876\u901A\u9053\uFF1B\u9A73\u56DE\u843D\u6863 30 \u5929\u9759\u9ED8\u3002\u7CFB\u7EDF\u81EA\u52A8\u5347\u7EA7\u6700\u591A\u5230\u300C\u89C2\u5BDF\u5230\u300D\uFF0C\u4E0D\u4F1A\u66FF\u4F60\u786E\u8BA4\u3002",
      gotoKey: first?.path === void 0 ? void 0 : `q:${first.path}`
    });
  }
  if (counts.fillable > 0) {
    const target = (input.misses?.pipeline["should-fill"] ?? [])[0];
    clues.push({
      id: "clue-fill",
      title: `${plain(counts.fillable)} \u4E2A\u95EE\u9898\u95EE\u8FC7\u591A\u6B21\u5374\u6CA1\u7B54\u6848`,
      meta: target === void 0 ? "\u5DF2\u8FC7\u8865\u9F50\u9608\u503C" : `\u7B2C\u4E00\u6B21\u95EE\uFF1A${clip(target.query, 20)}`,
      group: "\u8865\u5E93",
      num: counts.fillable,
      state: "\u7F3A\u8FD9\u53E3",
      tone: "warn",
      action: "draft-miss",
      actionLabel: "\u5199\u8349\u7A3F",
      detail: "\u8349\u7A3F\u53EA\u8FDB INBOX\uFF0C\u843D\u6863\u4ECD\u9700\u4F60\u786E\u8BA4\u3002\u5199\u5B8C\u540E 7 \u5929\u5185\u6709\u547D\u4E2D\u624D\u7B97\u9A8C\u8BC1\u901A\u8FC7\u3002",
      gotoKey: target === void 0 ? void 0 : `m:${target.query}`,
      query: target?.query
    });
  } else if (counts.observing > 0) {
    const target = (input.misses?.pipeline["observing"] ?? [])[0];
    clues.push({
      id: "clue-observe",
      title: `${plain(counts.observing)} \u4E2A\u95EE\u9898\u53EA\u88AB\u95EE\u8FC7\u4E00\u4E24\u6B21`,
      meta: `\u6EE1 ${plain(input.misses?.fillThreshold ?? 3)} \u6B21\u624D\u5EFA\u8BAE\u8865\u5E93`,
      group: "\u8865\u5E93",
      num: counts.observing,
      state: "\u89C2\u5BDF\u4E2D",
      tone: "idle",
      action: "goto-todo",
      actionLabel: "\u770B\u660E\u7EC6",
      detail: "\u73B0\u5728\u8865\u4E5F\u884C\uFF0C\u4F46\u4E00\u6B21\u6027\u7684\u95EE\u9898\u4E0D\u503C\u5F97\u5360\u7528\u4E00\u6761\u8BB0\u5FC6\u3002\u8FBE\u9608\u503C\u540E\u8FD9\u91CC\u4F1A\u53D8\u6210\u300C\u7F3A\u8FD9\u53E3\u300D\u3002",
      gotoKey: target === void 0 ? void 0 : `m:${target.query}`
    });
  }
  if (counts.overLimit > 0) {
    clues.push({
      id: "clue-compact",
      title: `${plain(counts.overLimit)} \u7BC7\u8D85\u8FC7 80 \u884C`,
      meta: "\u964D\u5230 80 \u884C\u4EE5\u5185\u624D\u80FD\u88AB\u4E00\u6B21\u8BFB\u5B8C",
      group: "\u7EF4\u62A4",
      num: counts.overLimit,
      state: "\u53EF\u6574\u7406",
      tone: "idle",
      action: "goto-memory",
      actionLabel: "\u770B\u6E05\u5355",
      detail: "\u65E0\u635F\u538B\u7F29\uFF08\u7A7A\u884C\u3001\u91CD\u590D\u6807\u9898\uFF09\u7531\u300C\u5E93\u5065\u5EB7 \xB7 \u53D8\u77ED\u300D\u6267\u884C\uFF1B\u5269\u4E0B\u7684\u9700\u8981\u4F60\u624B\u52A8\u6458\u8981\u6216\u62C6\u6587\u4EF6\u3002"
    });
  }
  clues.push({
    id: "clue-cost",
    title: `\u6BCF\u8BF7\u6C42 ${plain(counts.resident)} tokens\uFF0C${plain(counts.injected)} \u4F60\u80FD\u5173`,
    meta: `\u6846\u67B6 ${plain(counts.frame)} \u7531\u5BBF\u4E3B\u751F\u6210 \xB7 \u6280\u80FD ${plain(counts.catalog)}`,
    group: "\u6210\u672C",
    num: counts.resident,
    state: "\u53EF\u964D",
    tone: "idle",
    action: "goto-health",
    actionLabel: "\u770B\u6784\u6210",
    detail: "\u6846\u67B6\u4E0E\u5DE5\u5177 schema \u4F60\u52A8\u4E0D\u4E86\uFF1B\u7F6E\u9876\u6761\u76EE\u9010\u6761\u53EF\u5173\u3002\u5173\u6389\u4E00\u6761\u5C31\u662F\u6BCF\u4E2A\u8BF7\u6C42\u90FD\u5C11\u4ED8\u4E00\u6B21\u3002",
    gotoKey: "b:injected"
  });
  if (counts.flow > 0) {
    clues.push({
      id: "clue-flow",
      title: `${plain(counts.flow)} \u6761\u8BB0\u4E86\u8FD8\u6CA1\u7ED3`,
      meta: "\u5F00\u7740\u7684\u6761\u76EE\u8D85\u8FC7 7 \u5929\u4F1A\u964D\u6743\uFF0C\u4F46\u4E0D\u4F1A\u88AB\u5220",
      group: "\u6D41\u8F6C",
      num: counts.flow,
      state: "\u6D41\u8F6C\u4E2D",
      tone: "idle",
      action: "goto-todo",
      actionLabel: "\u53BB\u6D41\u8F6C",
      detail: "\u505A\u5B8C\u6807\u5B8C\u6210\uFF0C\u4E0D\u505A\u5C31\u4E22\u6389\u3002\u7559\u5728 INBOX \u91CC\u4F1A\u8BA9\u300C\u5F85\u529E\u300D\u8FD9\u4E2A\u6570\u5931\u53BB\u610F\u4E49\u3002",
      gotoKey: firstFlow === void 0 ? void 0 : `i:${firstFlow.lineIndex}`
    });
  }
  void now;
  return clues.slice(0, 6);
}
function todoSectionsOf(input, now = /* @__PURE__ */ new Date()) {
  const queue = input.snapshot?.queue ?? [];
  const decide = queue.map((item) => ({
    key: `q:${item.path}`,
    kind: "decide",
    title: item.title,
    meta: `${item.reason} \xB7 ${item.domainLabel} \xB7 \u7B49 ${plain(item.days)} \u5929`,
    group: "\u62CD\u677F",
    num: item.days,
    state: "\u5F85\u62CD\u677F",
    tone: "warn",
    path: item.path
  }));
  const flow = openInboxRows(input.inbox).map((row) => ({
    key: `i:${row.lineIndex}`,
    kind: "flow",
    title: row.content,
    meta: `${row.kind} \xB7 \u8BB0\u4E8E ${row.date}`,
    group: "\u6D41\u8F6C",
    num: daysSince(row.date, now),
    state: row.state === "open" ? "\u5F00\u7740" : "\u6D41\u8F6C\u4E2D",
    tone: "idle",
    lineIndex: row.lineIndex
  }));
  const misses = input.misses;
  const shouldFill = misses?.pipeline["should-fill"] ?? [];
  const observing = misses?.pipeline["observing"] ?? [];
  const refill = [...shouldFill, ...observing].map((item) => ({
    key: `m:${item.query}`,
    kind: "refill",
    title: item.query,
    meta: `${plain(item.count)} \u6B21 \xB7 ${plain(item.sessions)} \u4E2A\u4F1A\u8BDD \xB7 \u6700\u8FD1 ${item.lastAt.slice(0, 10)}`,
    group: "\u8865\u5E93",
    num: item.count,
    state: (item.state === "should-fill" || item.state === "observing") && item.hits >= (misses?.fillThreshold ?? 3) ? "\u7F3A\u8FD9\u53E3" : "\u89C2\u5BDF\u4E2D",
    tone: item.hits >= (misses?.fillThreshold ?? 3) ? "warn" : "idle",
    query: item.query,
    fillable: item.hits >= (misses?.fillThreshold ?? 3)
  }));
  return [
    {
      id: "decide",
      title: "\u5F85\u62CD\u677F",
      note: `${decide.length} \u6761 \xB7 \u53EA\u6709\u4EBA\u80FD\u5B9A \xB7 \u53F3\u5217\u7B49\u51E0\u5929`,
      rows: decide,
      emptyText: "\u6CA1\u6709\u5F85\u62CD\u677F\u7684\u63A8\u65AD\uFF1A\u5E93\u91CC\u6CA1\u6709\u88AB\u81EA\u52A8\u63D0\u53D6\u3001\u7B49\u4F60\u70B9\u5934\u7684\u6761\u76EE\u3002"
    },
    {
      id: "flow",
      title: "\u6D41\u8F6C\u4E2D",
      note: `${flow.length} \u6761 \xB7 \u8D85\u8FC7 7 \u5929\u4F1A\u964D\u6743 \xB7 \u53F3\u5217\u7B49\u51E0\u5929`,
      rows: flow,
      emptyText: "\u8BB0\u5F55\u6D41\u91CC\u6CA1\u6709\u5F00\u7740\u7684\u6761\u76EE\u3002\u8BB0\u4E86\u53C8\u6CA1\u7ED3\u7684\u4E8B\u4F1A\u5806\u5728\u8FD9\u91CC\u3002"
    },
    {
      id: "refill",
      title: "\u5F85\u8865\u5E93",
      note: `${refill.length} \u6761 \xB7 \u7F3A\u7684\u6BD4\u591A\u7684\u66F4\u503C\u5F97\u770B \xB7 \u53F3\u5217\u95EE\u8FC7\u51E0\u6B21`,
      rows: refill,
      emptyText: `\u6CA1\u6709\u8BE5\u8865\u7684\uFF1A\u88AB\u95EE\u8FC7\u7684 ${plain(misses?.total ?? 0)} \u4E2A\u95EE\u9898\u90FD\u6CA1\u5230\u8865\u9F50\u7EBF\uFF08\u540C\u4E00\u4E2A\u95EE\u9898\u95EE\u6EE1 ${plain(misses?.fillThreshold ?? 3)} \u6B21\uFF09\u3002`
    }
  ];
}
function memoryGroup(entry) {
  return entry.domainLabel || entry.domain || "\u672A\u5F52\u7C7B";
}
function statusToneOf(status) {
  if (status === "confirmed" || status === "active") return "ok";
  if (status === "rejected") return "err";
  if (status === "hypothesis" || status === "observed" || status === "stale") return "warn";
  return "idle";
}
function statusLabelOf(status) {
  switch (status) {
    case "hypothesis":
      return "\u5019\u9009";
    case "observed":
      return "\u89C2\u5BDF\u5230";
    case "reinforced":
      return "\u5DF2\u5F3A\u5316";
    case "confirmed":
      return "\u5DF2\u786E\u8BA4";
    case "rejected":
      return "\u5DF2\u9A73\u56DE";
    case "stale":
      return "\u5F85\u590D\u6838";
    case "archived":
      return "\u5DF2\u5F52\u6863";
    case "active":
      return "\u6709\u6548";
    default:
      return status;
  }
}
function anchorLabelOf(state2) {
  if (state2 === "fresh") return "\u6709\u6548";
  if (state2 === "stale") return "\u8BE5\u590D\u6838";
  if (state2 === "missing") return "\u5931\u6548";
  if (state2 === "unverifiable") return "\u65E0\u6CD5\u6838\u5BF9";
  return "\u65E0\u951A\u70B9";
}
function memoryRowsOf(snapshot, face, query) {
  const keyword = query.trim().toLowerCase();
  let entries = memoryEntries(snapshot);
  if (keyword !== "") {
    entries = entries.filter((entry) => `${entry.title} ${entry.path} ${entry.domain}`.toLowerCase().includes(keyword));
  }
  if (face === "cost") {
    entries = [...entries].sort((a, b) => b.tokens - a.tokens);
  }
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    meta: face === "cost" ? `\u6309\u9700\u8BFB\u53D6\uFF0C\u672A\u547D\u4E2D\u4E0D\u4ED8\u8D39 \xB7 ${plain(entry.lines)} \u884C` : `\u951A\u70B9 ${entry.anchor === null ? "\u65E0" : "\u5DF2\u6807\u6CE8"} \xB7 \u8BC1\u636E ${plain(entry.evidence.length)} \u6761`,
    group: memoryGroup(entry),
    num: face === "cost" ? entry.tokens : entry.citeCount,
    state: face === "cost" ? "\u6309\u9700" : statusLabelOf(entry.status),
    tone: face === "cost" ? "idle" : statusToneOf(entry.status)
  }));
}
function pinnedItemTokens(id, title) {
  return estimateTokens(`- [${id}] ${title}`);
}
function bucketsOf(input) {
  const resident = input.overview?.resident;
  const entries = memoryEntries(input.snapshot);
  const pinned = entries.filter((entry) => entry.pinned);
  const catalogItems = (resident?.items ?? []).filter((item) => item.kind === "catalog");
  const injectedTokens = resident?.injectedTokens ?? 0;
  const catalogTokens = resident?.catalogTokens ?? 0;
  const frameTokens = resident?.frameTokens ?? 0;
  return [
    {
      id: "catalog",
      name: "\u6280\u80FD\u76EE\u5F55",
      en: "catalog",
      tokens: catalogTokens,
      state: catalogItems.length === 0 ? "empty" : "ok",
      note: catalogItems.length === 0 ? resident?.error !== "" && resident?.error !== void 0 ? resident.error : "\u5BBF\u4E3B\u8BFB\u5230 0 \u4E2A\u5E26 description \u7684 skill\uFF1A0 \u6761\u6210\u672C\uFF0C\u4E0D\u662F\u300C\u8BFB\u4E0D\u5230\u300D" : `${catalogItems.length} \u4E2A skill \u7684 description\uFF0C\u6BCF\u8BF7\u6C42\u90FD\u4ED8`,
      items: catalogItems.map((item) => ({
        id: item.id,
        name: item.title,
        tokens: item.tokens,
        source: "skill description",
        injected: false,
        editable: false
      }))
    },
    {
      id: "frame",
      name: "\u76EE\u5F55\u6846\u67B6",
      en: "frame",
      tokens: frameTokens,
      state: "ok",
      note: "\u5BBF\u4E3B\u751F\u6210\uFF0C\u63D2\u4EF6\u65E0\u6743\u6539\uFF1B\u53EA\u8BFB",
      readonly: "\u5BBF\u4E3B\u751F\u6210\uFF0C\u63D2\u4EF6\u65E0\u6743\u6539",
      items: [{
        id: "frame.available-skills",
        name: "<available_skills> \u76EE\u5F55\u6846\u67B6",
        tokens: frameTokens,
        source: "\u5BBF\u4E3B\u5185\u7F6E",
        injected: false,
        editable: false
      }]
    },
    {
      id: "injected",
      name: "\u7F6E\u9876\u6761\u76EE",
      en: "injected",
      tokens: injectedTokens,
      state: injectedTokens === 0 ? "empty" : "ok",
      note: pinned.length === 0 ? "\u6CA1\u6709 pinned: true \u7684\u6761\u76EE\uFF1A\u8FD9\u4E00\u6BB5\u5F53\u524D 0 tokens" : `${pinned.length} \u6761 \xB7 \u9010\u6761\u4F30\u7B97 \xB7 \u5408\u8BA1 ${plain(injectedTokens)} \xB7 \u6BB5\u9884\u7B97 256`,
      items: pinned.map((entry) => ({
        id: entry.id,
        name: entry.title,
        tokens: pinnedItemTokens(entry.id, entry.title),
        source: entry.path,
        injected: true,
        editable: true
      }))
    },
    {
      id: "toolschema",
      name: "\u5DE5\u5177 schema",
      en: "toolschema",
      tokens: null,
      state: "error",
      note: "\u672C\u63D2\u4EF6\u8BFB\u4E0D\u5230\u5BBF\u4E3B\u7684\u5DE5\u5177 schema\uFF1A\u5408\u8BA1\u4E0D\u542B\u8FD9\u4E00\u6BB5\uFF0C\u4E5F\u4E0D\u6309 0 \u8BA1\u7B97",
      items: []
    }
  ];
}
var PLUGIN_VERSION = "0.1.0";
function versionInfoOf(pluginVersion) {
  return {
    version: pluginVersion === "" ? "\u2014" : pluginVersion,
    source: "memory-ops-dsh",
    install: "\u2014",
    commit: "\u2014",
    target: "\u5BBF\u4E3B\u4E0D\u5217\u51FA\u7248\u672C",
    checkable: false,
    reason: "\u5BBF\u4E3B\u6CA1\u6709\u66B4\u9732\u7248\u672C\u670D\u52A1\uFF08\u63D2\u4EF6\u62FF\u4E0D\u5230 registry \u7248\u672C\u4E0E\u63D0\u4EA4\u5DEE\u5F02\uFF09\uFF0C\u6240\u4EE5\u8FD9\u91CC\u4E0D\u7ED9\u300C\u53EF\u66F4\u65B0\u5230 X\u300D\u8FD9\u79CD\u6570\u5B57\u3002"
  };
}
function statusRightOf(input) {
  const root = input.snapshot?.root ?? "\u2014";
  if (input.phase === "error" || input.phase === "loading" || input.snapshot === void 0) {
    return `${root} \xB7 \u8BB0\u5FC6\u6761\u6570 \u2014 \xB7 \u8BB0\u5F55\u6D41\u53E6\u8BA1`;
  }
  const counts = countsOf({ snapshot: input.snapshot, overview: input.overview });
  return `${root} \xB7 ${plain(counts.entries)} \u6761\u8BB0\u5FC6 \xB7 \u8BB0\u5F55\u6D41\u53E6\u8BA1`;
}

// src/client/v9/stage.ts
function InspectorFrame(spec) {
  return (0, import_react6.createElement)(
    "aside",
    {
      className: "mo-insp",
      "aria-labelledby": "mo-insp-title",
      "data-phase": spec.phase
    },
    (0, import_react6.createElement)(
      "div",
      { className: "mo-insp-head" },
      (0, import_react6.createElement)("h2", { className: "mo-insp-title", id: "mo-insp-title" }, spec.title),
      (0, import_react6.createElement)("p", { className: "mo-insp-sub", id: "mo-insp-sub" }, spec.sub)
    ),
    (0, import_react6.createElement)("div", { className: "mo-insp-body", id: "mo-insp-body" }, spec.body),
    spec.foot === void 0 ? null : (0, import_react6.createElement)("div", { className: "mo-insp-foot", id: "mo-insp-foot" }, spec.foot)
  );
}
function onTabKey(event, pane, onGoto) {
  const index = PANES.findIndex((item) => item.id === pane);
  let next = index;
  if (event.key === "ArrowDown") next = (index + 1) % PANES.length;
  else if (event.key === "ArrowUp") next = (index - 1 + PANES.length) % PANES.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = PANES.length - 1;
  else return;
  event.preventDefault();
  const target = PANES[next];
  onGoto(target.id);
  const button = document.getElementById(`mo-tab-${target.id}`);
  if (button !== null) button.focus();
}
function Stage(props) {
  const {
    pane,
    phase,
    counts,
    lede,
    figure,
    unit,
    bandNote,
    bandFigure,
    bandFolded,
    onToggleBand,
    onGoto,
    center,
    inspector,
    notice,
    statusLeft,
    statusRight,
    live
  } = props;
  const current = PANES.find((item) => item.id === pane) ?? PANES[0];
  const rail = (0, import_react6.createElement)(
    "nav",
    {
      className: "mo-rail",
      role: "tablist",
      "aria-label": "\u8BB0\u5FC6\u5E93\u5206\u533A",
      "aria-orientation": "vertical"
    },
    (0, import_react6.createElement)(
      "ul",
      { className: "mo-rail-list" },
      PANES.map((item) => (0, import_react6.createElement)(
        "li",
        { key: item.id },
        (0, import_react6.createElement)(
          "button",
          {
            type: "button",
            className: "mo-tab",
            role: "tab",
            id: `mo-tab-${item.id}`,
            "data-pane": item.id,
            "aria-controls": "mo-pane-host",
            "aria-selected": item.id === pane ? "true" : "false",
            tabIndex: item.id === pane ? 0 : -1,
            onClick: () => {
              onGoto(item.id);
            },
            onKeyDown: (event) => {
              onTabKey(event, pane, onGoto);
            }
          },
          (0, import_react6.createElement)("span", { className: "mo-tab-idx mo-num" }, item.idx),
          (0, import_react6.createElement)("span", { className: "mo-tab-label" }, item.label),
          (0, import_react6.createElement)(
            "span",
            { className: "mo-tab-count mo-num" },
            countDisplay(item.id, phase, counts) === null ? "\u2014" : num(countDisplay(item.id, phase, counts))
          )
        )
      ))
    )
  );
  const topbar = (0, import_react6.createElement)(
    "header",
    { className: "mo-topbar", role: "banner" },
    (0, import_react6.createElement)(
      "div",
      { className: "mo-brand" },
      (0, import_react6.createElement)("span", { className: "mo-brand-name" }, "\u8BB0\u5FC6\u5E93"),
      (0, import_react6.createElement)("span", { className: "mo-brand-scope" }, current.label)
    ),
    (0, import_react6.createElement)(Lede, { text: lede }),
    (0, import_react6.createElement)(
      "div",
      { className: "mo-readout" },
      Figure({ value: figure }),
      (0, import_react6.createElement)("span", { className: "mo-unit" }, unit)
    )
  );
  const band = (0, import_react6.createElement)(
    "section",
    {
      className: "mo-band",
      "data-folded": bandFolded ? "true" : "false",
      "aria-label": "\u6BCF\u8BF7\u6C42\u90FD\u5728"
    },
    (0, import_react6.createElement)("span", { className: "mo-band-tag" }, "\u6BCF\u8BF7\u6C42\u90FD\u5728"),
    (0, import_react6.createElement)("span", { className: "mo-band-note", id: "mo-band-note" }, bandNote),
    (0, import_react6.createElement)("button", {
      type: "button",
      className: "mo-textlink",
      "data-act": "fold-budget",
      "aria-expanded": bandFolded ? "false" : "true",
      "aria-controls": "mo-band-note",
      onClick: onToggleBand
    }, bandFolded ? "\u5C55\u5F00" : "\u6298\u8D77"),
    (0, import_react6.createElement)(
      "span",
      { className: "mo-band-figure" },
      (0, import_react6.createElement)("span", { className: "mo-value mo-num" }, bandFigure === null ? "\u2014" : num(bandFigure)),
      (0, import_react6.createElement)("span", { className: "mo-band-figure-unit" }, "tokens")
    )
  );
  const main = (0, import_react6.createElement)(
    "main",
    {
      className: "mo-center",
      id: "mo-pane-host",
      role: "tabpanel",
      "aria-labelledby": `mo-tab-${pane}`,
      tabIndex: 0,
      "data-phase": phase
    },
    band,
    notice === void 0 || notice === null ? null : (0, import_react6.createElement)(
      "div",
      { className: "mo-notice-bar", "data-tone": notice.ok ? "ok" : "err" },
      InlineDone({ ok: notice.ok, text: notice.text, undo: notice.undo })
    ),
    (0, import_react6.createElement)("div", { className: "mo-pane", id: "mo-pane-body" }, center)
  );
  return (0, import_react6.createElement)(
    "div",
    { className: "mo-app", "data-pane": pane },
    topbar,
    (0, import_react6.createElement)("div", { className: "mo-workarea" }, rail, main, inspector),
    (0, import_react6.createElement)(
      "footer",
      { className: "mo-statusbar", role: "status" },
      (0, import_react6.createElement)("span", { className: "mo-status-left" }, statusLeft),
      (0, import_react6.createElement)("span", { className: "mo-status-right mo-num" }, statusRight)
    ),
    (0, import_react6.createElement)("div", { className: "mo-sr-only", role: "status", "aria-live": "polite", "data-live": "" }, live)
  );
}

// src/client/ui.ts
var import_react7 = require("react");
var h2 = import_react7.createElement;
var EMPTY2 = "\u2014";
function orEmpty(value) {
  if (value === void 0 || value === null) return EMPTY2;
  const text = String(value).trim();
  return text === "" ? EMPTY2 : text;
}
function truncate(text, max = 46) {
  const chars = [...String(text ?? "")];
  if (chars.length <= max) return String(text ?? "");
  return `${chars.slice(0, max - 1).join("")}\u2026`;
}
function count(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return EMPTY2;
  return value.toLocaleString("zh-CN");
}
function SkeletonRows({ rows = 3, height = 52 }) {
  return h2(
    "div",
    { "aria-busy": "true", "aria-live": "polite" },
    Array.from({ length: rows }, (_, i) => h2("div", { key: i, className: "dmo-skeleton", style: { height } }))
  );
}
function Badge({ tone = "idle", children, title }) {
  return h2("span", { className: `dmo-badge dmo-badge-${tone}`, title }, children);
}
function Button({ children, onClick, variant = "plain", disabled = false, title, small = false }) {
  const variantClass = variant === "primary" ? " dmo-btn-primary" : variant === "danger" ? " dmo-btn-danger" : "";
  return h2("button", {
    type: "button",
    className: `dmo-btn${variantClass}${small ? " dmo-btn-sm" : ""}`,
    onClick: disabled ? void 0 : onClick,
    disabled,
    title
  }, children);
}
function Empty({ title, children }) {
  return h2(
    "div",
    { className: "dmo-empty" },
    title === void 0 ? null : h2("div", { className: "dmo-empty-title" }, title),
    children
  );
}
function ErrorState({ message, onRetry }) {
  return h2(
    "div",
    { className: "dmo-error", role: "alert" },
    h2("div", null, message),
    onRetry === void 0 ? null : h2(
      "div",
      { style: { marginTop: "var(--s2)" } },
      h2(Button, { onClick: onRetry, small: true }, "\u91CD\u8BD5")
    )
  );
}
function Skeleton2({ rows = 3, height = 52 }) {
  return SkeletonRows({ rows, height });
}
function MemoryIcon({ size = 18 }) {
  return h2(
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
    h2("rect", { x: 2.5, y: 3, width: 15, height: 11, rx: 2 }),
    h2("path", { d: "M5.5 17h9" }),
    h2("path", { d: "M6.5 7h7M6.5 10h4.5" })
  );
}
function Chip({ label, count: num2, active, onClick }) {
  return h2(
    "button",
    {
      type: "button",
      className: "dmo-chip",
      "aria-pressed": active,
      onClick
    },
    label,
    num2 === void 0 ? null : h2("span", { className: "dmo-chip-num" }, num2)
  );
}
function AnchorNote({ state: state2, children }) {
  return h2("div", { className: "dmo-anchor-note", "data-state": state2, role: "note" }, children);
}

// src/client/v9/panes/capture.ts
var import_react8 = require("react");
var INBOX_KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
function inboxStateOf(state2) {
  if (state2 === "open") return { label: "\u5F00\u7740", tone: "warn" };
  if (state2 === "todo") return { label: "\u6D41\u8F6C\u4E2D", tone: "idle" };
  if (state2 === "done") return { label: "\u5B8C\u6210", tone: "ok" };
  if (state2 === "dropped") return { label: "\u4E22\u6389", tone: "idle" };
  return { label: state2, tone: "idle" };
}
function CaptureCenter(props) {
  const { phase, data, draft, onDraft, run, pending, onSelect, sel } = props;
  const [kind, setKind] = (0, import_react8.useState)("\u60F3\u6CD5");
  const submit = () => {
    const text = draft.trim();
    if (text === "" || pending) return;
    run(async () => {
      await captureOne(text, kind);
      onDraft("");
    }, "\u5DF2\u5B58\u5165 personal/INBOX.md\uFF08\u672B\u884C\uFF09\xB7 \u72B6\u6001 open", {
      label: "\u64A4\u9500\u8FD9\u6B21\u5199\u5165",
      run: () => undoCapture(text)
    });
  };
  const form = (0, import_react8.createElement)(
    "div",
    { className: "mo-capture-box" },
    KindButtons({ kinds: INBOX_KINDS, kind, onKind: setKind }),
    (0, import_react8.createElement)("label", { className: "mo-sr-only", htmlFor: "mo-capture-text" }, "\u8981\u8BB0\u7684\u5185\u5BB9"),
    (0, import_react8.createElement)("textarea", {
      className: "mo-capture-input",
      id: "mo-capture-text",
      "aria-label": "\u8981\u8BB0\u7684\u5185\u5BB9",
      placeholder: "\u4E00\u53E5\u8BDD\u5C31\u591F\u3002\u4F8B\uFF1A\u5BBF\u4E3B\u5BF9 git \u76F4\u88C5\u5224 not-updatable\uFF0C\u66F4\u65B0\u8981\u7ED9\u51FA\u4EBA\u8BDD\u89E3\u91CA",
      value: draft,
      onChange: (event) => {
        onDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" && (event.ctrlKey === true || event.metaKey === true)) {
          event.preventDefault();
          submit();
        }
      }
    }),
    (0, import_react8.createElement)(
      "p",
      { className: "mo-capture-note" },
      "\u4F1A\u5148\u843D\u8FDB ",
      (0, import_react8.createElement)("span", { className: "mo-num" }, "personal/INBOX.md"),
      "\uFF0C\u72B6\u6001 open\uFF1B\u5BC6\u94A5\u3001\u79C1\u94A5\u3001\u8EAB\u4EFD\u8BC1\u3001\u5185\u7F51 IP \u4F1A\u88AB\u62E6\u4E0B\u3002"
    ),
    (0, import_react8.createElement)(
      "div",
      { className: "mo-capture-actions" },
      BtnInk({
        children: pending ? "\u5199\u5165\u4E2D" : "\u5B58\u8FDB\u53BB",
        actName: "capture",
        disabled: pending || draft.trim() === "",
        onClick: submit
      }),
      (0, import_react8.createElement)(
        "span",
        { className: "mo-section-note mo-num" },
        `${num(draft.trim() === "" ? 0 : estimateTokens(draft))} tokens`
      )
    )
  );
  if (phase === "error") {
    return (0, import_react8.createElement)(
      "div",
      { className: "mo-pane-inner" },
      form,
      ErrorBlock({
        title: "\u8BFB\u4E0D\u5230\u300C\u6700\u8FD1\u8BB0\u7684\u300D",
        text: "INBOX \u5199\u5165\u4ECD\u53EF\u7528\uFF08\u4E0A\u9762\u8FD9\u4E2A\u6846\uFF09\uFF0C\u4F46\u8FD9\u4E00\u680F\u8BFB\u4E0D\u5230\u2014\u2014\u4E0D\u662F\u300C\u4E00\u6761\u90FD\u6CA1\u6709\u300D\u3002",
        example: "\u70B9\u4E0B\u9762\u7684\u300C\u91CD\u8BD5\u300D\uFF1B\u4ECD\u5931\u8D25\u5C31\u68C0\u67E5\u5E93\u6839\u76EE\u5F55",
        onRetry: () => {
          data.reloadAll();
        }
      })
    );
  }
  if (phase === "loading") {
    return (0, import_react8.createElement)("div", { className: "mo-pane-inner" }, form, Skeleton({ rows: 3, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u53D6\u6700\u8FD1\u8BB0\u7684" }));
  }
  const recent = [...data.inbox.data?.entries ?? []].reverse().slice(0, 3);
  if (phase === "empty") {
    return (0, import_react8.createElement)(
      "div",
      { className: "mo-pane-inner" },
      form,
      EmptyBlock({
        title: "\u4ECA\u5929\u8FD8\u6CA1\u8BB0\u4EFB\u4F55\u4E00\u6761",
        text: "\u8BB0\u4E00\u6761\u53EA\u8981\u4E00\u53E5\u8BDD\u3002\u5B83\u4F1A\u5148\u843D\u8FDB INBOX\uFF0C\u7B49\u4F60\u786E\u8BA4\u540E\u624D\u6210\u4E3A\u8BB0\u5FC6\u3002",
        hint: `INBOX \u5F53\u524D ${num(data.inbox.data?.throughput.open ?? 0)} \u6761 open`
      })
    );
  }
  return (0, import_react8.createElement)(
    "div",
    { className: "mo-pane-inner" },
    form,
    SectionHead({
      title: "\u6700\u8FD1\u8BB0\u7684",
      note: `${num(recent.length)} \u6761 \xB7 \u672A\u786E\u8BA4 \xB7 \u53F3\u5217\u7B49\u51E0\u5929`
    }),
    (0, import_react8.createElement)(
      "ul",
      { className: "mo-rows", role: "list" },
      recent.map((row) => {
        const state2 = inboxStateOf(row.state);
        return Row({
          spec: {
            id: `i:${row.lineIndex}`,
            title: clip(row.content, 80),
            meta: `${row.kind} \xB7 \u8BB0\u4E8E ${row.date}`,
            source: "INBOX",
            num: daysSince(row.date),
            state: state2.label,
            tone: state2.tone,
            dense: true,
            current: sel === `i:${row.lineIndex}`
          },
          onSelect
        });
      })
    )
  );
}
function CaptureInspector(props) {
  const { data, sel, notice, run, pending } = props;
  const rows = data.inbox.data?.entries ?? [];
  const selected = rows.find((row) => `i:${row.lineIndex}` === sel);
  if (notice !== null && !notice.ok) {
    const privacy = notice.kind === "privacy";
    return InspectorFrame({
      title: privacy ? "\u8FD9\u4E00\u7B14\u88AB\u9690\u79C1\u95F8\u95E8\u62E6\u4E0B" : "\u8FD9\u4E00\u7B14\u6CA1\u5199\u8FDB\u53BB",
      sub: privacy ? "\u672A\u5199\u5165\u4EFB\u4F55\u6587\u4EF6" : "\u5199\u5165\u5931\u8D25 \xB7 \u5E93\u91CC\u6CA1\u6709\u8FD9\u6B21\u6539\u52A8",
      body: (0, import_react8.createElement)(
        "div",
        null,
        (0, import_react8.createElement)(
          "div",
          { className: "mo-verdicts" },
          (0, import_react8.createElement)(
            "div",
            { className: `mo-verdict mo-verdict-${privacy ? "refuse" : "warn"}` },
            (0, import_react8.createElement)("span", { className: "mo-verdict-tag" }, privacy ? "\u62E6\u4E0B" : "\u5931\u8D25"),
            (0, import_react8.createElement)("span", null, notice.text)
          )
        ),
        (0, import_react8.createElement)(
          "p",
          { className: "mo-insp-text" },
          privacy ? "\u8131\u654F\u540E\u53EF\u4EE5\u91CD\u5B58\uFF1A\u628A\u503C\u6362\u6210\u5360\u4F4D\u7B26\uFF08\u5982 sk-***\uFF09\uFF0C\u539F\u6587\u4E0D\u8981\u8FDB\u5E93\u3002" : "\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u8FD9\u662F\u5199\u5165\u95EE\u9898\u3002\u7B49\u4E00\u4E24\u79D2\u91CD\u8BD5\uFF1B\u82E5\u63D0\u793A\u6587\u4EF6\u88AB\u5360\u7528\uFF0C\u8BF4\u660E\u53E6\u4E00\u4E2A\u8FDB\u7A0B\u6B63\u5728\u5199\u540C\u4E00\u4E2A\u6587\u4EF6\u3002"
        )
      )
    });
  }
  if (notice !== null && notice.ok) {
    return InspectorFrame({
      title: "\u5DF2\u5B58\u8FDB INBOX",
      sub: "personal/INBOX.md",
      body: (0, import_react8.createElement)(
        "div",
        null,
        Props({
          rows: [
            { label: "\u72B6\u6001", value: "open" },
            { label: "\u4F4D\u7F6E", value: "personal/INBOX.md \u672B\u884C" },
            { label: "\u4E0B\u4E00\u6B65", value: "\u5728\u300C\u5F85\u529E \xB7 \u6D41\u8F6C\u4E2D\u300D\u6539\u6210\u5F85\u529E" }
          ]
        }),
        (0, import_react8.createElement)(
          "p",
          { className: "mo-insp-text" },
          "\u8981\u5728\u5E93\u91CC\u751F\u6548\uFF0C\u9700\u8981\u4EBA\u786E\u8BA4\uFF1B\u7CFB\u7EDF\u4E0D\u4F1A\u81EA\u52A8\u628A\u5B83\u53D8\u6210\u8BB0\u5FC6\u3002"
        ),
        notice.undo === void 0 ? null : (0, import_react8.createElement)(
          "div",
          { style: { marginTop: "var(--mo-s2)" } },
          BtnGhost({ children: notice.undo.label, onClick: notice.undo.act, disabled: pending })
        )
      )
    });
  }
  if (selected !== void 0) {
    const state2 = inboxStateOf(selected.state);
    return InspectorFrame({
      title: clip(selected.content, 40),
      sub: `${selected.kind} \xB7 ${selected.date}`,
      body: (0, import_react8.createElement)(
        "div",
        null,
        Props({
          rows: [
            { label: "\u72B6\u6001", value: state2.label },
            { label: "\u884C\u53F7", value: String(selected.lineIndex + 1) },
            { label: "\u53BB\u5411", value: selected.destination === "" ? "\u2014" : selected.destination }
          ]
        }),
        (0, import_react8.createElement)(
          "p",
          { className: "mo-insp-text" },
          "INBOX \u662F append-only \u7684\u6587\u672C\u8868\uFF1A\u6539\u72B6\u6001\u53EA\u6539\u8FD9\u4E00\u884C\u7684\u72B6\u6001\u5217\uFF0C\u6B63\u6587\u4E0E\u884C\u5E8F\u90FD\u4E0D\u52A8\u3002"
        )
      ),
      foot: (0, import_react8.createElement)(
        "div",
        { style: { display: "flex", gap: "var(--mo-s2)" } },
        BtnGhost({
          children: "\u4E22\u6389",
          actName: "inbox-drop",
          disabled: pending,
          onClick: () => {
            run(async () => {
              await patchInboxRow(selected.lineIndex, { state: "dropped" });
            }, "\u5DF2\u6807\u4E3A\u4E22\u6389");
          }
        }),
        BtnGhost({
          children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u6807\u5B8C\u6210",
          actName: "inbox-done",
          disabled: pending,
          onClick: () => {
            run(async () => {
              await patchInboxRow(selected.lineIndex, { state: "done" });
            }, "\u5DF2\u6807\u4E3A\u5B8C\u6210");
          }
        })
      )
    });
  }
  return InspectorFrame({
    title: "\u8BB0\u4E00\u6761",
    sub: "INBOX \u2192 \u4EBA\u786E\u8BA4 \u2192 \u8BB0\u5FC6",
    body: (0, import_react8.createElement)(
      "div",
      null,
      (0, import_react8.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u4E09\u6761\u89C4\u77E9\uFF1A\u5148\u5199 INBOX\uFF0C\u4E0D\u76F4\u63A5\u843D\u6863\uFF1B\u9690\u79C1\u547D\u4E2D\u4E0D\u5199\u5165\uFF1B\u5199\u5165\u662F\u539F\u5B50\u8FFD\u52A0\uFF0C\u5E76\u53D1\u4E0D\u4F1A\u51FA\u73B0\u534A\u884C\u3002"
      ),
      Props({
        rows: [
          { label: "\u7C7B\u578B", value: "\u60F3\u6CD5 / \u8BA1\u5212 / \u95EE\u9898 / \u5F85\u529E / \u51B3\u7B56" },
          { label: "\u72B6\u6001\u673A", value: "open \u2192 todo \u2192 done / dropped" }
        ]
      })
    )
  });
}

// src/client/v9/panes/health.ts
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
  if (phase === "loading") return (0, import_react9.createElement)(Skeleton2, { rows: 2, height: 34 });
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

// src/client/v9/panes/health.ts
var OPS = [
  { id: "anchor", name: "\u6838\u5BF9\u5F15\u7528", note: "\u951A\u70B9\u91CC\u7684\u4EE3\u7801\u8FD8\u5728\u4E0D\u5728", route: "verifyAnchor" },
  { id: "compact", name: "\u53D8\u77ED", note: "\u7A7A\u884C\u4E0E\u91CD\u590D\u6807\u9898\uFF0C\u65E0\u635F\u538B\u7F29", route: "compact" },
  { id: "review", name: "\u6BCF\u5468\u590D\u76D8", note: "\u53EA\u8BFB\uFF1A\u8FD9\u4E00\u5468\u53D1\u751F\u4E86\u4EC0\u4E48", route: "review" },
  { id: "repair", name: "\u4FEE\u8865\u5143\u6570\u636E", note: "\u7F3A\u5931\u6216\u810F\u7684 frontmatter", route: "repairMeta" },
  { id: "promote", name: "\u53EF\u4FE1\u5EA6\u722C\u5347", note: "\u591A\u4E2A\u4F1A\u8BDD\u91CD\u590D\u7684\u63A8\u65AD", route: "promote" }
];
function meterSegments(buckets, total) {
  return buckets.filter((bucket) => bucket.tokens !== null && bucket.tokens > 0).map((bucket) => {
    const pct = total <= 0 ? 0 : Math.round((bucket.tokens ?? 0) / total * 100);
    const kind = bucket.id === "injected" ? "own" : "fixed";
    return (0, import_react10.createElement)("span", {
      key: bucket.id,
      className: `mo-meter-seg mo-meter-${kind}`,
      style: { width: `${pct}%` },
      title: `${bucket.name} ${num(bucket.tokens)} tokens`
    });
  });
}
function HealthCenter(props) {
  const { phase, data, counts, sel, onSelect, goto } = props;
  const health = useBridge("health", {});
  if (phase === "loading") return Skeleton({ rows: 5, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u53D6\u5E38\u9A7B\u6784\u6210\u4E0E\u7248\u672C" });
  if (phase === "error") {
    return ErrorBlock({
      title: "\u8BFB\u4E0D\u5230\u5E38\u9A7B\u6784\u6210",
      text: "skills \u670D\u52A1\u8BFB\u53D6\u5931\u8D25\u3002\u300C\u8BFB\u4E0D\u5230\u300D\u4E0D\u7B49\u4E8E\u300C\u6CA1\u6709\u300D\uFF1A\u6570\u5B57\u663E\u793A\u300C\u2014\u300D\uFF0C\u4E0D\u663E\u793A 0\u3002",
      example: "\u70B9\u4E0B\u9762\u7684\u300C\u91CD\u8BD5\u300D\uFF0C\u6216\u68C0\u67E5\u5BBF\u4E3B\u662F\u5426\u63D0\u4F9B skills \u670D\u52A1",
      onRetry: () => {
        void health.reload();
        data.reloadAll();
      }
    });
  }
  const buckets = bucketsOf({ snapshot: data.snapshot.data, overview: data.overview.data });
  const total = counts.resident;
  const readable = buckets.filter((bucket) => bucket.tokens !== null);
  const sum = readable.reduce((acc, bucket) => acc + (bucket.tokens ?? 0), 0);
  const unknown = buckets.filter((bucket) => bucket.tokens === null).map((bucket) => bucket.name);
  const diff = total - sum;
  const verdict = diff === 0 ? "\u5BF9\u5F97\u4E0A" : `\u5DEE ${num(diff)}\uFF08\u6709\u5E38\u9A7B\u9879\u6CA1\u88AB\u5206\u8FDB\u8FD9\u56DB\u6876\uFF09`;
  if (phase === "empty") {
    return (0, import_react10.createElement)(
      "div",
      { className: "mo-state-block" },
      (0, import_react10.createElement)("h2", { className: "mo-state-title" }, "\u6CA1\u6709\u4EFB\u4F55\u5E38\u9A7B\u5185\u5BB9"),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-state-text" },
        "\u6CA1\u6709 skill description\uFF0C\u4E5F\u6CA1\u6709\u7F6E\u9876\u6761\u76EE\u3002\u6B64\u65F6\u6BCF\u8BF7\u6C42\u53EA\u5269\u76EE\u5F55\u6846\u67B6\u3002"
      ),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-state-hint mo-num" },
        `catalog 0 \xB7 injected 0 \xB7 frame ${num(counts.frame)}`
      ),
      (0, import_react10.createElement)(
        "div",
        { className: "mo-state-actions" },
        BtnGhost({ children: "\u53BB\u5199\u7B2C\u4E00\u6761", actName: "go-capture", onClick: () => {
          goto("capture");
        } })
      )
    );
  }
  const legend = buckets.map((bucket) => {
    const share = bucket.tokens === null || total <= 0 ? "\u4E0D\u53EF\u8BFB" : `${Math.round(bucket.tokens / total * 100)}%`;
    const tone = bucket.tokens === null ? "err" : bucket.tokens > 0 ? "ok" : "idle";
    return (0, import_react10.createElement)(
      "span",
      { key: bucket.id, className: "mo-legend-item" },
      (0, import_react10.createElement)("span", { className: `mo-tonebar-inline mo-tone-${tone}` }),
      `${bucket.name} ${bucket.tokens === null ? EMPTY : num(bucket.tokens)} \xB7 ${share}`
    );
  });
  const bucketRows = buckets.map((bucket) => {
    const tone = bucket.state === "error" ? "err" : bucket.state === "empty" ? "idle" : "ok";
    const value = bucket.tokens === null ? "\u4E0D\u53EF\u8BFB" : `${num(bucket.tokens)} tokens`;
    return (0, import_react10.createElement)(
      "li",
      { key: bucket.id },
      (0, import_react10.createElement)(
        "button",
        {
          type: "button",
          className: "mo-bucket-row",
          "data-select": `b:${bucket.id}`,
          "aria-current": sel === `b:${bucket.id}` ? "true" : void 0,
          onClick: () => {
            onSelect(`b:${bucket.id}`);
          }
        },
        (0, import_react10.createElement)("span", { className: `mo-tonebar mo-tone-${tone}` }),
        (0, import_react10.createElement)(
          "span",
          { className: "mo-bucket-name" },
          bucket.name,
          " ",
          (0, import_react10.createElement)("span", {
            className: "mo-num",
            style: { color: "var(--dsw-alias-label-tertiary)" }
          }, bucket.en)
        ),
        (0, import_react10.createElement)("span", {
          className: "mo-bucket-num",
          "data-unknown": bucket.tokens === null ? "true" : void 0
        }, value),
        (0, import_react10.createElement)("span", { className: "mo-bucket-note" }, bucket.note)
      )
    );
  });
  const version = versionInfoOf(PLUGIN_VERSION);
  return (0, import_react10.createElement)(
    "div",
    { className: "mo-pane-inner" },
    SectionHead({
      title: "\u6BCF\u8BF7\u6C42\u90FD\u4ED8\u7684\u90E8\u5206",
      /* 三个口径必须分清：每请求 / 索引层（按需）/ 全库。挤在一行 note 里，
         是为了守住「5 页首屏 0 滚动」——多一行 p 就会把导出挤出首屏。 */
      note: `${num(total)} tokens \xB7 \u53E6\u6709\u7D22\u5F15\u5C42 ${num(data.overview.data?.kpi.indexTokens)} \u6309\u9700 \xB7 \u5168\u5E93 ${num(data.overview.data?.tokens)}`
    }),
    (0, import_react10.createElement)(
      "div",
      { className: "mo-meter-wrap" },
      (0, import_react10.createElement)("div", {
        className: "mo-meter",
        role: "img",
        "aria-label": `\u5E38\u9A7B\u524D\u7F00\u6309\u56DB\u6876\u5206\u6BB5\uFF1A\u5408\u8BA1 ${num(total)}\uFF1B\u5DE5\u5177 schema \u4E0D\u53EF\u8BFB\u4E0D\u8BA1\u5165`
      }, meterSegments(buckets, total)),
      (0, import_react10.createElement)("div", { className: "mo-meter-legend" }, legend),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-check-line" },
        `${num(counts.catalog)} + ${num(counts.frame)} + ${num(counts.injected)} = ${num(sum)}\uFF08${verdict}\uFF1B${unknown.length === 0 ? "\u56DB\u6876\u5168\u90E8\u53EF\u8BFB" : `\u4E0D\u542B${unknown.join("\u3001")}\uFF1A\u5F53\u524D\u4E0D\u53EF\u8BFB`}\uFF09`
      )
    ),
    (0, import_react10.createElement)("ul", { className: "mo-bucket-rows", role: "list" }, bucketRows),
    /* 版本不单开一段：note 里已经写明「点这里看五项」，多一段会把导出挤出首屏。 */
    (0, import_react10.createElement)(
      "ul",
      { className: "mo-bucket-rows", role: "list" },
      (0, import_react10.createElement)(
        "li",
        null,
        (0, import_react10.createElement)(
          "button",
          {
            type: "button",
            className: "mo-bucket-row",
            "data-select": "version",
            "aria-current": sel === "version" ? "true" : void 0,
            onClick: () => {
              onSelect("version");
            }
          },
          (0, import_react10.createElement)("span", { className: "mo-tonebar mo-tone-idle" }),
          (0, import_react10.createElement)("span", { className: "mo-bucket-name" }, "\u7248\u672C\u4E0E\u66F4\u65B0"),
          (0, import_react10.createElement)("span", { className: "mo-bucket-num mo-num" }, version.version),
          (0, import_react10.createElement)(
            "span",
            { className: "mo-bucket-note" },
            `\u5B89\u88C5\u65B9\u5F0F\uFF1A${version.install === EMPTY ? "\u5BBF\u4E3B\u672A\u63D0\u4F9B" : version.install} \xB7 \u76EE\u6807\uFF1A${version.target} \xB7 \u70B9\u8FD9\u91CC\u770B\u4E94\u9879`
          )
        )
      )
    ),
    SectionHead({ title: "\u7EF4\u62A4\u4F5C\u4E1A", note: "\u6309\u9700\u89E6\u53D1 \xB7 \u5BFC\u51FA\u5728\u4E0B\u65B9" }),
    (0, import_react10.createElement)(
      "p",
      { className: "mo-check-line" },
      `\u9A73\u56DE\u9759\u9ED8 ${num(health.data?.silenced.length)} \u6761 \xB7 \u5F85\u590D\u6838 ${num(health.data?.stale.length)} \u6761 \xB7 \u8D85 ${num(health.data?.lineLimit ?? 80)} \u884C ${num(health.data?.overLimit ?? counts.overLimit)} \u7BC7`
    ),
    (0, import_react10.createElement)(
      "ul",
      { className: "mo-bucket-rows", role: "list" },
      OPS.map((op) => (0, import_react10.createElement)(
        "li",
        { key: op.id },
        (0, import_react10.createElement)(
          "button",
          {
            type: "button",
            className: "mo-bucket-row mo-ops-row",
            "data-select": `ops:${op.id}`,
            "aria-current": sel === `ops:${op.id}` ? "true" : void 0,
            onClick: () => {
              onSelect(`ops:${op.id}`);
            }
          },
          (0, import_react10.createElement)("span", { className: "mo-bucket-name" }, op.name),
          (0, import_react10.createElement)("span", {
            className: "mo-bucket-num",
            style: { color: "var(--dsw-alias-label-secondary)" }
          }, op.note)
        )
      ))
    ),
    /* 导出不单开一段：它是低频动作，挤出一个 SectionHead 会把首屏撑出滚动。 */
    (0, import_react10.createElement)(
      "div",
      { className: "mo-toolbar", style: { padding: 0 } },
      BtnGhost({
        children: "\u5168\u90E8 Markdown",
        actName: "export",
        disabled: props.pending,
        onClick: () => {
          props.run(async () => {
            const result = await exportData("markdown");
            if (result.count === 0) throw new Error("\u8FD9\u6B21\u5BFC\u51FA 0 \u6761\uFF1A\u5E93\u53EF\u80FD\u662F\u7A7A\u7684");
          }, "\u5DF2\u5BFC\u51FA\u5168\u90E8\u8BB0\u5FC6\uFF0C\u6587\u4EF6\u540D\u5728\u56DE\u6267\u91CC");
        }
      }),
      BtnGhost({
        children: "\u4EC5\u4E2A\u4EBA\u57DF",
        actName: "export-personal",
        disabled: props.pending,
        onClick: () => {
          props.run(async () => {
            await exportData("markdown", "personal");
          }, "\u5DF2\u5BFC\u51FA\u4E2A\u4EBA\u57DF\u8BB0\u5FC6");
        }
      }),
      BtnGhost({
        children: "\u4EC5\u5DE5\u4F5C\u57DF",
        actName: "export-work",
        disabled: props.pending,
        onClick: () => {
          props.run(async () => {
            await exportData("markdown", "work");
          }, "\u5DF2\u5BFC\u51FA\u5DE5\u4F5C\u57DF\u8BB0\u5FC6");
        }
      })
    )
  );
}
function bucketFrame(bucket, props, health) {
  const { sel, onSelect, data, pending } = props;
  if (bucket.state === "error") {
    return InspectorFrame({
      title: `${bucket.name} \xB7 \u4E0D\u53EF\u8BFB`,
      sub: "state = error",
      body: (0, import_react10.createElement)(
        "div",
        null,
        (0, import_react10.createElement)(
          "div",
          { className: "mo-verdicts" },
          (0, import_react10.createElement)(
            "div",
            { className: "mo-verdict mo-verdict-refuse" },
            (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u539F\u56E0"),
            (0, import_react10.createElement)("span", null, bucket.note)
          )
        ),
        (0, import_react10.createElement)(
          "p",
          { className: "mo-insp-text" },
          "\u5408\u8BA1\u884C\u5DF2\u5199\u660E\u300C\u4E0D\u542B\u8FD9\u4E00\u6BB5\u300D\u3002\u628A\u4E0D\u53EF\u8BFB\u6E32\u67D3\u6210 0\uFF0C\u4F1A\u8BA9\u4EBA\u4EE5\u4E3A\u5DF2\u7ECF\u7B97\u5168\u4E86\u3002"
        )
      ),
      foot: BtnGhost({
        children: "\u91CD\u8BD5\u8BFB\u53D6",
        actName: "retry",
        disabled: pending,
        onClick: () => {
          health.reload();
          data.reloadAll();
        }
      })
    });
  }
  const itemRows = bucket.items.map((item) => (0, import_react10.createElement)(
    "li",
    { key: item.id },
    (0, import_react10.createElement)(
      "button",
      {
        type: "button",
        className: "mo-bucket-row",
        "data-select": `p:${item.id}`,
        "aria-current": sel === `p:${item.id}` ? "true" : void 0,
        onClick: () => {
          onSelect(`p:${item.id}`);
        }
      },
      (0, import_react10.createElement)("span", { className: "mo-tonebar mo-tone-ok" }),
      (0, import_react10.createElement)("span", { className: "mo-bucket-name" }, clip(item.name, 26)),
      (0, import_react10.createElement)("span", { className: "mo-bucket-num mo-num" }, num(item.tokens)),
      (0, import_react10.createElement)(
        "span",
        { className: "mo-bucket-note" },
        `${item.source === "" ? "\u5BBF\u4E3B\u6CE8\u5165" : item.source} \xB7 ${item.injected ? "\u5DF2\u8FDB\u7CFB\u7EDF\u63D0\u793A\u8BCD" : "\u672A\u6CE8\u5165"} \xB7 ${item.editable ? "\u53EF\u7F16\u8F91" : "\u53EA\u8BFB"}`
      )
    )
  ));
  return InspectorFrame({
    title: bucket.name,
    sub: `${bucket.en} \xB7 ${bucket.tokens === null ? "\u4E0D\u53EF\u8BFB" : `${num(bucket.tokens)} tokens`}`,
    body: (0, import_react10.createElement)(
      "div",
      null,
      bucket.state === "empty" ? (0, import_react10.createElement)(
        "div",
        null,
        (0, import_react10.createElement)(
          "div",
          { className: "mo-verdicts" },
          (0, import_react10.createElement)(
            "div",
            { className: "mo-verdict mo-verdict-ok" },
            (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u7A7A"),
            (0, import_react10.createElement)("span", null, bucket.note)
          )
        ),
        (0, import_react10.createElement)(
          "p",
          { className: "mo-insp-text" },
          "\u786E\u5B9E\u4E00\u6761\u90FD\u6CA1\u6709\u3002\u8FD9\u548C\u300C\u8BFB\u4E0D\u5230\u300D\u662F\u4E24\u79CD\u72B6\u6001\uFF0C\u6587\u6848\u4E0D\u8BB8\u5408\u5E76\u3002"
        )
      ) : (0, import_react10.createElement)("ul", { className: "mo-bucket-rows", role: "list" }, itemRows),
      bucket.readonly === void 0 ? null : (0, import_react10.createElement)("p", { className: "mo-effect" }, bucket.readonly)
    )
  });
}
function EntryEditor({ item, props }) {
  const { run, pending } = props;
  const detail = useBridge("detail", { path: item.source }, [item.source]);
  const [draft, setDraft] = (0, import_react10.useState)(null);
  (0, import_react10.useEffect)(() => {
    setDraft(null);
  }, [item.id]);
  const body = detail.data?.entry.body;
  const lines = body === void 0 ? [] : body.split("\n");
  const firstIndex = lines.findIndex((line) => line.trim() !== "");
  const firstLine = firstIndex >= 0 ? lines[firstIndex] ?? "" : "";
  const isHeading = /^#{1,3}\s/.test(firstLine);
  const original = firstLine.replace(/^#+\s*/, "");
  const value = draft ?? original;
  const before = estimateTokens(original);
  const after = estimateTokens(value);
  const delta = after - before;
  const changed = value !== original;
  const problems = [];
  if (value.trim() === "") problems.push("\u7A7A\u6807\u9898\u4F1A\u8BA9\u6A21\u578B\u62FF\u5230\u4E00\u6761\u65E0\u610F\u4E49\u89C4\u5219");
  if (value.includes("{{")) problems.push("\u542B {{\uFF1A\u4E0D\u4F1A\u505A\u53D8\u91CF\u63D2\u503C\uFF0C\u539F\u6587\u7167\u53D1");
  if (after > 64) problems.push("\u5355\u6761\u8D85 64 tokens\uFF1B\u8D85\u9884\u7B97\u6761\u76EE\u4F1A\u88AB\u8DF3\u8FC7\uFF0C\u7B49\u4E8E\u6CA1\u6CE8\u5165");
  const blocking = problems.some((problem) => problem.startsWith("\u7A7A\u6807\u9898")) || !isHeading;
  if (detail.phase === "loading") {
    return InspectorFrame({
      title: item.name,
      sub: "\u8BFB\u53D6\u4E2D",
      body: Skeleton({ rows: 2, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u53D6\u6B63\u6587" })
    });
  }
  if (detail.phase === "error" || body === void 0 || firstLine === "") {
    return InspectorFrame({
      title: "\u8BFB\u4E0D\u5230\u8FD9\u6761\u6B63\u6587",
      sub: "state = error",
      body: (0, import_react10.createElement)(
        "div",
        null,
        (0, import_react10.createElement)(
          "div",
          { className: "mo-verdicts" },
          (0, import_react10.createElement)(
            "div",
            { className: "mo-verdict mo-verdict-refuse" },
            (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u963B\u65AD"),
            (0, import_react10.createElement)("span", null, "\u8BFB\u4E0D\u5230\u5E93\uFF1A\u5148\u91CD\u8BD5\uFF0C\u518D\u7F16\u8F91\u3002\u9519\u8BEF\u6001\u4E0B\u4E0D\u7ED9\u53EF\u5199\u56DE\u7684\u6309\u94AE\u3002")
          )
        )
      )
    });
  }
  return InspectorFrame({
    title: "\u7F16\u8F91\u7F6E\u9876\u6761\u76EE",
    sub: `pinned \xB7 ${item.id}`,
    body: (0, import_react10.createElement)(
      "div",
      null,
      (0, import_react10.createElement)("p", { className: "mo-insp-label" }, "\u6807\u9898\u884C"),
      (0, import_react10.createElement)("input", {
        className: "mo-title-input",
        id: "mo-pin-title",
        "aria-label": "\u7F6E\u9876\u6761\u76EE\u6807\u9898",
        value,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }),
      (0, import_react10.createElement)("p", { className: "mo-insp-label" }, "\u6539\u52A8\u5BF9\u7167"),
      changed ? (0, import_react10.createElement)(
        "div",
        { className: "mo-diff", "aria-label": "\u6539\u52A8\u5BF9\u7167" },
        (0, import_react10.createElement)(
          "div",
          { className: "mo-diff-line mo-diff-removed" },
          (0, import_react10.createElement)("span", { className: "mo-diff-no mo-num" }, String(firstIndex + 1)),
          (0, import_react10.createElement)("span", { className: "mo-diff-text" }, original)
        ),
        (0, import_react10.createElement)(
          "div",
          { className: "mo-diff-line mo-diff-added" },
          (0, import_react10.createElement)("span", { className: "mo-diff-no mo-num" }, String(firstIndex + 1)),
          (0, import_react10.createElement)("span", { className: "mo-diff-text" }, value === "" ? "\uFF08\u7A7A\uFF09" : value)
        )
      ) : (0, import_react10.createElement)("p", { className: "mo-check-line" }, "\u672A\u6539\u52A8\uFF1A\u8349\u7A3F\u4E0E\u539F\u6587\u9010\u5B57\u4E00\u81F4\uFF08\u0394 0\uFF09\uFF0C\u4E0D\u753B\u5047 diff"),
      isHeading ? null : (0, import_react10.createElement)(
        "p",
        { className: "mo-check-line" },
        "\u8FD9\u6761\u6B63\u6587\u7684\u9996\u884C\u4E0D\u662F\u6807\u9898\uFF08# / ##\uFF09\uFF1A\u53EA\u80FD\u6539\u6B63\u6587\u5F00\u5934\u662F\u6807\u9898\u7684\u6761\u76EE\uFF0C\u907F\u514D\u628A\u4E00\u6BB5\u6B63\u6587\u6539\u5199\u6210 H1\u3002"
      ),
      Props({
        rows: [
          { label: "tokens", value: `${num(before)} \u2192 ${num(after)}\uFF08\u0394 ${delta > 0 ? "+" : ""}${num(delta)}\uFF09` },
          { label: "\u6765\u6E90", value: item.source },
          { label: "\u6761\u6570", value: "1 \u6761\uFF08\u6539\u6807\u9898\u4E0D\u6539 id\uFF09" }
        ]
      }),
      (0, import_react10.createElement)(
        "div",
        { className: "mo-verdicts" },
        problems.length === 0 ? (0, import_react10.createElement)(
          "div",
          { className: "mo-verdict mo-verdict-ok" },
          (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u901A\u8FC7"),
          (0, import_react10.createElement)("span", null, "\u53EF\u4FDD\u5B58")
        ) : problems.map((problem) => (0, import_react10.createElement)(
          "div",
          {
            key: problem,
            className: `mo-verdict ${problem.startsWith("\u7A7A\u6807\u9898") ? "mo-verdict-refuse" : "mo-verdict-warn"}`
          },
          (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u8B66"),
          (0, import_react10.createElement)("span", null, problem)
        ))
      ),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-effect" },
        "\u751F\u6548\u65F6\u673A\uFF1A\u6CE8\u5165\u6BB5\u7F13\u5B58 30 \u79D2\u5185\u5237\u65B0\uFF1B\u65B0\u4F1A\u8BDD\u4E00\u5B9A\u8BFB\u5230\u65B0\u6807\u9898\u3002\u5F53\u524D\u4F1A\u8BDD\u5DF2\u7EC4\u88C5\u7684\u63D0\u793A\u8BCD\u4E0D\u8FFD\u6539\u3002"
      )
    ),
    foot: (0, import_react10.createElement)(
      "div",
      { style: { display: "flex", gap: "var(--mo-s2)" } },
      BtnGhost({
        children: "\u53D6\u6D88",
        actName: "cancel-edit",
        disabled: pending || !changed,
        onClick: () => {
          setDraft(null);
        }
      }),
      BtnInk({
        children: pending ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58",
        actName: "save-pin",
        id: "mo-save-pin",
        disabled: pending || blocking || !changed,
        onClick: () => {
          const nextLines = [...lines];
          nextLines[firstIndex] = `# ${value.trim()}`;
          const next = nextLines.join("\n");
          run(async () => {
            await writeBody(item.source, next);
            setDraft(null);
          }, `\u5DF2\u5199\u56DE ${item.source}\uFF08\u6539 1 \u884C\uFF09\xB7 \u65B0\u4F1A\u8BDD\u751F\u6548`);
        }
      })
    )
  });
}
function versionFrame() {
  const version = versionInfoOf(PLUGIN_VERSION);
  return InspectorFrame({
    title: `\u7248\u672C \xB7 ${version.version}`,
    sub: "V3 \xB7 \u7248\u672C\u4E94\u9879\u4E0E\u5DEE\u5F02\u6E05\u5355",
    body: (0, import_react10.createElement)(
      "div",
      null,
      Props({
        rows: [
          { label: "\u5F53\u524D\u7248\u672C", value: version.version },
          { label: "\u4EE3\u7801\u6765\u6E90", value: version.source },
          { label: "\u5B89\u88C5\u65B9\u5F0F", value: version.install },
          { label: "\u5F53\u524D\u63D0\u4EA4", value: version.commit },
          { label: "\u76EE\u6807", value: version.target }
        ]
      }),
      (0, import_react10.createElement)(
        "div",
        { className: "mo-verdicts" },
        (0, import_react10.createElement)(
          "div",
          { className: "mo-verdict mo-verdict-warn" },
          (0, import_react10.createElement)("span", { className: "mo-verdict-tag" }, "\u65E0\u6CD5\u6BD4\u8F83"),
          (0, import_react10.createElement)("span", null, version.reason)
        )
      ),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u8FD9\u4E0D\u662F\u5931\u8D25\uFF1A\u6CA1\u6709\u53EF\u6BD4\u8F83\u7684\u7248\u672C\u53F7\u5C31\u4E0D\u8BE5\u7ED9\u4F60\u4E00\u4E2A\u300C\u53EF\u66F4\u65B0\u5230 X\u300D\u3002\u8981\u66F4\u65B0\u5C31\u7528\u5BBF\u4E3B\u63D2\u4EF6\u9875\u7684\u66F4\u65B0\u5165\u53E3\uFF1B\u70ED\u66F4\u65B0\u5931\u8D25\u5BBF\u4E3B\u4F1A\u81EA\u52A8\u56DE\u6EDA\u65E7\u7248\u672C\u3002"
      ),
      (0, import_react10.createElement)("p", { className: "mo-check-line" }, "\u5DEE\u5F02\u6E05\u5355\uFF1A\u2014\uFF08\u5BBF\u4E3B\u672A\u63D0\u4F9B commits \u5BF9\u6BD4\uFF09")
    ),
    foot: BtnGhost({
      children: "\u590D\u5236\u63D2\u4EF6\u6765\u6E90",
      actName: "copy-source",
      onClick: () => {
        const source = "github:Lixb53/memory-ops-dsh#path:packages/dsh-plugin";
        if (typeof navigator !== "undefined" && navigator.clipboard !== void 0) {
          void navigator.clipboard.writeText(source);
        }
      }
    })
  });
}
function opsFrame(sel, onOpenMemory) {
  const op = OPS.find((item) => `ops:${item.id}` === sel) ?? OPS[0];
  return InspectorFrame({
    title: `\u7EF4\u62A4\uFF1A${op.name}`,
    sub: `${op.route} \xB7 \u5148\u9884\u89C8\uFF0C\u518D\u6267\u884C`,
    body: (0, import_react10.createElement)(
      "div",
      null,
      (0, import_react10.createElement)("p", { className: "mo-insp-text" }, op.note),
      (0, import_react10.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u8FD9\u4E9B\u4F5C\u4E1A\u90FD\u4F1A\u6539\u8BB0\u5FC6\u7684\u5185\u5BB9\u6216\u53EF\u4FE1\u5EA6\uFF0C\u6240\u4EE5\u4E00\u5F8B\u5148\u7ED9\u9884\u89C8\u3001\u4F60\u70B9\u4E86\u624D\u6267\u884C\u3002"
      ),
      /*
       * onOpenMemory 不能是空函数：维护面板把「看这条」挂在 5 个分区的
       * 可点行与 Enter/Space 上，空实现 = 可聚焦、可激活、零结果。
       */
      (0, import_react10.createElement)(MaintenancePanel, { onOpenMemory })
    )
  });
}
function HealthInspector(props) {
  const { data, sel, goto } = props;
  const health = useBridge("health", {});
  const buckets = bucketsOf({ snapshot: data.snapshot.data, overview: data.overview.data });
  if (sel.startsWith("ops:")) return opsFrame(sel, (path) => {
    goto("memory", path);
  });
  if (sel === "version") return versionFrame();
  if (sel.startsWith("p:")) {
    const id = sel.slice(2);
    const injected = buckets.find((bucket2) => bucket2.id === "injected");
    const item = injected?.items.find((entry) => entry.id === id);
    if (item !== void 0) return (0, import_react10.createElement)(EntryEditor, { item, props });
  }
  const bucket = buckets.find((entry) => sel === `b:${entry.id}`) ?? buckets[0];
  if (bucket !== void 0) return bucketFrame(bucket, props, health);
  return InspectorFrame({
    title: "\u9009\u4E00\u884C",
    sub: "\u6876 / \u7248\u672C / \u7EF4\u62A4\u4F5C\u4E1A",
    body: (0, import_react10.createElement)(
      "p",
      { className: "mo-insp-text" },
      "\u56DB\u6876\u4E4B\u548C\u5FC5\u987B\u7B49\u4E8E\u9876\u680F\u90A3\u4E2A\u6570\u3002\u5BF9\u4E0D\u4E0A\u65F6\uFF0C\u8FD9\u4E00\u680F\u4F1A\u5199\u51FA\u5DEE\u989D\u548C\u539F\u56E0\uFF0C\u800C\u4E0D\u662F\u6084\u6084\u53D6\u6574\u3002"
    )
  });
}

// src/client/v9/panes/memory.ts
var import_react11 = require("react");
function MemoryCenter(props) {
  const { phase, data, sel, onSelect, run, pending, counts, goto } = props;
  const [face, setFace] = (0, import_react11.useState)("content");
  const [query, setQuery] = (0, import_react11.useState)("");
  const [submitted, setSubmitted] = (0, import_react11.useState)("");
  if (phase === "loading") return Skeleton({ rows: 6, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u53D6\u5168\u5E93\u6761\u76EE" });
  if (phase === "error") {
    return ErrorBlock({
      title: "\u8BFB\u4E0D\u5230\u6761\u76EE\u7D22\u5F15",
      text: "\u7D22\u5F15\u6587\u4EF6\u7F3A\u5931\u6216\u4E0D\u53EF\u8BFB\u3002\u6761\u76EE\u6B63\u6587\u901A\u5E38\u8FD8\u5728\uFF0C\u91CD\u5EFA\u7D22\u5F15\u5373\u53EF\u3002",
      example: "\u70B9\u4E0B\u9762\u7684\u300C\u91CD\u8BD5\u300D\uFF1B\u4FEE\u597D\u540E\u8FD9\u91CC\u4F1A\u663E\u793A\u771F\u5B9E\u6761\u6570",
      onRetry: () => {
        data.reloadAll();
      }
    });
  }
  const rows = memoryRowsOf(data.snapshot.data, face, submitted);
  const filteredEmpty = submitted.trim() !== "" && rows.length === 0;
  if (phase === "empty") {
    return EmptyBlock({
      title: "\u5E93\u91CC\u8FD8\u6CA1\u6709\u4EFB\u4F55\u8BB0\u5FC6",
      text: "\u8BB0\u5FC6\u662F\u786E\u8BA4\u8FC7\u7684\u6761\u76EE\uFF1B\u8BB0\u5F55\u6D41\u91CC\u7684 INBOX \u884C\u8FD8\u4E0D\u7B97\u3002\u5148\u53BB\u8BB0\u4E00\u6761\uFF0C\u786E\u8BA4\u540E\u5B83\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
      hint: "INBOX \u4E0E\u8BB0\u5FC6\u5206\u5F00\u8BA1\u6570\uFF1A\u5168\u5E93 0 \u6761\u8BB0\u5FC6",
      action: { label: "\u53BB\u8BB0\u4E00\u6761", actName: "go-capture", act: () => {
        goto("capture");
      } }
    });
  }
  const retiring = memoryEntries(data.snapshot.data).filter((entry) => entry.expiry.level === "stale" || entry.expiry.level === "retire");
  const head = face === "cost" ? TableHead({ columns: [{ label: "\u6807\u9898" }, { label: "\u5F52\u5C5E" }, { label: "tokens", num: true }, { label: "\u8BA1\u8D39" }] }) : TableHead({ columns: [{ label: "\u6807\u9898" }, { label: "\u5F52\u5C5E" }, { label: "\u5F15\u7528", num: true }, { label: "\u72B6\u6001" }] });
  const emptyBlock = filteredEmpty ? (0, import_react11.createElement)(
    "div",
    { className: "mo-state-block" },
    (0, import_react11.createElement)("h2", { className: "mo-state-title" }, `\u6CA1\u6709\u5339\u914D\u300C${clip(submitted, 16)}\u300D\u7684\u6761\u76EE`),
    (0, import_react11.createElement)(
      "p",
      { className: "mo-state-text" },
      "\u8FD9\u6B21\u68C0\u7D22\u5DF2\u8BB0\u4E00\u6761\u672A\u547D\u4E2D\u2014\u2014\u672A\u547D\u4E2D\u4F1A\u8FDB\u300C\u5F85\u8865\u5E93\u300D\uFF0C\u4E0D\u662F\u767D\u641C\u3002"
    ),
    (0, import_react11.createElement)("p", { className: "mo-state-hint mo-num" }, `\u5168\u5E93\u4ECD\u662F ${num(counts.entries)} \u6761`),
    (0, import_react11.createElement)(
      "div",
      { className: "mo-state-actions" },
      BtnGhost({
        children: "\u6E05\u6389\u5173\u952E\u8BCD",
        actName: "clear-filter",
        onClick: () => {
          setQuery("");
          setSubmitted("");
        }
      })
    )
  ) : null;
  const toolbar = (0, import_react11.createElement)(
    "div",
    { className: "mo-toolbar" },
    (0, import_react11.createElement)("label", { className: "mo-sr-only", htmlFor: "mo-memory-search" }, "\u641C\u7D22\u6807\u9898\u4E0E\u6B63\u6587"),
    (0, import_react11.createElement)("input", {
      className: "mo-field",
      id: "mo-memory-search",
      type: "search",
      "aria-label": "\u641C\u7D22\u6807\u9898\u4E0E\u6B63\u6587",
      placeholder: "\u641C\u6807\u9898\u3001\u8DEF\u5F84\u6216\u8BC1\u636E\uFF08\u4F1A\u8BA1\u5165\u547D\u4E2D\u7387\uFF09",
      value: query,
      onChange: (event) => {
        setQuery(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        submitSearch();
      }
    }),
    (0, import_react11.createElement)("button", {
      type: "button",
      className: "mo-btn",
      "data-act": "search",
      disabled: pending || query.trim() === "",
      onClick: submitSearch
    }, "\u641C")
  );
  function submitSearch() {
    const keyword = query.trim();
    setSubmitted(keyword);
    run(
      async () => {
        await searchEntries(keyword, keyword !== "");
      },
      keyword === "" ? "\u6E05\u6389\u5173\u952E\u8BCD\uFF0C\u663E\u793A\u5168\u90E8\u6761\u76EE" : `\u5DF2\u68C0\u7D22\u300C${clip(keyword, 12)}\u300D\u5E76\u8BB0\u8D26`
    );
  }
  return (0, import_react11.createElement)(
    "div",
    { className: "mo-pane-inner" },
    FaceSwitch({ face, onChange: setFace }),
    toolbar,
    head,
    emptyBlock === null ? (0, import_react11.createElement)(
      "ul",
      { className: "mo-rows", role: "list" },
      rows.map((row) => Row({
        spec: {
          id: row.id,
          title: row.title,
          meta: row.meta,
          source: row.group,
          num: row.num,
          state: row.state,
          tone: row.tone,
          current: sel === row.id
        },
        onSelect
      }))
    ) : emptyBlock,
    (0, import_react11.createElement)(
      "p",
      { className: "mo-check-line" },
      `${face === "cost" ? "\u6309\u4F53\u79EF\u964D\u5E8F \xB7 " : "\u5E93\u5185\u987A\u5E8F \xB7 "}${num(rows.length)} \u6761 \xB7 \u6570\u5B57\u5747\u4E3A\u4F30\u7B97`,
      retiring.length === 0 ? " \xB7 \u6CA1\u6709\u5230\u671F\u6761\u76EE" : (0, import_react11.createElement)(
        "span",
        null,
        " \xB7 ",
        TextLink({
          children: `\u6279\u91CF\u5F52\u6863\u5230\u671F\u7684 ${num(retiring.length)} \u6761`,
          actName: "batch-archive",
          onClick: () => {
            run(
              async () => {
                await batchArchive(retiring.map((entry) => entry.path), "90 \u5929\u672A\u5F15\u7528\uFF0C\u6279\u91CF\u9000\u5F79");
              },
              `\u5DF2\u5F52\u6863 ${retiring.length} \u6761 \xB7 \u68C0\u7D22\u4E0D\u518D\u8FD4\u56DE\u5B83\u4EEC`
            );
          }
        })
      )
    )
  );
}
function MemoryInspector(props) {
  const { data, sel, run, pending } = props;
  const entry = (data.snapshot.data?.entries ?? []).find((item) => !item.id.endsWith(".INBOX") && (item.id === sel || item.path === sel));
  const path = entry?.path ?? "";
  const detail = useBridge("detail", path === "" ? {} : { path }, [path]);
  const [reason, setReason] = (0, import_react11.useState)("");
  if (entry === void 0) {
    return InspectorFrame({
      title: "\u9009\u4E00\u6761\u8BB0\u5FC6",
      sub: "\u5DE6\u8FB9\u70B9\u4E00\u884C\uFF0C\u8FD9\u91CC\u51FA\u6765\u6E90\u3001\u8BC1\u636E\u3001\u951A\u70B9",
      body: (0, import_react11.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u68C0\u7D22\u547D\u4E2D\u4F1A\u8BB0 recall\uFF0C\u771F\u6B63\u88AB\u5F15\u7528\u624D\u8BB0 cite\u2014\u2014\u6240\u4EE5\u547D\u4E2D\u7387\u4E0D\u662F 100% \u7684\u81EA\u5938\u6570\u3002"
      )
    });
  }
  const anchorState = detail.data?.trust.anchorState;
  const anchorText = anchorState !== void 0 ? anchorLabelOf(anchorState) : detail.phase === "error" ? "\u8BFB\u4E0D\u5230\uFF08detail \u5931\u8D25\uFF09" : entry.anchor === null ? "\u65E0\u951A\u70B9" : "\u672A\u6838\u5BF9\uFF08\u8BFB\u53D6\u4E2D\uFF09";
  const cited = entry.citeCount === 0 ? "\u672A\u5F15\u7528" : `\u5F15\u7528 ${num(entry.citeCount)} \u6B21`;
  const rows = [
    { label: "\u8DEF\u5F84", value: entry.path },
    { label: "\u5F52\u5C5E", value: entry.domainLabel || entry.domain },
    { label: "\u5C42\u7EA7", value: `${entry.layer} \xB7 \u6309\u9700\u8BFB\u53D6` },
    { label: "\u4F53\u79EF", value: withUnit(entry.tokens, "tokens") },
    { label: "\u72B6\u6001", value: statusLabelOf(entry.status) },
    { label: "\u5F15\u7528", value: `${cited}\uFF0830 \u5929\uFF09` },
    { label: "\u951A\u70B9", value: anchorText }
  ];
  const badge = anchorState === "stale" ? (0, import_react11.createElement)(
    "div",
    { className: "mo-verdicts" },
    (0, import_react11.createElement)(
      "div",
      { className: "mo-verdict mo-verdict-warn" },
      (0, import_react11.createElement)("span", { className: "mo-verdict-tag" }, "\u6CE8\u610F"),
      (0, import_react11.createElement)("span", null, "\u951A\u70B9\u5BF9\u4E0D\u4E0A\uFF0C\u68C0\u7D22\u5DF2\u964D\u6743 0.4\uFF1B\u590D\u6838\u901A\u8FC7\u53EF\u6062\u590D\u3002")
    )
  ) : null;
  const excerpt = detail.data?.entry.body ? clip(detail.data.entry.body.replace(/\s+/g, " "), 220) : null;
  const isRetire = entry.status === "stale" || entry.expiry.level === "stale" || entry.expiry.level === "retire";
  const body = (0, import_react11.createElement)(
    "div",
    null,
    Props({ rows }),
    (0, import_react11.createElement)("p", { className: "mo-insp-label" }, "\u8BC1\u636E"),
    (0, import_react11.createElement)(
      "p",
      { className: "mo-insp-text" },
      entry.evidence.length === 0 ? "\u8FD9\u6761\u6CA1\u6709\u8BC1\u636E\u8BB0\u5F55\uFF1A\u53EA\u53EF\u80FD\u662F\u4F60\u624B\u5199\u7684\uFF0C\u6216\u6765\u81EA\u66F4\u65E9\u7684\u5BFC\u5165\u3002" : `${num(entry.evidence.length)} \u6761\uFF1A${clip(entry.evidence.map((item) => item.excerpt ?? item.gate ?? item.session ?? "\u2014").join(" / "), 160)}`
    ),
    excerpt === null ? null : (0, import_react11.createElement)("p", { className: "mo-insp-label" }, "\u6B63\u6587\u6458\u8981"),
    excerpt === null ? null : (0, import_react11.createElement)("p", { className: "mo-check-line" }, excerpt),
    badge
  );
  if (isRetire) {
    return InspectorFrame({
      title: entry.title,
      sub: `${entry.domainLabel || entry.domain} \xB7 ${withUnit(entry.tokens, "tokens")}`,
      body,
      foot: (0, import_react11.createElement)(
        "div",
        { style: { display: "flex", gap: "var(--mo-s2)" } },
        BtnGhost({
          children: "\u518D\u7559 90 \u5929",
          actName: "keep",
          disabled: pending,
          onClick: () => {
            run(async () => {
              await keepEntry(path);
            }, "\u5DF2\u518D\u7559 90 \u5929");
          }
        }),
        BtnInk({
          children: pending ? "\u5F52\u6863\u4E2D\u2026" : "\u5F52\u6863",
          actName: "archive",
          disabled: pending,
          onClick: () => {
            run(async () => {
              await archiveEntry(path);
            }, "\u5DF2\u5F52\u6863 \xB7 \u68C0\u7D22\u4E0D\u518D\u8FD4\u56DE\u5B83");
          }
        })
      )
    });
  }
  return InspectorFrame({
    title: entry.title,
    sub: `${entry.domainLabel || entry.domain} \xB7 ${withUnit(entry.tokens, "tokens")}`,
    body: (0, import_react11.createElement)(
      "div",
      null,
      body,
      /*
       * 驳回理由必须由人写：硬编码一句系统话术会让 30 天后的复查
       * 分不清「人判的」与「系统替我判的」。
       */
      (0, import_react11.createElement)("p", { className: "mo-insp-label" }, "\u9A73\u56DE\u8981\u5199\u7406\u7531\uFF0830 \u5929\u5185\u4E0D\u518D\u6CE8\u5165\uFF09"),
      (0, import_react11.createElement)("textarea", {
        className: "mo-reason-input",
        "aria-label": "\u9A73\u56DE\u7406\u7531",
        placeholder: "\u4F8B\uFF1A\u8FD9\u6761\u7ED3\u8BBA\u53EA\u5BF9\u4E0A\u4E2A\u5B63\u5EA6\u7684\u76EE\u5F55\u7ED3\u6784\u6210\u7ACB",
        value: reason,
        onChange: (event) => {
          setReason(event.target.value);
        }
      }),
      reason.trim() === "" ? (0, import_react11.createElement)("p", { className: "mo-check-line" }, "\u7406\u7531\u4E3A\u7A7A\u4E0D\u80FD\u9A73\u56DE") : null
    ),
    foot: (0, import_react11.createElement)(
      "div",
      { style: { display: "flex", gap: "var(--mo-s2)" } },
      BtnGhost({
        children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u9A73\u56DE",
        actName: "reject",
        disabled: pending || reason.trim() === "",
        onClick: () => {
          const why = reason.trim();
          run(async () => {
            await rejectEntry(path, why);
          }, "\u5DF2\u9A73\u56DE \xB7 30 \u5929\u9759\u9ED8\uFF08\u53EF\u64A4\u9500\uFF09", {
            label: "\u64A4\u9500\u9A73\u56DE",
            run: () => undoReject(path)
          });
        }
      }),
      BtnInk({
        children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u786E\u8BA4",
        actName: "confirm",
        disabled: pending,
        onClick: () => {
          run(async () => {
            await confirmEntry(path);
          }, "\u5DF2\u786E\u8BA4");
        }
      })
    )
  });
}

// src/client/v9/panes/today.ts
var import_react12 = require("react");
function rowOf(clue, current) {
  return {
    id: clue.id,
    title: clue.title,
    meta: clue.meta,
    source: clue.group,
    num: clue.num,
    state: clue.state,
    tone: clue.tone,
    current
  };
}
function TodayCenter(props) {
  const { phase, counts, sel, onSelect, data, draft, onDraft, run, pending, goto } = props;
  if (phase === "loading") return Skeleton({ rows: 4, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u6C47\u603B\u7EBF\u7D22" });
  if (phase === "error") {
    return ErrorBlock({
      title: "\u8BFB\u4E0D\u5230\u4ECA\u5929\u7684\u7EBF\u7D22",
      text: "\u6865\u6CA1\u6709\u8FD4\u56DE\u6570\u636E\u3002\u7EBF\u7D22\u4E0D\u4F1A\u6D88\u5931\u2014\u2014\u5E93\u6587\u4EF6\u8FD8\u5728\uFF0C\u91CD\u53D6\u4E00\u6B21\u5C31\u597D\u3002",
      example: "\u70B9\u4E0B\u9762\u7684\u300C\u91CD\u8BD5\u300D\uFF1B\u4ECD\u5931\u8D25\u5C31\u68C0\u67E5\u5E93\u6839\u76EE\u5F55\u662F\u5426\u53EF\u8BFB",
      onRetry: () => {
        data.reloadAll();
      }
    });
  }
  if (phase === "empty") {
    return EmptyBlock({
      title: "\u73B0\u5728\u6CA1\u6709\u538B\u7740\u7684\u4E8B",
      text: `\u5F85\u62CD\u677F 0 \u6761\u3001\u6D41\u8F6C\u4E2D 0 \u6761\u3001\u5F85\u8865\u5E93 0 \u6761\u3002\u5E93\u91CC ${num(counts.entries)} \u6761\u8BB0\u5FC6\u90FD\u5904\u7406\u5B8C\u4E86\uFF1B\u4E0B\u4E00\u6B21\u6355\u83B7\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002`,
      hint: `INBOX \u5F53\u524D ${num(counts.inboxTotal)} \u6761 \xB7 \u5DF2\u7ED3 ${num(Math.max(0, counts.inboxTotal - counts.flow))} \u6761`,
      action: { label: "\u8BB0\u4E00\u6761", actName: "go-capture", act: () => {
        goto("capture");
      } }
    });
  }
  const clues = cluesOf({ snapshot: data.snapshot.data, overview: data.overview.data, inbox: data.inbox.data, misses: data.misses.data });
  const submit = () => {
    const text = draft.trim();
    if (text === "") return;
    run(async () => {
      await captureOne(text, "\u60F3\u6CD5");
      onDraft("");
    }, "\u5DF2\u5B58\u5165 personal/INBOX.md \xB7 \u72B6\u6001 open");
  };
  return (0, import_react12.createElement)(
    "div",
    { className: "mo-pane-inner" },
    SectionHead({
      title: "\u7EBF\u7D22",
      note: `${num(clues.length)} \u6761 \xB7 \u6309\u8BE5\u52A8\u624B\u7684\u987A\u5E8F \xB7 \u53F3\u5217 tokens`
    }),
    (0, import_react12.createElement)(
      "ul",
      { className: "mo-rows", role: "list" },
      clues.map((clue) => Row({ spec: rowOf(clue, sel === clue.id), onSelect }))
    ),
    SectionHead({ title: "\u968F\u624B\u8BB0", note: "\u5148\u843D INBOX\uFF0C\u7B49\u4F60\u786E\u8BA4" }),
    (0, import_react12.createElement)(
      "div",
      { className: "mo-toolbar" },
      (0, import_react12.createElement)("label", { className: "mo-sr-only", htmlFor: "mo-today-capture" }, "\u968F\u624B\u8BB0\u4E00\u53E5"),
      (0, import_react12.createElement)("input", {
        className: "mo-field",
        id: "mo-today-capture",
        type: "text",
        "aria-label": "\u968F\u624B\u8BB0\u4E00\u53E5",
        placeholder: "\u4E00\u53E5\u8BDD\u5C31\u591F\u3002\u4F8B\uFF1A\u5BBF\u4E3B\u5BF9 git \u76F4\u88C5\u5224 not-updatable",
        value: draft,
        onChange: (event) => {
          onDraft(event.target.value);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }
      }),
      (0, import_react12.createElement)("button", {
        type: "button",
        className: "mo-btn",
        "data-act": "today-save",
        disabled: pending || draft.trim() === "",
        onClick: submit
      }, pending ? "\u5199\u5165\u4E2D" : "\u5B58")
    )
  );
}
function TodayInspector(props) {
  const { data, sel, pending, run, goto } = props;
  const clues = cluesOf({ snapshot: data.snapshot.data, overview: data.overview.data, inbox: data.inbox.data, misses: data.misses.data });
  const clue = clues.find((item) => item.id === sel) ?? clues[0];
  if (clue === void 0) {
    return InspectorFrame({
      title: "\u9009\u4E00\u6761\u7EBF\u7D22",
      sub: "\u5DE6\u8FB9\u70B9\u4E00\u884C\uFF0C\u8FD9\u91CC\u51FA\u8BE6\u60C5\u4E0E\u52A8\u4F5C",
      body: (0, import_react12.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u7EBF\u7D22\u6309\u300C\u8BE5\u52A8\u624B\u7684\u987A\u5E8F\u300D\u6392\uFF1A\u5F85\u62CD\u677F \u2192 \u7F3A\u7684\u6761\u76EE \u2192 \u8BE5\u6574\u7406\u7684 \u2192 \u6210\u672C \u2192 \u6D41\u8F6C\u3002"
      )
    });
  }
  const body = (0, import_react12.createElement)(
    "div",
    null,
    Props({
      rows: [
        { label: "\u72B6\u6001", value: clue.state },
        { label: "\u6570\u91CF", value: withUnit(clue.num, clue.group === "\u6210\u672C" ? "tokens" : "\u4EF6") }
      ]
    }),
    (0, import_react12.createElement)("p", { className: "mo-insp-text" }, clue.detail)
  );
  const primary = BtnInk({
    children: pending ? "\u5904\u7406\u4E2D\u2026" : clue.actionLabel,
    actName: "clue-primary",
    disabled: pending,
    onClick: () => {
      if (clue.action === "draft-miss") {
        if (clue.query === void 0) {
          run(async () => {
            throw new Error("\u6CA1\u6709\u53EF\u5199\u8349\u7A3F\u7684\u76EE\u6807\uFF08\u672A\u547D\u4E2D\u6761\u76EE\u53EF\u80FD\u521A\u88AB\u5904\u7406\uFF09");
          });
          return;
        }
        const query = clue.query;
        run(async () => {
          await draftMiss(query);
        }, "\u8349\u7A3F\u5DF2\u5199\u8FDB INBOX \xB7 \u843D\u6863\u4ECD\u8981\u4F60\u70B9\u5934");
        return;
      }
      if (clue.action === "goto-todo") {
        goto("todo", clue.gotoKey);
        return;
      }
      if (clue.action === "goto-memory") {
        goto("memory", clue.gotoKey);
        return;
      }
      goto("health", clue.gotoKey);
    }
  });
  const secondary = BtnGhost({
    children: "\u5148\u4E0D\u7BA1",
    actName: "dismiss",
    onClick: () => {
      goto(clue.action === "goto-health" ? "today" : "todo");
    }
  });
  const costHint = clue.group === "\u6210\u672C" && data.overview.phase === "error" ? "\u8FD9\u4E00\u5E26\u7684\u6570\u5B57\u8BFB\u4E0D\u5230\uFF08\u663E\u793A \u2014\uFF09\uFF1A\u5148\u91CD\u8BD5\uFF0C\u518D\u5224\u65AD\u8BE5\u5173\u54EA\u4E00\u6761\u3002" : null;
  return InspectorFrame({
    title: clue.title,
    sub: clue.group,
    body: costHint === null ? body : (0, import_react12.createElement)(
      "div",
      null,
      body,
      (0, import_react12.createElement)(
        "div",
        { className: "mo-verdicts" },
        (0, import_react12.createElement)(
          "div",
          { className: "mo-verdict mo-verdict-warn" },
          (0, import_react12.createElement)("span", { className: "mo-verdict-tag" }, "\u6CE8\u610F"),
          (0, import_react12.createElement)("span", null, costHint)
        )
      )
    ),
    foot: (0, import_react12.createElement)("div", { style: { display: "flex", gap: "var(--mo-s2)" } }, secondary, primary)
  });
}

// src/client/v9/panes/todo.ts
var import_react13 = require("react");
function TodoCenter(props) {
  const { phase, data, counts, sel, onSelect, goto, run, pending } = props;
  const [expanded, setExpanded] = (0, import_react13.useState)({});
  const PAGE = 6;
  if (phase === "loading") return Skeleton({ rows: 5, label: "\u8BFB\u53D6\u4E2D\uFF1A\u6B63\u5728\u53D6\u4E09\u6BB5\u53F0\u8D26" });
  if (phase === "error") {
    return ErrorBlock({
      title: "\u8BFB\u4E0D\u5230\u5F85\u529E",
      text: "\u72B6\u6001\u673A\u67E5\u8BE2\u5931\u8D25\u3002\u5DF2\u786E\u8BA4\u7684\u6761\u76EE\u4E0D\u4F1A\u4E22\u2014\u2014\u5E93\u6587\u4EF6\u8FD8\u5728\uFF0C\u91CD\u53D6\u5373\u6062\u590D\u3002",
      example: "\u70B9\u4E0B\u9762\u7684\u300C\u91CD\u8BD5\u300D\uFF1B\u4ECD\u5931\u8D25\u5C31\u53BB\u300C\u5E93\u5065\u5EB7\u300D\u770B\u5E93\u6839\u76EE\u5F55",
      onRetry: () => {
        data.reloadAll();
      }
    });
  }
  const sections = todoSectionsOf({ snapshot: data.snapshot.data, inbox: data.inbox.data, misses: data.misses.data });
  if (phase === "empty") {
    return EmptyBlock({
      title: "\u4E09\u6BB5\u90FD\u7A7A\u4E86",
      text: "\u6CA1\u6709\u5F85\u62CD\u677F\u3001\u6CA1\u6709\u6D41\u8F6C\u4E2D\u3001\u6CA1\u6709\u5F85\u8865\u5E93\u3002\u8FD9\u662F\u5E93\u5065\u5EB7\u7684\u6837\u5B50\uFF0C\u4E0D\u662F\u6545\u969C\u3002",
      hint: `\u5F85\u62CD\u677F 0 \xB7 \u6D41\u8F6C\u4E2D 0 \xB7 \u5F85\u8865\u5E93 0 \xB7 \u8BB0\u5FC6 ${num(counts.entries)} \u6761`,
      action: { label: "\u53BB\u770B\u8BB0\u5FC6", actName: "go-memory", act: () => {
        goto("memory");
      } }
    });
  }
  const renderSection = (section) => {
    const flowLines = section.rows.map((row) => row.lineIndex).filter((line) => typeof line === "number");
    const refillQueries = section.rows.map((row) => row.title);
    const fillableRows = section.id === "refill" ? section.rows.filter((row) => row.fillable === true) : section.rows;
    const observingRows = section.id === "refill" ? section.rows.filter((row) => row.fillable !== true) : [];
    const showAll = expanded[section.id] === true || section.rows.some((row) => row.key === sel);
    const base = showAll ? section.rows : fillableRows;
    const visible = base.slice(0, PAGE);
    const hidden = section.rows.length - visible.length;
    const hiddenObserving = showAll ? 0 : observingRows.filter((row) => !visible.includes(row)).length;
    return (0, import_react13.createElement)(
      "div",
      { key: section.id },
      SectionHead({ title: section.title, note: section.note }),
      section.rows.length === 0 ? (0, import_react13.createElement)("p", { className: "mo-state-hint", style: { paddingLeft: "var(--mo-s4)" } }, section.emptyText) : (0, import_react13.createElement)(
        "ul",
        { className: "mo-rows", role: "list" },
        visible.map((row) => Row({
          spec: {
            id: row.key,
            title: row.title,
            meta: row.meta,
            source: row.group,
            num: row.num,
            state: row.state,
            tone: row.tone,
            current: sel === row.key
          },
          onSelect
        }))
      ),
      hidden > 0 ? (0, import_react13.createElement)(
        "p",
        { className: "mo-check-line" },
        TextLink({
          children: hiddenObserving === hidden ? `\u53E6\u6709 ${num(hidden)} \u6761\u53EA\u95EE\u8FC7\u4E00\u4E24\u6B21 \xB7 \u5C55\u5F00` : `\u5C55\u5F00\u5269\u4E0B\u7684 ${num(hidden)} \u6761`,
          actName: "expand-section",
          onClick: () => {
            setExpanded((prev) => ({ ...prev, [section.id]: true }));
          }
        })
      ) : null,
      /* 段级批量动作：一次处理多条，不给每条都点一遍的机会成本。 */
      section.id === "flow" && flowLines.length > 1 ? (0, import_react13.createElement)(
        "p",
        { className: "mo-check-line" },
        TextLink({
          children: `\u628A\u8FD9\u6BB5 ${num(flowLines.length)} \u6761\u90FD\u6807\u5B8C\u6210`,
          actName: "batch-done",
          onClick: () => {
            run(async () => {
              await batchInboxState(flowLines, "done");
            }, `\u5DF2\u628A ${flowLines.length} \u6761\u6807\u4E3A\u5B8C\u6210`);
          }
        })
      ) : null,
      section.id === "refill" && refillQueries.length > 1 ? (0, import_react13.createElement)(
        "p",
        { className: "mo-check-line" },
        TextLink({
          children: `\u7ED9\u8FD9 ${num(refillQueries.length)} \u6761\u90FD\u5199\u8349\u7A3F`,
          actName: "batch-draft",
          onClick: () => {
            if (pending) return;
            run(async () => {
              await batchDraftMiss(refillQueries);
            }, `\u5DF2\u4E3A ${refillQueries.length} \u6761\u5404\u5199\u4E00\u4EFD\u8349\u7A3F`);
          }
        })
      ) : null
    );
  };
  return (0, import_react13.createElement)(
    "div",
    { className: "mo-pane-inner" },
    sections.map(renderSection)
  );
}
function selectedRow(props) {
  const sections = todoSectionsOf({ snapshot: props.data.snapshot.data, inbox: props.data.inbox.data, misses: props.data.misses.data });
  for (const section of sections) {
    const row = section.rows.find((item) => item.key === props.sel);
    if (row !== void 0) return { row, section };
  }
  return void 0;
}
function DecideInspector({ row, props }) {
  const { run, pending } = props;
  const [reason, setReason] = (0, import_react13.useState)("");
  const reject = () => {
    if (row.path === void 0) return;
    const path = row.path;
    run(async () => {
      await rejectEntry(path, reason);
    }, "\u5DF2\u9A73\u56DE \xB7 30 \u5929\u5185\u4E0D\u518D\u6CE8\u5165\uFF08\u53EF\u64A4\u9500\uFF09", {
      label: "\u64A4\u9500\u9A73\u56DE",
      run: () => undoReject(path)
    });
  };
  return InspectorFrame({
    title: row.title,
    sub: `${row.group} \xB7 ${row.state}`,
    body: (0, import_react13.createElement)(
      "div",
      null,
      Props({
        rows: [
          { label: "\u6765\u6E90", value: row.path ?? "\u2014" },
          { label: "\u7B49\u591A\u4E45", value: withUnit(row.num, "\u5929") },
          { label: "\u72B6\u6001", value: row.state }
        ]
      }),
      (0, import_react13.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u91C7\u7EB3\u540E\u8FDB\u5165\u68C0\u7D22\u4E0E\u7F6E\u9876\u901A\u9053\uFF1B\u9A73\u56DE\u843D\u6863 30 \u5929\u9759\u9ED8\u3002\u7CFB\u7EDF\u81EA\u52A8\u5347\u7EA7\u6700\u591A\u5230\u300C\u89C2\u5BDF\u5230\u300D\uFF0C\u4E0D\u4F1A\u66FF\u4F60\u786E\u8BA4\u3002"
      ),
      (0, import_react13.createElement)("p", { className: "mo-insp-label" }, "\u9A73\u56DE\u8981\u5199\u7406\u7531\uFF0830 \u5929\u5185\u4E0D\u518D\u6CE8\u5165\uFF09"),
      (0, import_react13.createElement)("textarea", {
        className: "mo-reason-input",
        "aria-label": "\u9A73\u56DE\u7406\u7531",
        placeholder: "\u4F8B\uFF1A\u8FD9\u6761\u53EA\u5BF9\u67D0\u4E2A\u5206\u652F\u6210\u7ACB\uFF0C\u4E0D\u8BE5\u8FDB\u4E2A\u4EBA\u57DF",
        value: reason,
        onChange: (event) => {
          setReason(event.target.value);
        }
      }),
      reason.trim() === "" ? (0, import_react13.createElement)("p", { className: "mo-check-line" }, "\u7406\u7531\u4E3A\u7A7A\u4E0D\u80FD\u9A73\u56DE") : null
    ),
    foot: (0, import_react13.createElement)(
      "div",
      { style: { display: "flex", gap: "var(--mo-s2)" } },
      BtnGhost({
        children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u9A73\u56DE",
        actName: "reject",
        disabled: pending || reason.trim() === "",
        onClick: reject
      }),
      BtnInk({
        children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u786E\u8BA4",
        actName: "confirm",
        disabled: pending,
        onClick: () => {
          if (row.path === void 0) return;
          const path = row.path;
          run(async () => {
            await confirmEntry(path);
          }, "\u5DF2\u786E\u8BA4 \xB7 \u8FD9\u6761\u4ECE\u6B64\u523B\u8D77\u53C2\u4E0E\u68C0\u7D22");
        }
      })
    )
  });
}
function FlowInspector({ row, props }) {
  const { run, pending } = props;
  const [content, setContent] = (0, import_react13.useState)(row.title);
  const lineIndex = row.lineIndex;
  const patch = (next, success) => {
    if (lineIndex === void 0) return;
    run(async () => {
      await patchInboxRow(lineIndex, next);
    }, success);
  };
  return InspectorFrame({
    title: clip(row.title, 48),
    sub: `${row.group} \xB7 ${row.state}`,
    body: (0, import_react13.createElement)(
      "div",
      null,
      Props({
        rows: [
          { label: "\u884C\u53F7", value: lineIndex === void 0 ? "\u2014" : String(lineIndex + 1) },
          { label: "\u7B49\u591A\u4E45", value: withUnit(row.num, "\u5929") },
          { label: "\u72B6\u6001", value: row.state }
        ]
      }),
      (0, import_react13.createElement)("p", { className: "mo-insp-label" }, "\u6539\u8FD9\u4E00\u884C\u7684\u5185\u5BB9"),
      (0, import_react13.createElement)("input", {
        className: "mo-title-input",
        "aria-label": "\u6539\u8FD9\u4E00\u884C\u7684\u5185\u5BB9",
        value: content,
        onChange: (event) => {
          setContent(event.target.value);
        }
      }),
      (0, import_react13.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u8D85\u8FC7 7 \u5929\u6CA1\u52A8\u7684\u6761\u76EE\u4F1A\u964D\u6743\uFF0C\u4F46\u4E0D\u4F1A\u88AB\u5220\u2014\u2014\u964D\u6743\u53EA\u5F71\u54CD\u68C0\u7D22\u6392\u5E8F\uFF0C\u4E0D\u5F71\u54CD\u5B83\u8FD8\u5728\u5E93\u91CC\u3002"
      ),
      (0, import_react13.createElement)(
        "p",
        { className: "mo-check-line" },
        TextLink({
          children: "\u5347\u7EA7\u6210\u8BB0\u5FC6\u6761\u76EE",
          actName: "promote-inbox",
          onClick: () => {
            if (lineIndex === void 0) return;
            run(
              async () => {
                await promoteInboxRow(lineIndex);
              },
              "\u5DF2\u5347\u7EA7\uFF1A\u8FD9\u6761\u6210\u4E3A\u53EF\u68C0\u7D22\u7684\u8BB0\u5FC6\uFF0CINBOX \u91CC\u4FDD\u7559\u539F\u884C"
            );
          }
        })
      )
    ),
    foot: (0, import_react13.createElement)(
      "div",
      { style: { display: "flex", gap: "var(--mo-s2)", flexWrap: "wrap" } },
      BtnGhost({
        children: "\u4FDD\u5B58\u5185\u5BB9",
        actName: "inbox-edit",
        disabled: pending || content.trim() === "" || content === row.title,
        onClick: () => {
          patch({ content: content.trim() }, "\u5DF2\u6539\u5185\u5BB9 \xB7 \u72B6\u6001\u4E0D\u53D8");
        }
      }),
      BtnGhost({
        children: "\u4E22\u6389",
        actName: "inbox-drop",
        disabled: pending,
        onClick: () => {
          patch({ state: "dropped" }, "\u5DF2\u4E22\u6389");
        }
      }),
      BtnInk({
        children: pending ? "\u5904\u7406\u4E2D\u2026" : "\u6807\u5B8C\u6210",
        actName: "inbox-done",
        disabled: pending,
        onClick: () => {
          patch({ state: "done" }, "\u5DF2\u5B8C\u6210 \xB7 \u8FD9\u4E00\u6761\u4ECE\u6D41\u8F6C\u91CC\u51FA\u53BB\u4E86");
        }
      })
    )
  });
}
function RefillInspector({ row, props }) {
  const { run, pending, data, goto } = props;
  const fillable = row.fillable === true;
  const threshold = data.misses.data?.fillThreshold ?? 3;
  const [content, setContent] = (0, import_react13.useState)("");
  const item = (data.misses.data?.pipeline["should-fill"] ?? []).concat(data.misses.data?.pipeline["observing"] ?? []).find((entry) => entry.query === row.title);
  const remaining = item?.remainingDays ?? null;
  const hits = item?.hits ?? 0;
  return InspectorFrame({
    title: `\u7F3A\uFF1A${clip(row.title, 40)}`,
    sub: `${row.group} \xB7 ${row.state}`,
    body: (0, import_react13.createElement)(
      "div",
      null,
      Props({
        rows: [
          { label: "\u88AB\u95EE", value: `${num(row.num)} \u6B21` },
          { label: "\u4F1A\u8BDD", value: `${num(item?.sessions ?? 0)} \u4E2A` },
          { label: "\u9608\u503C", value: `${num(threshold)} \u6B21\u8D77\u5EFA\u8BAE\u8865` },
          { label: "\u72B6\u6001", value: row.state },
          {
            label: "\u9A8C\u8BC1\u671F",
            value: remaining === null ? "\u672A\u8FDB\u5165\uFF08\u8349\u7A3F\u751F\u6210\u540E\u624D\u5F00\u59CB\u8BA1\u65F6\uFF09" : `\u8FD8\u5269 ${num(remaining)} \u5929 \xB7 \u547D\u4E2D ${num(hits)} \u6B21`
          }
        ]
      }),
      (0, import_react13.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u751F\u6210\u8349\u7A3F\u53EA\u4F1A\u8FDB INBOX\uFF0C\u843D\u6863\u4ECD\u9700\u4F60\u70B9\u5934\u3002\u5199\u5B8C\u540E 7 \u5929\u5185\u6709\u547D\u4E2D\u624D\u7B97\u9A8C\u8BC1\u901A\u8FC7\uFF1B\u4E00\u76F4\u6CA1\u4EBA\u518D\u95EE\uFF0C\u8FD9\u6761\u4F1A\u81EA\u5DF1\u6C89\u4E0B\u53BB\uFF0C\u4E0D\u5360\u8BB0\u5FC6\u3002"
      ),
      fillable ? null : (0, import_react13.createElement)(
        "div",
        { className: "mo-verdicts" },
        (0, import_react13.createElement)(
          "div",
          { className: "mo-verdict mo-verdict-warn" },
          (0, import_react13.createElement)("span", { className: "mo-verdict-tag" }, "\u672A\u8FBE\u7EBF"),
          (0, import_react13.createElement)("span", null, `\u8FD8\u6CA1\u6709\u5230\u8BE5\u8865\u7684\u65F6\u5019\uFF1A\u95EE\u6EE1 ${num(threshold)} \u6B21\u624D\u7B97\u5E38\u6001\u7F3A\u53E3\u3002\u8981\u8865\u4E5F\u53EF\u4EE5\uFF0C\u53EA\u662F\u5B83\u53EF\u80FD\u53EA\u7528\u5230\u4E00\u6B21\u3002`)
        )
      ),
      (0, import_react13.createElement)("p", { className: "mo-insp-label" }, "\u5DF2\u7ECF\u8865\u4E0A\u4E86\uFF1F\u628A\u5185\u5BB9\u5199\u5728\u8FD9\u91CC"),
      (0, import_react13.createElement)("textarea", {
        className: "mo-reason-input",
        "aria-label": "\u8865\u4E0A\u7684\u5185\u5BB9",
        placeholder: "\u4F8B\uFF1Agrep \u8BFB\u4E0D\u5230\u6587\u4EF6\u662F\u56E0\u4E3A\u8DEF\u5F84\u91CC\u6709\u4E2D\u6587\uFF0C\u6539\u7528 Get-Content -Encoding UTF8",
        value: content,
        onChange: (event) => {
          setContent(event.target.value);
        }
      }),
      (0, import_react13.createElement)(
        "p",
        { className: "mo-check-line" },
        TextLink({
          children: "\u8FD9\u6761\u4E0D\u662F\u95EE\u9898\uFF0C\u5220\u6389",
          actName: "miss-delete",
          onClick: () => {
            run(async () => {
              await deleteMiss(row.title);
            }, "\u5DF2\u5220\u6389\u8FD9\u6761\u672A\u547D\u4E2D\u8BB0\u5F55");
          }
        })
      )
    ),
    foot: (0, import_react13.createElement)(
      "div",
      { style: { display: "flex", gap: "var(--mo-s2)" } },
      BtnGhost({ children: "\u53BB\u770B\u8BB0\u5FC6", actName: "go-memory", onClick: () => {
        goto("memory");
      } }),
      BtnGhost({
        children: pending ? "\u751F\u6210\u4E2D\u2026" : "\u5199\u8349\u7A3F",
        actName: "draft-miss",
        disabled: pending,
        onClick: () => {
          run(async () => {
            await draftMiss(row.title);
          }, "\u8349\u7A3F\u5DF2\u5199\u8FDB INBOX \xB7 \u843D\u6863\u4ECD\u8981\u4F60\u70B9\u5934");
        }
      }),
      BtnInk({
        children: pending ? "\u63D0\u4EA4\u4E2D\u2026" : "\u786E\u8BA4\u5DF2\u8865",
        actName: "miss-confirm",
        disabled: pending || content.trim() === "",
        onClick: () => {
          run(async () => {
            await confirmMiss(row.title, content);
          }, "\u5DF2\u843D\u4E00\u6761\u8BB0\u5FC6\uFF0C\u5E76\u628A\u8FD9\u95EE\u9898\u6807\u4E3A\u5DF2\u9A8C\u8BC1");
        }
      })
    )
  });
}
function TodoInspector(props) {
  const found = selectedRow(props);
  if (found === void 0) {
    return InspectorFrame({
      title: "\u9009\u4E00\u6761\u5F85\u529E",
      sub: "\u5DE6\u8FB9\u70B9\u4E00\u884C\uFF0C\u8FD9\u91CC\u51FA\u52A8\u4F5C",
      body: (0, import_react13.createElement)(
        "p",
        { className: "mo-insp-text" },
        "\u5F85\u62CD\u677F\u7684\u6761\u76EE\u53EA\u6709\u4EBA\u80FD\u6539\u72B6\u6001\uFF1B\u7CFB\u7EDF\u81EA\u52A8\u5347\u7EA7\u6700\u591A\u5230\u300C\u89C2\u5BDF\u5230\u300D\uFF0C\u4E0D\u4F1A\u66FF\u4F60\u786E\u8BA4\u3002"
      )
    });
  }
  if (found.row.kind === "decide") return (0, import_react13.createElement)(DecideInspector, { key: found.row.key, row: found.row, props });
  if (found.row.kind === "flow") return (0, import_react13.createElement)(FlowInspector, { key: found.row.key, row: found.row, props });
  return (0, import_react13.createElement)(RefillInspector, { key: found.row.key, row: found.row, props });
}

// src/client/panel.ts
function PanelIcon({ size }) {
  return (0, import_react14.createElement)(MemoryIcon, { size: typeof size === "number" ? size : 18 });
}
var STATUS_LEFT = "\u4F30\u7B97\u53E3\u5F84\uFF1ACJK 1 \u5B57 \u2248 1 token\uFF0C\u5176\u4F59 4 \u5B57\u7B26 \u2248 1 token\uFF1B\u975E tokenizer \u7CBE\u786E\u503C\uFF0C\u4EC5\u7528\u4E8E\u76F8\u5BF9\u6BD4\u8F83";
function defaultKeyOf(pane, props) {
  const { counts, data } = props;
  if (pane === "today") {
    const clues = cluesOf({
      snapshot: data.snapshot.data,
      overview: data.overview.data,
      inbox: data.inbox.data,
      misses: data.misses.data
    });
    return clues[0]?.id ?? "";
  }
  if (pane === "todo") {
    const sections = todoSectionsOf({
      snapshot: data.snapshot.data,
      inbox: data.inbox.data,
      misses: data.misses.data
    });
    for (const section of sections) {
      if (section.rows.length > 0) return section.rows[0].key;
    }
    return "";
  }
  if (pane === "memory") {
    const rows = memoryRowsOf(data.snapshot.data, "content", "");
    return rows[0]?.id ?? "";
  }
  if (pane === "health") return "b:injected";
  void counts;
  return "";
}
function MemoryOpsPage(props) {
  const ctx = props.ctx;
  const data = useWorkbenchData(ctx);
  const [pane, setPane] = (0, import_react14.useState)("today");
  const [picked, setPicked] = (0, import_react14.useState)({
    today: "",
    capture: "",
    todo: "",
    memory: "",
    health: ""
  });
  const [draft, setDraft] = (0, import_react14.useState)("");
  const [notice, setNotice] = (0, import_react14.useState)(null);
  const [pending, setPending] = (0, import_react14.useState)(false);
  const [bandFolded, setBandFolded] = (0, import_react14.useState)(false);
  const [live, setLive] = (0, import_react14.useState)("");
  const liveTimer = (0, import_react14.useRef)(null);
  const paneRef = (0, import_react14.useRef)("today");
  (0, import_react14.useEffect)(() => {
    paneRef.current = pane;
  }, [pane]);
  (0, import_react14.useEffect)(() => () => {
    if (liveTimer.current !== null) window.clearTimeout(liveTimer.current);
  }, []);
  const requestedPane = usePaneRequest();
  (0, import_react14.useEffect)(() => {
    const next = consumePaneRequest();
    if (next === void 0) return;
    setPane(next);
    setNotice(null);
  }, [requestedPane]);
  const counts = countsOf({
    snapshot: data.snapshot.data,
    overview: data.overview.data,
    inbox: data.inbox.data,
    misses: data.misses.data
  });
  const isEmpty = (() => {
    if (pane === "today" || pane === "todo") return counts.urgent === 0;
    if (pane === "capture") return counts.capturedToday === 0;
    if (pane === "memory") return counts.entries === 0;
    return counts.catalog === 0 && counts.injected === 0;
  })();
  const phase = phaseOf(sourcesFor(pane, data), isEmpty);
  const selected = picked[pane] !== "" ? picked[pane] : defaultKeyOf(pane, { counts, data });
  const announce = (0, import_react14.useCallback)((text) => {
    if (liveTimer.current !== null) window.clearTimeout(liveTimer.current);
    setLive("");
    liveTimer.current = window.setTimeout(() => {
      setLive(text);
      liveTimer.current = null;
    }, 30);
  }, []);
  const busy = (0, import_react14.useRef)(false);
  const run = (0, import_react14.useCallback)((action, success, undo) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    void action().then(() => {
      if (success !== void 0) {
        const next = { ok: true, text: success };
        if (undo !== void 0) {
          next.undo = {
            label: undo.label,
            act: () => {
              if (busy.current) return;
              busy.current = true;
              setPending(true);
              void undo.run().then(() => {
                setNotice({ ok: true, text: "\u5DF2\u64A4\u9500" });
                announce("\u5DF2\u64A4\u9500");
                setPicked((prev) => ({ ...prev, [paneRef.current]: "" }));
                data.reloadAll();
              }).catch((error) => {
                setNotice({ ok: false, text: hintOf(error), kind: classify(error) });
              }).finally(() => {
                busy.current = false;
                setPending(false);
              });
            }
          };
        }
        setNotice(next);
        announce(success);
      }
      setPicked((prev) => ({ ...prev, [paneRef.current]: "" }));
      data.reloadAll();
    }).catch((error) => {
      const text = hintOf(error);
      setNotice({ ok: false, text, kind: classify(error) });
      announce(text);
    }).finally(() => {
      busy.current = false;
      setPending(false);
    });
  }, [data, announce]);
  const goto = (0, import_react14.useCallback)((next, key) => {
    setPane(next);
    setNotice(null);
    if (key !== void 0) setPicked((prev) => ({ ...prev, [next]: key }));
  }, []);
  const onSelect = (0, import_react14.useCallback)((key) => {
    setPicked((prev) => ({ ...prev, [pane]: key }));
    setNotice(null);
  }, [pane]);
  const paneProps = {
    data,
    phase,
    counts,
    sel: selected,
    onSelect,
    draft,
    onDraft: setDraft,
    run,
    pending,
    notice,
    goto
  };
  const lede = ledeFor(pane, phase, counts);
  let center;
  let inspector;
  if (pane === "capture") {
    center = (0, import_react14.createElement)(CaptureCenter, { ...paneProps });
    inspector = (0, import_react14.createElement)(CaptureInspector, { ...paneProps });
  } else if (pane === "todo") {
    center = (0, import_react14.createElement)(TodoCenter, { ...paneProps });
    inspector = (0, import_react14.createElement)(TodoInspector, { ...paneProps });
  } else if (pane === "memory") {
    center = (0, import_react14.createElement)(MemoryCenter, { ...paneProps });
    inspector = (0, import_react14.createElement)(MemoryInspector, { ...paneProps });
  } else if (pane === "health") {
    center = (0, import_react14.createElement)(HealthCenter, { ...paneProps });
    inspector = (0, import_react14.createElement)(HealthInspector, { ...paneProps });
  } else {
    center = (0, import_react14.createElement)(TodayCenter, { ...paneProps });
    inspector = (0, import_react14.createElement)(TodayInspector, { ...paneProps });
  }
  if (phase === "error") {
    inspector = InspectorFrame({
      title: "\u8BFB\u4E0D\u5230\u6570\u636E",
      sub: "state = error",
      body: (0, import_react14.createElement)(
        "div",
        null,
        (0, import_react14.createElement)(
          "p",
          { className: "mo-insp-text" },
          "\u8FD9\u4E00\u5C4F\u8BFB\u4E0D\u5230\uFF0C\u68C0\u89C6\u680F\u4E0D\u5C55\u793A\u7F13\u5B58\u5185\u5BB9\u2014\u2014\u907F\u514D\u7528\u65E7\u5185\u5BB9\u5192\u5145\u65B0\u4E8B\u5B9E\u3002\u4E2D\u680F\u6709\u539F\u56E0\u4E0E\u4E0B\u4E00\u6B65\u3002"
        ),
        (0, import_react14.createElement)(
          "p",
          { className: "mo-check-line" },
          "\u5DE6\u8F68\u8BA1\u6570\u4E0E\u9876\u6761\u8BFB\u6570\u540C\u6837\u662F\u300C\u2014\u300D\uFF1A\u8BFB\u4E0D\u5230\u4E0D\u7B49\u4E8E 0\uFF0C\u7A7A\u4E5F\u4E0D\u7B49\u4E8E 0\u3002"
        )
      ),
      foot: BtnGhost({ children: "\u91CD\u8BD5", actName: "retry", onClick: () => {
        data.reloadAll();
      } }),
      phase
    });
  } else if (phase === "loading") {
    inspector = InspectorFrame({
      title: "\u8BFB\u53D6\u4E2D",
      sub: "\u6B63\u5728\u53D6\u8FD9\u4E00\u9875",
      body: Skeleton({ rows: 3, label: "\u8BFB\u53D6\u4E2D\uFF1A\u68C0\u89C6\u680F\u5185\u5BB9\u968F\u9009\u4E2D\u9879\u66FF\u6362" }),
      phase
    });
  } else if (phase === "empty") {
    inspector = InspectorFrame({
      title: "\u6CA1\u6709\u53EF\u9009\u7684\u6761\u76EE",
      sub: "state = empty\uFF08\u4E0D\u662F error\uFF09",
      body: (0, import_react14.createElement)(
        "div",
        null,
        (0, import_react14.createElement)(
          "p",
          { className: "mo-insp-text" },
          "\u7A7A\u6001\u4E0B\u6CA1\u6709\u6761\u76EE\u53EF\u9009\u3002\u7528\u4E2D\u680F\u7ED9\u7684\u51FA\u53E3\u7EE7\u7EED\uFF0C\u522B\u5728\u8FD9\u91CC\u627E\u4E0D\u5B58\u5728\u7684\u8BE6\u60C5\u3002"
        ),
        (0, import_react14.createElement)(
          "p",
          { className: "mo-check-line" },
          "\u7A7A \u2260 \u8BFB\u4E0D\u5230\uFF1A\u8FD9\u91CC\u7684 0 \u662F\u6570\u51FA\u6765\u7684 0\uFF0C\u9876\u6761\u4E0E\u5DE6\u8F68\u90FD\u663E\u793A 0\u3002"
        )
      ),
      phase
    });
  }
  const unit = (() => {
    if (pane === "capture") return "\u6761\u4ECA\u5929\u5DF2\u8BB0";
    if (pane === "todo") return "\u4EF6\u538B\u7740";
    if (pane === "memory") return "\u6761\u8BB0\u5FC6";
    if (pane === "health") return "tokens / \u8BF7\u6C42";
    return "\u4EF6\u8981\u52A8\u624B";
  })();
  return (0, import_react14.createElement)(Stage, {
    pane,
    phase,
    counts,
    lede,
    figure: figureFor(pane, phase, counts),
    unit,
    bandNote: bandNoteFor(pane, phase, counts),
    bandFigure: bandFigureFor(phase, counts),
    bandFolded,
    onToggleBand: () => {
      setBandFolded((value) => !value);
    },
    onGoto: (next) => {
      goto(next);
    },
    center,
    inspector,
    notice,
    statusLeft: STATUS_LEFT,
    statusRight: statusRightOf({ snapshot: data.snapshot.data, overview: data.overview.data, phase }),
    live
  });
}

// src/client/session-view.ts
var import_react15 = require("react");
function SessionMemoryView(props) {
  const onGotoMisses = typeof props.onGotoMisses === "function" ? props.onGotoMisses : void 0;
  const ctx = props.ctx;
  const sessionId = typeof props.sessionId === "string" ? props.sessionId : void 0;
  const { cwd, project } = useSessionProject(ctx);
  const [busy, setBusy] = (0, import_react15.useState)(false);
  const [toast, setToast] = (0, import_react15.useState)(null);
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
  if (phase === "loading") return (0, import_react15.createElement)(Skeleton2, { rows: 2, height: 60 });
  if (phase === "error") return (0, import_react15.createElement)(ErrorState, { message: `\u8BFB\u53D6\u4F1A\u8BDD\u8BB0\u5FC6\u5931\u8D25\uFF1A${orEmpty(error)}`, onRetry: reload });
  if (data === void 0) return (0, import_react15.createElement)(Skeleton2, { rows: 1 });
  const resolution = data.resolution;
  const unknownProject = resolution !== null && resolution.project === null;
  const noCwd = resolution === null && data.project === null;
  return (0, import_react15.createElement)(
    "div",
    { className: "dmo-session" },
    /**
     * 项目归属必须写在顶上。
     *
     * 早先这一栏没有项目信息，用户看到一个空 tab 时完全不知道
     * 「是没注入」还是「是没认出项目」——两种情况的下一步动作完全不同。
     */
    (0, import_react15.createElement)(
      "div",
      { className: "dmo-row-sub", style: { marginBottom: 6 } },
      data.project === null ? "\u9879\u76EE\uFF1A\u672A\u89E3\u6790" : `\u9879\u76EE\uFF1A${data.project}`,
      resolution?.matchedBy === "alias" ? ` \xB7 \u7531\u522B\u540D ${orEmpty(resolution.matchedAlias)} \u63A8\u65AD` : resolution?.matchedBy === "name" ? " \xB7 \u76EE\u5F55\u540D\u4E0E\u9879\u76EE\u540C\u540D" : "",
      resolution?.matchedBy === "prefix" ? ` \xB7 \u7531\u524D\u7F00 ${orEmpty(resolution.matchedAlias)} \u63A8\u65AD` : ""
    ),
    (0, import_react15.createElement)(
      "div",
      { className: "dmo-session-kpis" },
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react15.createElement)("b", null, count(data.injected)),
        (0, import_react15.createElement)("span", null, "\u672C\u6B21\u7528\u5230")
      ),
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react15.createElement)("b", null, count(data.cited)),
        (0, import_react15.createElement)("span", null, "\u5F15\u7528")
      ),
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-session-kpi" },
        (0, import_react15.createElement)("b", null, count(data.missed)),
        (0, import_react15.createElement)("span", null, "\u672A\u547D\u4E2D")
      )
    ),
    unknownProject ? (0, import_react15.createElement)(
      "div",
      { className: "dmo-degrade" },
      `\u6CA1\u80FD\u4ECE\u5F53\u524D\u76EE\u5F55\u8BA4\u51FA\u9879\u76EE\uFF1A${orEmpty(resolution.reason)}`,
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-row-sub" },
        `\u5F53\u524D\u76EE\u5F55\uFF1A${orEmpty(resolution.cwd)}`,
        resolution.knownProjects.length === 0 ? "" : ` \xB7 \u5DF2\u77E5\u9879\u76EE\uFF1A${resolution.knownProjects.join(" / ")}`
      )
    ) : noCwd ? (0, import_react15.createElement)(
      "div",
      { className: "dmo-degrade" },
      "\u6CA1\u62FF\u5230\u5F53\u524D\u76EE\u5F55\uFF0C\u65E0\u6CD5\u5224\u5B9A\u9879\u76EE\uFF08\u8FD9\u4E0D\u4F1A\u5F71\u54CD\u4EFB\u52A1\uFF0C\u53EA\u662F\u8FD9\u4E00\u680F\u6CA1\u6CD5\u6309\u9879\u76EE\u8FC7\u6EE4\uFF09\u3002"
    ) : null,
    toast === null ? null : (0, import_react15.createElement)("div", {
      className: `dmo-toast ${toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
      role: "status"
    }, toast.text),
    // 为什么注入
    (0, import_react15.createElement)("div", { className: "dmo-lane-head" }, "\u4E3A\u4EC0\u4E48\u6CE8\u5165"),
    data.reasons.length === 0 ? (0, import_react15.createElement)(
      "div",
      { className: "dmo-note" },
      data.recalled === 0 ? "\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u68C0\u7D22\u8BB0\u5F55\u3002\u8BB0\u5FC6\u53EA\u5728\u88AB\u68C0\u7D22\u65F6\u624D\u6CE8\u5165\u2014\u2014\u8FD9\u662F\u6210\u672C\u8BBE\u8BA1\uFF0C\u4E0D\u662F\u7F3A\u9677\u3002" : `\u672C\u4F1A\u8BDD\u6709 ${count(data.recalled)} \u6B21\u68C0\u7D22\uFF0C\u4F46\u4E8B\u4EF6\u91CC\u6CA1\u6709\u53EF\u56DE\u6307\u7684\u6761\u76EE id\uFF08\u53EF\u80FD\u662F\u65E7\u7248\u672C\u5199\u5165\u7684\u8BB0\u5F55\uFF09\u3002`
    ) : data.reasons.map((reason) => (0, import_react15.createElement)(
      "div",
      { key: reason.id, className: "dmo-card" },
      (0, import_react15.createElement)("div", { className: "dmo-card-title" }, truncate(reason.title, 46)),
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-card-meta" },
        (0, import_react15.createElement)(Badge, { tone: "brand" }, reason.why),
        (0, import_react15.createElement)("span", null, `${count(reason.tokens)} tokens`),
        reason.at === "" ? null : (0, import_react15.createElement)("span", null, orEmpty(reason.at.slice(0, 19).replace("T", " "))),
        reason.anchor === null ? null : (0, import_react15.createElement)(
          AnchorNote,
          { state: reason.anchorState === "stale" ? "stale" : "fresh" },
          reason.anchorState === "stale" ? "\u951A\u70B9\u5931\u6548" : "\u951A\u70B9\u6709\u6548",
          (0, import_react15.createElement)(
            "div",
            { className: "dmo-row-sub" },
            `${orEmpty(reason.anchor.path)}${reason.anchor.symbol === void 0 ? "" : ` \xB7 ${reason.anchor.symbol}`}`,
            reason.anchor.hash === void 0 ? "" : ` \xB7 hash ${reason.anchor.hash.slice(0, 8)}`
          )
        )
      )
    )),
    // 未命中转草稿
    (0, import_react15.createElement)("div", { className: "dmo-lane-head", style: { marginTop: 4 } }, "\u672A\u547D\u4E2D"),
    data.recentMisses.length === 0 ? (0, import_react15.createElement)("div", { className: "dmo-note" }, "\u672C\u4F1A\u8BDD\u6CA1\u6709\u672A\u547D\u4E2D\u3002") : data.recentMisses.map((miss, index) => (0, import_react15.createElement)(
      "div",
      {
        key: `${miss.at}-${index}`,
        className: "dmo-row-item"
      },
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-row-main" },
        (0, import_react15.createElement)("div", { className: "dmo-row-text" }, truncate(miss.query ?? "", 40)),
        (0, import_react15.createElement)("div", { className: "dmo-row-sub" }, orEmpty(miss.at.slice(0, 19).replace("T", " ")))
      ),
      (0, import_react15.createElement)(Button, {
        small: true,
        disabled: busy,
        onClick: () => {
          draftFromMiss(miss.query ?? "");
        }
      }, "\u8F6C\u8349\u7A3F")
    )),
    data.recentMisses.length === 0 ? null : (0, import_react15.createElement)(
      "div",
      { className: "dmo-anchor-note", "data-state": "stale" },
      (0, import_react15.createElement)("span", null, "\u8FD9\u4E9B\u68C0\u7D22\u843D\u7A7A\u4E86"),
      (0, import_react15.createElement)(
        "div",
        { className: "dmo-row-sub" },
        "\u540C\u4E00\u4E2A\u95EE\u9898\u6EE1 3 \u6B21\u4F1A\u81EA\u52A8\u8FDB\u300C\u8BE5\u8865\u4E86\u300D\uFF0C\u4E5F\u53EF\u4EE5\u73B0\u5728\u5C31\u8865\u3002"
      )
    ),
    (0, import_react15.createElement)(
      "div",
      { className: "dmo-hrow", style: { marginTop: 4 } },
      (0, import_react15.createElement)(Button, { small: true, onClick: reload }, "\u5237\u65B0"),
      (0, import_react15.createElement)(Button, { small: true, onClick: () => {
        goMisses(true);
      } }, "\u53BB\u672A\u547D\u4E2D\u5DE5\u4F5C\u53F0")
    )
  );
}

// src/client/capture-tab.ts
var import_react16 = require("react");
var CAPTURE_KIND = "memory-ops";
var KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
function CapturePane() {
  const [text, setText] = (0, import_react16.useState)("");
  const [kind, setKind] = (0, import_react16.useState)("\u60F3\u6CD5");
  const [busy, setBusy] = (0, import_react16.useState)(false);
  const [result, setResult] = (0, import_react16.useState)(null);
  const [undo, setUndo] = (0, import_react16.useState)(null);
  const [recent, setRecent] = (0, import_react16.useState)([]);
  (0, import_react16.useEffect)(() => {
    void call("inbox", { domain: "personal" }).then((list) => {
      setRecent([...list.entries].reverse().slice(0, 5).map((entry) => ({
        content: entry.content,
        kind: entry.kind,
        at: entry.date
      })));
    }).catch(() => {
    });
  }, []);
  const [seconds, setSeconds] = (0, import_react16.useState)(0);
  (0, import_react16.useEffect)(() => {
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
  return (0, import_react16.createElement)(
    "div",
    { className: "dmo-capture" },
    // 类型药丸：比下拉少一次点击，且五个类型常驻可见
    (0, import_react16.createElement)(
      "div",
      { className: "dmo-types", role: "group", "aria-label": "\u8BB0\u5F55\u7C7B\u578B" },
      KINDS.map((item) => (0, import_react16.createElement)(Chip, {
        key: item,
        label: item,
        active: kind === item,
        onClick: () => {
          setKind(item);
        }
      }))
    ),
    (0, import_react16.createElement)("textarea", {
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
    (0, import_react16.createElement)(
      "div",
      { className: "dmo-capture-hint" },
      "\u2318/Ctrl + Enter \u5B58\u5165 \xB7 \u591A\u884C\u4F1A\u9010\u6761\u62C6\u5F00 \xB7 30 \u79D2\u5185\u53EF\u64A4\u9500"
    ),
    (0, import_react16.createElement)(
      "div",
      { className: "dmo-capture-foot" },
      (0, import_react16.createElement)(Button, {
        variant: "primary",
        disabled: busy || text.trim() === "",
        onClick: submit
      }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u8BB0\u4E00\u6761"),
      undo === null ? (0, import_react16.createElement)(
        "span",
        { className: "dmo-row-sub", style: { marginTop: 0 } },
        `${count(text.length)} \u5B57`
      ) : (0, import_react16.createElement)(Button, { small: true, disabled: busy, onClick: undoLast }, `\u64A4\u9500 ${seconds}s`)
    ),
    // 结果反馈：隐私拦截必须解释清楚「为什么拒」，并给脱敏后的可用文本
    result === null ? null : result.ok ? (0, import_react16.createElement)(
      "div",
      { className: "dmo-toast dmo-toast-ok", role: "status" },
      `\u5DF2\u5B58\u5165 ${orEmpty(result.captured?.path)}`
    ) : (0, import_react16.createElement)(
      "div",
      { className: "dmo-toast dmo-toast-err", role: "alert" },
      (0, import_react16.createElement)("div", null, orEmpty(result.reason)),
      result.blocked === true && result.masked !== void 0 ? (0, import_react16.createElement)(
        "div",
        { style: { marginTop: 6 } },
        (0, import_react16.createElement)("div", { className: "dmo-label" }, "\u8131\u654F\u540E\u53EF\u7528\uFF1A"),
        (0, import_react16.createElement)("div", { style: { wordBreak: "break-all" } }, truncate(result.masked, 120)),
        (0, import_react16.createElement)(
          "div",
          { style: { marginTop: 6 } },
          (0, import_react16.createElement)(Button, {
            small: true,
            onClick: () => {
              setText(result.masked ?? "");
            }
          }, "\u586B\u5165\u8131\u654F\u6587\u672C")
        )
      ) : null
    ),
    recent.length === 0 ? null : (0, import_react16.createElement)(
      "div",
      { style: { marginTop: 10 } },
      (0, import_react16.createElement)(
        "div",
        { className: "dmo-group-head" },
        (0, import_react16.createElement)("h3", { className: "dmo-group-title" }, "\u521A\u521A\u6355\u83B7"),
        (0, import_react16.createElement)("span", { className: "dmo-group-count" }, `${recent.length} \u6761`)
      ),
      recent.map((item, index) => (0, import_react16.createElement)(
        "div",
        { key: `${item.at}-${index}`, className: "dmo-recent-row" },
        (0, import_react16.createElement)("span", { className: "dmo-recent-main" }, truncate(item.content, 42)),
        (0, import_react16.createElement)("span", { className: "dmo-recent-time" }, `${item.kind} \xB7 ${item.at.slice(5)}`)
      ))
    ),
    (0, import_react16.createElement)(
      "div",
      { className: "dmo-note" },
      "\u6355\u83B7\u524D\u8FC7\u9690\u79C1\u95F8\u95E8\uFF1A\u5BC6\u94A5 / \u79C1\u94A5 / \u8EAB\u4EFD\u8BC1 / \u5185\u7F51 IP \u4F1A\u88AB\u62D2\u5199\u5E76\u7559\u5BA1\u8BA1\u3002"
    ),
    (0, import_react16.createElement)(
      "div",
      { className: "dmo-card-meta" },
      (0, import_react16.createElement)(Badge, { tone: "idle" }, "INBOX \u4E94\u5217"),
      (0, import_react16.createElement)(Badge, { tone: "idle" }, "\u539F\u5B50\u5199")
    )
  );
}

// src/client/remember.ts
var import_react17 = require("react");
var import_react_dom = require("react-dom");

// src/client/remember-logic.ts
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
  const [text, setText] = (0, import_react17.useState)("");
  const [kind, setKind] = (0, import_react17.useState)("\u60F3\u6CD5");
  const [busy, setBusy] = (0, import_react17.useState)(false);
  const [error, setError] = (0, import_react17.useState)(null);
  const [blocked, setBlocked] = (0, import_react17.useState)(null);
  const inputRef = (0, import_react17.useRef)(null);
  const sessionId = typeof props.sessionId === "string" ? props.sessionId : "default";
  (0, import_react17.useEffect)(() => {
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
  (0, import_react17.useEffect)(() => {
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
    return (0, import_react_dom.createPortal)((0, import_react17.createElement)(
      "div",
      {
        className: `dmo-remember-toast ${state2.toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
        role: "status",
        "aria-live": "polite"
      },
      (0, import_react17.createElement)("span", null, state2.toast.text),
      state2.toast.savedContent === void 0 ? null : (0, import_react17.createElement)("button", {
        type: "button",
        className: "dmo-remember-undo",
        disabled: busy,
        onClick: undo
      }, "\u64A4\u9500"),
      (0, import_react17.createElement)("button", {
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
  const foot = (0, import_react17.createElement)(
    "div",
    { className: "dmo-remember-foot" },
    (0, import_react17.createElement)(
      "span",
      { className: "dmo-row-sub", style: { marginTop: 0 } },
      "\u5B58\u5165\u540E\u53EF\u5728\u6D6E\u5C42\u91CC 30 \u79D2\u5185\u64A4\u9500"
    ),
    (0, import_react17.createElement)(
      "div",
      { className: "dmo-hrow", style: { flex: "0 0 auto" } },
      (0, import_react17.createElement)(Button, { onClick: close }, "\u53D6\u6D88"),
      (0, import_react17.createElement)(Button, {
        variant: "primary",
        disabled: busy || text.trim() === "",
        onClick: submit
      }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u4E00\u6761")
    )
  );
  const blockedBlock = blocked === null ? null : (0, import_react17.createElement)(
    "div",
    { className: "dmo-toast dmo-toast-err", role: "alert" },
    (0, import_react17.createElement)("div", null, blocked.reason),
    (0, import_react17.createElement)("div", { className: "dmo-label", style: { marginTop: 6 } }, "\u8131\u654F\u540E\u53EF\u7528\uFF1A"),
    (0, import_react17.createElement)("div", { style: { wordBreak: "break-all" } }, truncate(blocked.masked, 120)),
    (0, import_react17.createElement)(
      "div",
      { style: { marginTop: 6 } },
      (0, import_react17.createElement)(Button, {
        small: true,
        onClick: () => {
          setText(blocked.masked);
          setBlocked(null);
        }
      }, "\u586B\u5165\u8131\u654F\u6587\u672C")
    )
  );
  const body = (0, import_react17.createElement)(
    "div",
    { className: "dmo-remember-body" },
    (0, import_react17.createElement)(
      "div",
      { className: "dmo-hrow" },
      (0, import_react17.createElement)("select", {
        className: "dmo-select",
        value: kind,
        "aria-label": "\u8BB0\u5F55\u7C7B\u578B",
        onChange: (event) => {
          setKind(event.target.value);
        }
      }, KINDS2.map((item) => (0, import_react17.createElement)("option", { key: item, value: item }, item)))
    ),
    (0, import_react17.createElement)("textarea", {
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
    error === null ? null : (0, import_react17.createElement)("div", { className: "dmo-toast dmo-toast-err", role: "alert" }, error),
    foot
  );
  const card = (0, import_react17.createElement)(
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
    (0, import_react17.createElement)(
      "div",
      { className: "dmo-remember-head" },
      (0, import_react17.createElement)("span", { className: "dmo-remember-title" }, "\u5B58\u8FDB\u8BB0\u5FC6\u5E93"),
      (0, import_react17.createElement)("button", {
        type: "button",
        className: "dmo-remember-close",
        "aria-label": "\u5173\u95ED",
        onClick: close
      }, "\xD7")
    ),
    body
  );
  const backdrop = (0, import_react17.createElement)("div", {
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
  }, CapturePane))));
  disposers.push(safe("sidebar.right.pane.tab.title", () => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
    name: "sidebar.right.pane.tab.title",
    key: PANEL_ID
  }, () => (0, import_react18.createElement)("span", null, "\u5FEB\u901F\u6355\u83B7")))));
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

// src/client/v9/styles-base.ts
var BASE_CSS = `
.mo-app {
  /* \u7248\u5F0F\u6863\u4F4D\uFF08brief \xA7\u4E09 / \xA7\u56DB\uFF09 */
  --mo-t0: 44px; --mo-t0-lh: 48px;
  --mo-t1: 28px; --mo-t1-lh: 36px;
  --mo-t2: 18px; --mo-t2-lh: 26px;
  --mo-t3: 14px; --mo-t3-lh: 22px;
  --mo-t3-lh-loose: 24px;
  --mo-t4: 12px; --mo-t4-lh: 18px;

  --mo-s1: 4px; --mo-s2: 8px; --mo-s3: 12px;
  --mo-s4: 16px; --mo-s5: 24px; --mo-s6: 32px;

  --mo-r-flat: 0;
  --mo-r-control: 6px;
  --mo-r-overlay: 10px;

  --mo-w-rail: 212px;
  --mo-w-insp: 360px;
  --mo-h-topbar: 72px;
  --mo-h-status: 28px;
  --mo-h-band: 72px;
  --mo-h-band-folded: 28px;
  --mo-w-prose: 720px;

  --mo-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --mo-ease: cubic-bezier(0.2, 0, 0, 1);
  --mo-dur-state: 120ms;
  --mo-dur-insp: 180ms;

  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: var(--mo-h-topbar) minmax(0, 1fr) var(--mo-h-status);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  -webkit-font-smoothing: antialiased;
  line-break: strict;
  overflow: hidden;
}
.mo-app *,
.mo-app *::before,
.mo-app *::after { box-sizing: border-box; }
/*
 * \u63A7\u4EF6\u7EE7\u627F\u5B57\u8272 \u2014\u2014 \u7528 :where() \u628A\u7279\u5F02\u6027\u538B\u5230 0\u3002
 *
 * \u65E9\u5148\u5199\u6210 ".mo-app button { color: inherit }"\uFF08\u7279\u5F02\u6027 0,1,1\uFF09\uFF0C
 * \u5B83\u538B\u8FC7\u4E86\u540E\u9762 .mo-btn-ink \u7684 color\uFF080,1,0\uFF09\uFF0C\u7ED3\u679C\u58A8\u5757\u6309\u94AE\u53D8\u6210
 * \u300C\u9ED1\u5E95\u9ED1\u5B57\u300D\u2014\u2014\u6309\u94AE\u5728\u90A3\u513F\uFF0C\u5B57\u770B\u4E0D\u89C1\u3002\u622A\u56FE\u624D\u53D1\u73B0\u7684\u3002
 *
 * \u26A0\uFE0F \u8FD9\u6BB5\u6CE8\u91CA\u91CC\u4E0D\u8BB8\u51FA\u73B0\u53CD\u5F15\u53F7\uFF1A\u672C\u6587\u4EF6\u6574\u4F53\u662F\u6A21\u677F\u5B57\u7B26\u4E32\uFF0C\u4E00\u4E2A\u53CD\u5F15\u53F7
 * \u4F1A\u628A\u5B57\u7B26\u4E32\u63D0\u524D\u95ED\u5408\uFF0C\u540E\u9762\u7684 CSS \u5168\u53D8\u6210\u4EE3\u7801\u3002
 */
.mo-app :where(button, input, textarea, select) { font: inherit; color: inherit; }

.mo-num {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ---------- \u9876\u6761\uFF0872\uFF09\uFF1A\u54C1\u724C + \u5206\u533A\u540D | \u5224\u5B9A\u53E5 | T0 \u8BFB\u6570 + \u5355\u4F4D ---------- */
.mo-topbar {
  display: grid;
  grid-template-columns: var(--mo-w-rail) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s5);
  padding: 0 var(--mo-s5);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.mo-brand { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mo-brand-name {
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  font-weight: 600;
  letter-spacing: 0;
}
.mo-brand-scope {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-lede {
  margin: 0;
  min-width: 0;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mo-readout { display: flex; align-items: baseline; gap: var(--mo-s2); }
.mo-t0 {
  font-size: var(--mo-t0);
  line-height: var(--mo-t0-lh);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
}
.mo-unit {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

/* ---------- \u5DE5\u4F5C\u533A\u4E09\u680F\uFF1A212 / 1fr / 360\uFF0C\u5217\u95F4\u8DDD 24 ---------- */
.mo-workarea {
  display: grid;
  grid-template-columns: var(--mo-w-rail) minmax(0, 1fr) var(--mo-w-insp);
  column-gap: var(--mo-s5);
  padding: 0 var(--mo-s5);
  min-height: 0;
}

/* ---------- \u5DE6\u8F68\uFF1Atablist + \u8BA1\u6570 ---------- */
.mo-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);
  border-right: 1px solid var(--dsw-alias-border-l3);
  padding: var(--mo-s4) 0 var(--mo-s3);
}
.mo-rail-list { list-style: none; margin: 0; padding: 0; }
.mo-tab {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--mo-s4);
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), color var(--mo-dur-state) var(--mo-ease);
}
.mo-tab-idx {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-tertiary);
}
.mo-tab-label { font-size: var(--mo-t3); }
.mo-tab-count {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.mo-tab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.mo-tab[aria-selected="true"]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--dsw-alias-state-business-primary);
}
.mo-tab[aria-selected="true"] .mo-tab-idx { color: var(--dsw-alias-label-secondary); }

/* ---------- \u4E2D\u680F\uFF1A\u4E0A\u5E26\u300C\u6BCF\u8BF7\u6C42\u90FD\u5728\u300D+ \u56DE\u6267\u6761 + \u6E05\u5355 ---------- */
.mo-center {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.mo-center:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -1px;
}
.mo-band {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: var(--mo-s3);
  height: var(--mo-h-band);
  padding: 0 var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.mo-band::before {
  content: "";
  position: absolute;
  left: 0;
  top: var(--mo-s3);
  bottom: var(--mo-s3);
  width: 2px;
  background: var(--dsw-alias-state-business-primary);
}
.mo-band[data-folded="true"] { height: var(--mo-h-band-folded); }
.mo-band[data-folded="true"] .mo-band-note,
.mo-band[data-folded="true"] .mo-band-figure-unit { display: none; }
.mo-band-tag {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.mo-band-note {
  min-width: 0;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-band-figure { display: flex; align-items: baseline; gap: var(--mo-s1); }
.mo-band-figure .mo-value {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--mo-t2);
  line-height: var(--mo-t2-lh);
  font-weight: 600;
}
.mo-band-figure-unit {
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
}
.mo-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--mo-s4) 0;
}
/* \u5199\u64CD\u4F5C\u56DE\u6267\uFF1A\u4EFB\u4F55\u5206\u533A\u7684\u56DE\u6267\u90FD\u843D\u5728\u540C\u4E00\u6761\u5E26\u4E0A\uFF0C\u64A4\u9500\u6309\u94AE\u4E0D\u4F1A\u56E0\u4E3A\u6362\u4E86\u5206\u533A\u5C31\u6D88\u5931\u3002 */
.mo-notice-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  padding: var(--mo-s2) var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-notice-bar[data-tone="err"] { border-bottom-color: var(--dsw-alias-state-error-primary); }
.mo-pane-inner { padding-right: var(--mo-s4); }

/* ---------- \u6E05\u5355\u884C\uFF1A\u6807\u9898 / \u5F52\u5C5E / \u6570\u5B57 / \u72B6\u6001 + \u5143\u4FE1\u606F\u72EC\u7ACB\u884C ---------- */
.mo-rows { list-style: none; margin: 0; padding: 0; }
.mo-row-item { margin: 0; }
.mo-row-button {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px 96px 88px;
  grid-template-areas:
    "title src num state"
    "meta  meta meta meta";
  align-items: baseline;
  column-gap: var(--mo-s4);
  row-gap: 2px;
  width: 100%;
  min-height: 44px;
  padding: var(--mo-s2) var(--mo-s3) var(--mo-s2) var(--mo-s4);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease);
}
.mo-row-button[aria-current="true"] { background: var(--dsw-alias-card-fill-hover); }
.mo-row-title {
  grid-area: title;
  max-width: var(--mo-w-prose);
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  color: var(--dsw-alias-label-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.mo-row-title[data-dense="true"] { -webkit-line-clamp: 1; }
.mo-row-col {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-row-col-src { grid-area: src; }
.mo-row-col-num {
  grid-area: num;
  text-align: right;
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
}
.mo-row-col-state { grid-area: state; }
.mo-row-meta {
  grid-area: meta;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u72B6\u6001\u523B\u5EA6\uFF1A2px \u6EE1\u884C\u9AD8\uFF0C\u6587\u5B57\u72B6\u6001\u8BCD\u540C\u65F6\u5B58\u5728\uFF08\u4E0D\u53EA\u9760\u989C\u8272\uFF09 */
.mo-tonebar {
  position: absolute;
  left: 0;
  top: var(--mo-s2);
  bottom: var(--mo-s2);
  width: 2px;
}
.mo-tonebar-inline {
  display: inline-block;
  width: 2px;
  height: 10px;
  margin-right: var(--mo-s1);
  vertical-align: -1px;
}
.mo-tone-ok { background: var(--dsw-alias-state-success-primary); }
.mo-tone-warn { background: var(--dsw-alias-state-warn-primary); }
.mo-tone-err { background: var(--dsw-alias-state-error-primary); }
.mo-tone-idle { background: var(--dsw-alias-state-idle-primary); }

/* ---------- \u8868\u5934 ---------- */
.mo-table-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px 96px 88px;
  column-gap: var(--mo-s4);
  padding: var(--mo-s2) var(--mo-s3) var(--mo-s2) var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
}
.mo-table-head .mo-is-num { text-align: right; }

/* ---------- \u6BB5\u843D\u6807\u9898 ---------- */
.mo-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mo-s3);
  margin: var(--mo-s4) 0 var(--mo-s1);
  padding-right: var(--mo-s4);
}
.mo-section-head:first-child { margin-top: 0; }
.mo-section-title {
  margin: 0;
  font-size: var(--mo-t2);
  line-height: var(--mo-t2-lh);
  font-weight: 600;
}
.mo-section-note {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- \u6309\u94AE\uFF08\u5706\u89D2 6\uFF1B\u4E3B\u64CD\u4F5C\u58A8\u5757\uFF09 ---------- */
.mo-btn,
.mo-btn-ink,
.mo-btn-ghost,
.mo-remember-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  min-height: 32px;
  padding: 0 var(--mo-s4);
  border-radius: var(--mo-r-control);
  border: 1px solid transparent;
  font: inherit;
  font-size: var(--mo-t3);
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), filter var(--mo-dur-state) var(--mo-ease), opacity var(--mo-dur-state) var(--mo-ease);
}
.mo-btn { background: none; color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.mo-btn-ink { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-base); }
.mo-btn-ghost { background: none; color: var(--dsw-alias-label-secondary); border-color: var(--dsw-alias-border-l3); }
.mo-btn[disabled],
.mo-btn-ink[disabled],
.mo-btn-ghost[disabled] { opacity: 0.45; cursor: not-allowed; }
.mo-textlink {
  border: 0;
  background: none;
  padding: 0;
  color: var(--dsw-alias-link);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------- \u72B6\u6001\u5757 / \u9AA8\u67B6\uFF0844px \u7B49\u9AD8\uFF0C\u4E0D\u4F4D\u79FB\uFF09 ---------- */
.mo-state-block { max-width: var(--mo-w-prose); padding: var(--mo-s5) 0 var(--mo-s5) var(--mo-s4); }
.mo-state-title { margin: 0 0 var(--mo-s2); font-size: var(--mo-t2); line-height: var(--mo-t2-lh); font-weight: 600; }
.mo-state-text {
  margin: 0 0 var(--mo-s3);
  max-width: 640px;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-secondary);
}
.mo-state-hint {
  margin: 0 0 var(--mo-s3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-state-empty { padding-left: var(--mo-s4); }
.mo-state-error {
  border-left: 2px solid var(--dsw-alias-state-error-primary);
  padding-left: var(--mo-s3);
}
.mo-skel-wrap { padding: var(--mo-s3) var(--mo-s4) 0 0; }
.mo-skel-row {
  height: 44px;
  margin-bottom: var(--mo-s1);
  background: var(--dsw-alias-bg-skeleton);
  animation: mo-skel-breathe 1.2s ease-in-out infinite;
}
.mo-skel-note {
  margin: var(--mo-s2) 0 0;
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
}
@keyframes mo-skel-breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ---------- \u68C0\u89C6\u680F\uFF08aside\uFF0C360\uFF09 ---------- */
.mo-insp {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);
  border-left: 1px solid var(--dsw-alias-border-l3);
}
.mo-insp-head {
  padding: var(--mo-s5) var(--mo-s5) var(--mo-s3);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.mo-insp-title { margin: 0; font-size: var(--mo-t1); line-height: var(--mo-t1-lh); font-weight: 600; overflow-wrap: anywhere; }
.mo-insp-sub {
  margin: var(--mo-s1) 0 0;
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
.mo-insp-body {
  min-height: 0;
  overflow-y: auto;
  padding: var(--mo-s4) var(--mo-s5);
  transition: opacity var(--mo-dur-insp) var(--mo-ease);
}
.mo-insp-foot {
  display: flex;
  gap: var(--mo-s2);
  justify-content: flex-end;
  padding: var(--mo-s3) var(--mo-s5) var(--mo-s4);
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.mo-insp-foot[hidden] { display: none; }

/* \u5C5E\u6027\u8868 */
.mo-props { margin: 0; }
.mo-prop {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  column-gap: var(--mo-s2);
  padding: 2px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
}
.mo-prop:last-child { border-bottom: 0; }
.mo-prop dt { color: var(--dsw-alias-label-secondary); }
.mo-prop dd {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.mo-insp-text {
  margin: var(--mo-s3) 0 0;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-secondary);
}
.mo-insp-label {
  margin: var(--mo-s4) 0 var(--mo-s1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
}
.mo-insp-body .mo-verdicts + .mo-section-head {
  margin-top: var(--mo-s4);
  padding-top: var(--mo-s3);
  border-top: 1px solid var(--dsw-alias-border-l1);
}

/* \u6821\u9A8C\u884C\uFF1A\u62D2 / \u8B66 \u5206\u5F00\uFF0C\u4E92\u4E0D\u77ED\u8DEF */
.mo-verdicts { margin: var(--mo-s3) 0 0; display: flex; flex-direction: column; gap: var(--mo-s1); }
.mo-verdict {
  display: flex;
  gap: var(--mo-s2);
  align-items: baseline;
  padding-left: var(--mo-s2);
  border-left: 2px solid var(--dsw-alias-border-l3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-verdict-refuse { border-left-color: var(--dsw-alias-state-error-primary); }
.mo-verdict-warn { border-left-color: var(--dsw-alias-state-warn-primary); }
.mo-verdict-ok { border-left-color: var(--dsw-alias-state-success-primary); }
.mo-verdict-tag {
  flex: 0 0 auto;
  white-space: nowrap;
  font-family: var(--mo-mono);
  color: var(--dsw-alias-label-primary);
}

/* \u751F\u6548\u65F6\u673A */
.mo-effect {
  margin: var(--mo-s3) 0 0;
  padding-left: var(--mo-s2);
  border-left: 1px solid var(--dsw-alias-border-l3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- \u72B6\u6001\u6761\uFF08role=status\uFF09 ---------- */
.mo-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mo-s5);
  height: var(--mo-h-status);
  padding: 0 var(--mo-s5);
  border-top: 1px solid var(--dsw-alias-border-l2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-statusbar .mo-num { font-size: var(--mo-t4); }
.mo-status-left {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-status-right { flex: 0 0 auto; }

/* ---------- \u4EA4\u4E92\u4E09\u6001\uFF08brief \xA7\u4E03-1\uFF09 ---------- */
.mo-btn:hover,
.mo-btn-ink:hover,
.mo-btn-ghost:hover,
.mo-kindbtn:hover,
.mo-tab:hover,
.mo-row-button:hover,
.mo-textlink:hover,
.mo-face-btn:hover,
.mo-bucket-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.mo-btn-ink:hover { background: var(--dsw-alias-label-primary); filter: brightness(0.9); }

.mo-btn:active,
.mo-btn-ink:active,
.mo-btn-ghost:active,
.mo-kindbtn:active,
.mo-tab:active,
.mo-row-button:active,
.mo-textlink:active,
.mo-face-btn:active,
.mo-bucket-row:active { background: var(--dsw-alias-interactive-bg-active); }

.mo-btn:focus-visible,
.mo-btn-ink:focus-visible,
.mo-btn-ghost:focus-visible,
.mo-kindbtn:focus-visible,
.mo-tab:focus-visible,
.mo-row-button:focus-visible,
.mo-textlink:focus-visible,
.mo-face-btn:focus-visible,
.mo-bucket-row:focus-visible,
.mo-field:focus-visible,
.mo-title-input:focus-visible,
.mo-reason-input:focus-visible,
.mo-capture-input:focus-visible,
.mo-remember-close:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
.mo-field:focus-visible,
.mo-title-input:focus-visible,
.mo-reason-input:focus-visible,
.mo-capture-input:focus-visible { outline-offset: -1px; }
.mo-tab:focus-visible,
.mo-row-button:focus-visible,
.mo-bucket-row:focus-visible { outline-offset: -1px; }

/* ---------- \u52A8\u6548\u964D\u7EA7\uFF08brief \xA7\u516D\uFF09 ---------- */
@media (prefers-reduced-motion: reduce) {
  .mo-app *,
  .mo-app *::before,
  .mo-app *::after,
  .mo-remember-backdrop,
  .mo-remember-backdrop * {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
  .mo-skel-row { opacity: 1; }
}

/* ---------- \u5C4F\u8BFB\u4E13\u7528 ---------- */
.mo-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`;

// src/client/v9/styles-panes.ts
var PANE_CSS = `
/* ---------- \u53CC\u9762\u5F00\u5173\uFF08\u5185\u5BB9\u9762 \u21C4 \u6210\u672C\u9762\uFF09---------- */
.mo-faces {
  display: flex;
  align-items: center;
  gap: var(--mo-s3);
  padding: 0 var(--mo-s3) var(--mo-s3) 0;
}
.mo-face-switch {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  overflow: hidden;
}
.mo-face-btn {
  min-height: 32px;
  padding: 0 var(--mo-s3);
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  transition: color var(--mo-dur-state) var(--mo-ease), background-color var(--mo-dur-state) var(--mo-ease);
}
.mo-face-btn[aria-checked="true"] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--dsw-alias-state-business-primary);
}
.mo-face-note {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- \u5DE5\u5177\u5E26\uFF08\u641C\u7D22 / \u7C7B\u578B\u7B7E / \u8F93\u5165\uFF09---------- */
.mo-toolbar {
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  padding: 0 var(--mo-s3) var(--mo-s3) 0;
}
.mo-field {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  padding: 0 var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
}
.mo-field::placeholder { color: var(--dsw-alias-label-tertiary); }
.mo-kindbtn {
  min-width: 44px;
  min-height: 28px;
  padding: 0 var(--mo-s2);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), color var(--mo-dur-state) var(--mo-ease);
}
.mo-kindbtn[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-primary);
}

/* ---------- \u8BB0\u4E00\u6761 ---------- */
.mo-capture-box { padding-right: var(--mo-s4); }
.mo-capture-input {
  width: 100%;
  min-height: 120px;
  padding: var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  resize: vertical;
}
.mo-capture-note {
  margin: var(--mo-s2) 0 var(--mo-s3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-capture-actions { display: flex; align-items: center; gap: var(--mo-s3); }
.mo-inline-done {
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  margin-top: var(--mo-s3);
  padding: var(--mo-s2) var(--mo-s3);
  border-left: 2px solid var(--dsw-alias-state-success-primary);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-inline-done[data-tone="err"] { border-left-color: var(--dsw-alias-state-error-primary); }

/* ---------- \u68C0\u89C6\u680F\u7F16\u8F91\u6001\uFF1A\u5355\u884C\u8F93\u5165 / \u9A73\u56DE\u7406\u7531 ---------- */
.mo-title-input {
  width: 100%;
  min-height: 36px;
  padding: 0 var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
}
.mo-reason-input {
  width: 100%;
  min-height: 72px;
  padding: var(--mo-s2) var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  resize: vertical;
}
.mo-reason-input[aria-invalid="true"] { border-color: var(--dsw-alias-state-error-primary); }

/* diff\uFF1A\u4E0A\u4E0B\u53E0\uFF0C\u5220\u9664\u884C 2px danger + \u5220\u9664\u7EBF\uFF0C\u63D2\u5165\u884C 2px ok */
.mo-diff {
  margin: var(--mo-s2) 0 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.mo-diff-line {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  column-gap: var(--mo-s2);
  padding: var(--mo-s1) 0 var(--mo-s1) var(--mo-s2);
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
}
.mo-diff-line::before {
  content: "";
  position: absolute;
  left: 0;
  top: var(--mo-s1);
  bottom: var(--mo-s1);
  width: 2px;
}
.mo-diff-removed::before { background: var(--dsw-alias-state-error-primary); }
.mo-diff-added::before { background: var(--dsw-alias-state-success-primary); }
.mo-diff-removed .mo-diff-text {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-secondary);
}
.mo-diff-no {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t3-lh);
  color: var(--dsw-alias-label-tertiary);
}
.mo-diff-text { overflow-wrap: anywhere; }

/* ---------- \u6876\u884C\uFF08V1\uFF09---------- */
.mo-bucket-rows { list-style: none; margin: 0; padding: 0; }
.mo-bucket-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s3);
  width: 100%;
  min-height: 44px;
  padding: var(--mo-s2) var(--mo-s3) var(--mo-s2) var(--mo-s4);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease);
}
.mo-bucket-row[aria-current="true"] { background: var(--dsw-alias-card-fill-hover); }
.mo-ops-row { min-height: 32px; }
.mo-bucket-name { font-size: var(--mo-t3); }
.mo-bucket-note {
  grid-column: 1 / -1;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-bucket-num {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--mo-t3);
  text-align: right;
}
.mo-bucket-num[data-unknown="true"] { color: var(--dsw-alias-label-secondary); }

/* meter\uFF1A\u84DD = \u4F60\u80FD\u52A8\uFF0C\u7070 = \u52A8\u4E0D\u4E86\uFF1B\u4E0D\u53EF\u8BFB\u6876\u4E0D\u5165\u767E\u5206\u6BD4 */
.mo-meter-wrap { padding: var(--mo-s2) var(--mo-s4) var(--mo-s2) 0; }
.mo-meter {
  display: flex;
  gap: 2px;
  height: 12px;
  border-radius: var(--mo-r-flat);
  overflow: hidden;
}
.mo-meter-seg { height: 100%; }
.mo-meter-fixed { background: var(--dsw-alias-state-idle-primary); }
.mo-meter-own { background: var(--dsw-alias-state-business-primary); }
.mo-meter-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mo-s4);
  margin-top: var(--mo-s2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-legend-item { display: inline-flex; align-items: center; gap: var(--mo-s1); }
.mo-check-line {
  margin: var(--mo-s2) 0 0;
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}

/* ---------- /remember \u6D6E\u5C42\uFF08\u56DE\u5F52\u951A\u70B9\uFF1A\u5FC5\u987B position: fixed\uFF09---------- */
.mo-remember-backdrop {
  position: fixed;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.mo-remember-backdrop[hidden] { display: none; }
.mo-remember-dialog {
  width: 560px;
  max-width: calc(100vw - var(--mo-s6));
  padding: var(--mo-s5);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-overlay);
}
.mo-remember-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mo-s3);
  margin-bottom: var(--mo-s3);
}
.mo-remember-title { margin: 0; font-size: var(--mo-t2); line-height: var(--mo-t2-lh); font-weight: 600; }
.mo-remember-close {
  min-width: 44px;
  min-height: 28px;
  padding: 0 var(--mo-s2);
  background: none;
  border: 1px solid var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-secondary);
  font-size: var(--mo-t4);
}

/* ---------- \u7A7A\u6001\u51FA\u53E3\u6309\u94AE\u7684\u5BF9\u9F50 ---------- */
.mo-state-actions { display: flex; gap: var(--mo-s2); align-items: center; }
`;

// src/client/v9/styles.ts
var STYLE_ID2 = "dsh-memory-ops-v9-style";
var V9_CSS = `${BASE_CSS}
${PANE_CSS}`;
function installV9Styles() {
  if (typeof document === "undefined") return () => {
  };
  const existing = document.getElementById(STYLE_ID2);
  if (existing !== null) return () => {
  };
  const style = document.createElement("style");
  style.id = STYLE_ID2;
  style.textContent = V9_CSS;
  document.head.append(style);
  return () => {
    style.remove();
  };
}

// src/client/index.ts
var inject = ["slots"];
function apply(ctx) {
  const disposers = [];
  disposers.push(installV9Styles());
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
