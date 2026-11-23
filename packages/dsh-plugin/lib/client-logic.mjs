/**
 * @memory-ops/dsh-plugin — 可测逻辑（React 已外置）。
 * 由 scripts/build-plugin.mjs 生成，请勿手改；仅供测试与复用。
 */

// src/client/remember-logic.ts
var COMMAND_NAME = "remember";
var KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
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

// react-stub:react-stub
var noop = () => null;
var createElement = noop;
var useState = (initial) => [typeof initial === "function" ? initial() : initial, noop];
var useEffect = noop;
var useRef = (value) => ({ current: value });
var createPortal = (children) => children;

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

// src/client/ui.ts
var h = createElement;
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
  const [text, setText] = useState("");
  const [kind, setKind] = useState("\u60F3\u6CD5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const inputRef = useRef(null);
  const sessionId = typeof props.sessionId === "string" ? props.sessionId : "default";
  useEffect(() => {
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
  useEffect(() => {
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
    return createPortal(createElement(
      "div",
      {
        className: `dmo-remember-toast ${state2.toast.ok ? "dmo-toast-ok" : "dmo-toast-err"}`,
        role: "status",
        "aria-live": "polite"
      },
      createElement("span", null, state2.toast.text),
      state2.toast.savedContent === void 0 ? null : createElement("button", {
        type: "button",
        className: "dmo-remember-undo",
        disabled: busy,
        onClick: undo
      }, "\u64A4\u9500"),
      createElement("button", {
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
  const foot = createElement(
    "div",
    { className: "dmo-remember-foot" },
    createElement(
      "span",
      { className: "dmo-row-sub", style: { marginTop: 0 } },
      "\u5B58\u5165\u540E\u53EF\u5728\u6D6E\u5C42\u91CC 30 \u79D2\u5185\u64A4\u9500"
    ),
    createElement(
      "div",
      { className: "dmo-hrow", style: { flex: "0 0 auto" } },
      createElement(Button, { onClick: close }, "\u53D6\u6D88"),
      createElement(Button, {
        variant: "primary",
        disabled: busy || text.trim() === "",
        onClick: submit
      }, busy ? "\u5B58\u5165\u4E2D\u2026" : "\u5B58\u4E00\u6761")
    )
  );
  const blockedBlock = blocked === null ? null : createElement(
    "div",
    { className: "dmo-toast dmo-toast-err", role: "alert" },
    createElement("div", null, blocked.reason),
    createElement("div", { className: "dmo-label", style: { marginTop: 6 } }, "\u8131\u654F\u540E\u53EF\u7528\uFF1A"),
    createElement("div", { style: { wordBreak: "break-all" } }, truncate(blocked.masked, 120)),
    createElement(
      "div",
      { style: { marginTop: 6 } },
      createElement(Button, {
        small: true,
        onClick: () => {
          setText(blocked.masked);
          setBlocked(null);
        }
      }, "\u586B\u5165\u8131\u654F\u6587\u672C")
    )
  );
  const body = createElement(
    "div",
    { className: "dmo-remember-body" },
    createElement(
      "div",
      { className: "dmo-hrow" },
      createElement("select", {
        className: "dmo-select",
        value: kind,
        "aria-label": "\u8BB0\u5F55\u7C7B\u578B",
        onChange: (event) => {
          setKind(event.target.value);
        }
      }, KINDS.map((item) => createElement("option", { key: item, value: item }, item)))
    ),
    createElement("textarea", {
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
    error === null ? null : createElement("div", { className: "dmo-toast dmo-toast-err", role: "alert" }, error),
    foot
  );
  const card = createElement(
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
    createElement(
      "div",
      { className: "dmo-remember-head" },
      createElement("span", { className: "dmo-remember-title" }, "\u5B58\u8FDB\u8BB0\u5FC6\u5E93"),
      createElement("button", {
        type: "button",
        className: "dmo-remember-close",
        "aria-label": "\u5173\u95ED",
        onClick: close
      }, "\xD7")
    ),
    body
  );
  const backdrop = createElement("div", {
    className: "dmo-remember-backdrop",
    // 点遮罩关闭；卡片内的点击不冒泡上来
    onClick: close,
    role: "presentation"
  }, card);
  return createPortal(backdrop, document.body);
}

// src/client/pane-nav.ts
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
function paneRequestStore() {
  return store;
}
function requestPane(pane) {
  store.set({ pane });
}
function consumePaneRequest() {
  const pane = store.getSnapshot().pane;
  if (pane === null) return void 0;
  store.set({ pane: null });
  return pane;
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
var LEDE_MAX = 20;
function clip(text, max = LEDE_MAX) {
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
function refillRows(misses) {
  if (misses === void 0) return [];
  const pipeline = misses.pipeline ?? {};
  return [...pipeline["should-fill"] ?? [], ...pipeline["observing"] ?? []];
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
export {
  COMMAND_NAME,
  LEDE_MAX,
  PANEL_ID,
  PANES,
  PLUGIN_VERSION,
  bandFigureFor,
  bandNoteFor,
  bucketsOf,
  clip,
  closeRememberDialog,
  cluesOf,
  consumePaneRequest,
  countDisplay,
  countFor,
  countsOf,
  daysSince,
  estimateTokens,
  figureFor,
  gotoPane,
  ledeFor,
  memoryEntries,
  memoryGroup,
  memoryRowsOf,
  openInboxRows,
  openRememberDialog,
  paneRequestStore,
  parseRememberLine,
  pinnedItemTokens,
  refillRows,
  registerRemember,
  rememberStoreOf,
  requestPane,
  setRememberToast,
  statusLabelOf,
  statusRightOf,
  statusToneOf,
  todayKey,
  todoSectionsOf,
  versionInfoOf
};
