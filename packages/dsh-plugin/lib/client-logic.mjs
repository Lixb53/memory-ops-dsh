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
    return createElement(
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
    );
  }
  return createElement(
    "div",
    {
      className: "dmo-remember-backdrop",
      // 点遮罩关闭；卡片内的点击不冒泡上来
      onClick: close,
      role: "presentation"
    },
    createElement(
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
      createElement(
        "div",
        { className: "dmo-remember-body" },
        createElement(
          "div",
          { className: "dmo-row" },
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
        // 隐私闸门：解释「为什么拒」并给脱敏后可用的文本
        blocked === null ? null : createElement(
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
        ),
        error === null ? null : createElement("div", { className: "dmo-toast dmo-toast-err", role: "alert" }, error),
        createElement(
          "div",
          { className: "dmo-remember-foot" },
          createElement(
            "span",
            { className: "dmo-row-sub", style: { marginTop: 0 } },
            "\u5B58\u5165\u540E\u53EF\u5728\u6D6E\u5C42\u91CC 30 \u79D2\u5185\u64A4\u9500"
          ),
          createElement(
            "div",
            { className: "dmo-row", style: { flex: "0 0 auto" } },
            createElement(Button, { onClick: close }, "\u53D6\u6D88"),
            createElement(Button, {
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
export {
  COMMAND_NAME,
  PANEL_ID,
  closeRememberDialog,
  consumePaneRequest,
  gotoPane,
  openRememberDialog,
  paneRequestStore,
  parseRememberLine,
  registerRemember,
  rememberStoreOf,
  requestPane,
  setRememberToast
};
