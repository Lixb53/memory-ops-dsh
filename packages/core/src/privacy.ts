/**
 * 隐私闸门 —— 记忆库不该成为第二个泄密点。
 *
 * 捕获与写入前一律检测；命中则**拒写并留审计**，给出脱敏后的建议文本，
 * 让用户决定是否重存。这是 product.md §11.2 表格里「隐私闸门」的落地。
 *
 * 检测口径（保守优先，宁可误报也不漏报）：
 *   - 常见云厂商 / 平台密钥前缀（sk-、ghp_、AKIA、xoxb- 等）
 *   - PEM 私钥块
 *   - 中国大陆身份证号（18 位，末位可为 X）
 *   - 内网 IP（10/8、172.16/12、192.168/16）
 *   - 通用 `password=` / `token=` / `secret=` 赋值
 */

/** 一类敏感模式。 */
interface SecretPattern {
  label: string
  re: RegExp
}

/** 各类敏感模式。label 用于向用户解释「命中了什么」。 */
const PATTERNS: readonly SecretPattern[] = [
  { label: 'OpenAI/DeepSeek 风格密钥', re: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { label: 'GitHub token', re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { label: 'AWS Access Key', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { label: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { label: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { label: 'PEM 私钥', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{0,4096}?-----END [A-Z ]*PRIVATE KEY-----/g },
  { label: '中国大陆身份证号', re: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g },
  { label: '内网 IP', re: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g },
  { label: '口令/令牌赋值', re: /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?([^\s"',;]{6,})/gi },
]

/** 脱敏替换字符。 */
const MASK = '***'

/** 一项命中。 */
export interface SecretFinding {
  label: string
  count: number
}

/** 检测结果。 */
export interface PrivacyInspection {
  blocked: boolean
  findings: SecretFinding[]
  masked: string
  reason: string
}

/** 检测一段文本。 */
export function inspectText(text: unknown): PrivacyInspection {
  const source = String(text ?? '')
  const findings: SecretFinding[] = []
  let masked = source
  for (const { label, re } of PATTERNS) {
    const pattern = new RegExp(re.source, re.flags)
    let match = pattern.exec(source)
    let count = 0
    while (match !== null) {
      count += 1
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1
      match = pattern.exec(source)
    }
    if (count === 0) continue
    findings.push({ label, count })
    masked = masked.replace(new RegExp(re.source, re.flags), (full) => {
      // 保留「赋值形式」的键名，只遮值
      const assignment = /^([^:=]+[:=]\s*["']?)(.+)$/.exec(full)
      if (assignment !== null) return `${assignment[1]}${MASK}`
      return MASK
    })
  }
  return {
    blocked: findings.length > 0,
    findings,
    masked,
    reason: findings.length === 0
      ? ''
      : `疑似敏感信息：${findings.map(item => `${item.label} ×${item.count}`).join('、')}`,
  }
}

/** 只判断是否命中，不生成脱敏文本（热路径用）。 */
export function hasSecret(text: unknown): boolean {
  const source = String(text ?? '')
  for (const { re } of PATTERNS) {
    if (new RegExp(re.source, re.flags).test(source)) return true
  }
  return false
}

/** 审计记录：留痕但不留原文。 */
export function auditRecord(text: unknown, findings: SecretFinding[]): {
  at: string
  length: number
  findings: string[]
  preview: string
} {
  return {
    at: new Date().toISOString(),
    length: String(text ?? '').length,
    findings: findings.map(item => item.label),
    // 只留首尾各 6 字，便于定位是哪一条，又不构成泄密
    preview: `${String(text).slice(0, 6)}…${String(text).slice(-6)}`,
  }
}
