/**
 * actions/errors.ts —— 能力失败的分类
 *
 * ## 为什么需要这个模块
 *
 * 原先 34 个能力全部走同一个 `guard()`，任何异常都被压成
 * `{ ok: false, error: '某段字符串' }`。后果是三件事在类型上完全一样：
 *
 *   - 文件不存在       → 该提示「这条已被删除」
 *   - 状态迁移非法     → 该提示「合法路径是 X → Y」
 *   - 隐私闸门拦截     → 该给「填入脱敏版本」按钮
 *   - 写锁超时         → 该提示「另一个进程正在写，稍后重试」
 *
 * 前端只能把 error 字符串原样显示，而 `styles.ts` 那套
 * warn / err 颜色语义**无从驱动**——因为没有可判断的字段。
 *
 * `docs/product.md` §17.8 记录过一次同型教训：给 `resident.state` 分了三态
 * （ok / empty / error），才把「读不到」和「没有」分开。
 * 那个洞察只应用在一个能力上，没有推广到 34 个。这个文件就是推广。
 *
 * ## 设计约束
 *
 * 1. **向后兼容**：`kind` 是可选字段。既有代码只读 `ok` 与 `error`，
 *    加字段不会破坏任何调用方。可以分 PR 渐进接入。
 * 2. **零依赖**：本文件不 import 任何东西，避免循环依赖。
 * 3. **分类靠错误信息识别，不靠改所有 throw 点**：现有代码有几十处
 *    `throw new Error('…')`，逐个改成自定义错误类风险大且收益低。
 *    这里用**信息模式匹配**做归类，让改动集中在一个函数里。
 *    后续若要精确化，再逐步换成自定义错误类即可，接口不变。
 */

/** 失败的类别。UI 据此决定展示方式，而不是解析 error 字符串。 */
export type ActionFailureKind =
  /** 条目 / 未命中 / 文件不存在。UI：提示「可能已被删除或改名」。 */
  | 'not-found'
  /** 状态机迁移非法。UI：提示合法路径，而不是只说「非法」。 */
  | 'invalid-state'
  /** 隐私闸门拦截。UI：红条 + 脱敏文本按钮。 */
  | 'blocked'
  /** 并发写冲突 / 写锁超时。UI：提示「稍后重试」。 */
  | 'conflict'
  /** 入参不合法（空路径、越界行号、非法类型）。UI：指向具体字段。 */
  | 'invalid-input'
  /** 磁盘 / 权限 / 解析失败。UI：黄条 + 重试。 */
  | 'io'
  /** 未归类。保守兜底，不吞掉。 */
  | 'unknown'

/** 分类结果，附带给用户看的可操作提示。 */
export interface ClassifiedFailure {
  kind: ActionFailureKind
  /** 给用户看的修复建议。缺省表示「这条类别不需要额外建议」。 */
  hint?: string
  /** blocked 时指向脱敏文本。 */
  masked?: string
}

/**
 * 错误信息 → 类别。
 *
 * 匹配顺序即优先级：先判最具体的，再落到 io / unknown。
 * 所有模式都来自 core 里真实存在的 throw 文案（见每个 case 的注释）。
 */
export function classifyError(error: unknown): ClassifiedFailure {
  const message = error instanceof Error ? error.message : String(error)
  const text = message.trim()

  // —— 不存在 ——
  // store.ts: `条目已存在：…` / `未命中不存在：…`
  // actions.ts: `条目不存在…`
  if (/不存在|已存在|找不到|被删除|ENOENT|no such file/i.test(text)) {
    return { kind: 'not-found', hint: '这条可能已被删除或改名，刷新列表再看。' }
  }

  // —— 状态迁移非法 ——
  // schema.ts: `非法状态迁移：hypothesis → confirmed`
  if (/非法状态迁移|不允许的迁移|不能从/.test(text)) {
    return {
      kind: 'invalid-state',
      hint: '状态机只允许特定路径。人可以直接确认候选/观察中，但不能从已归档直接跳回。',
    }
  }

  // —— 并发冲突 ——
  // store.ts: `写锁超时：…`
  if (/写锁超时|EBUSY|EEXIST|锁/.test(text)) {
    return { kind: 'conflict', hint: '另一个进程正在写同一个文件，等一两秒再试。' }
  }

  // —— 入参不合法 ——
  // store.ts: `路径不能为空` / `不接受绝对路径` / `不接受上级目录穿越`
  //           `项目名不能为空` / `分支名不能为空` / `行号越界` / `不是 INBOX 条目`
  if (/不能为空|不接受|越界|不是 INBOX|非法的行|类型非法/.test(text)) {
    return { kind: 'invalid-input', hint: '这是入参问题，不是数据损坏。按提示改正后重试。' }
  }

  // —— 隐私闸门 ——
  // privacy.ts / actions.ts: `检测到疑似…` / `已拒写`
  if (/隐私|疑似密钥|密钥|私钥|身份证|内网 IP|拒写/.test(text)) {
    return { kind: 'blocked', hint: '明文 Markdown 不能存密钥。可以用脱敏版本重存。' }
  }

  // —— 共享层准入 ——
  // store.ts: `不能放入 _shared` / `不能写入 _shared`
  if (/_shared/.test(text)) {
    return { kind: 'invalid-input', hint: '随版本变化的知识必须落到具体分支，不能进共享层。' }
  }

  // —— IO ——
  if (/EACCES|EPERM|EROFS|ENOSPC|EIO|磁盘|权限|写入失败|读取失败/.test(text)) {
    return { kind: 'io', hint: '磁盘或权限问题。库文件没有丢，重试通常可恢复。' }
  }

  return { kind: 'unknown' }
}

/**
 * 判断一个 unknown 是否是「隐私拦截」。
 *
 * 单独抽出来因为它是**唯一需要在 error 之外再带 `masked` 的类别**，
 * 调用点必须能拿到脱敏文本，不能只拿到 kind。
 */
export function isPrivacyBlock(error: unknown): boolean {
  return classifyError(error).kind === 'blocked'
}
