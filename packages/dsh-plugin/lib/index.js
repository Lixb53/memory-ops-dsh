/**
 * @memory-ops/dsh-plugin — host 半体（node）。
 * 由 scripts/build-plugin.mjs 生成，请勿手改。
 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// ../core/src/project.ts
var project_exports = {};
__export(project_exports, {
  cwdSegments: () => cwdSegments,
  projectAliasesOf: () => projectAliasesOf,
  resolveProject: () => resolveProject
});
function cwdSegments(cwd) {
  return String(cwd ?? "").replace(/\\/g, "/").toLowerCase().split("/").map((segment) => segment.trim()).filter((segment) => segment !== "");
}
function projectAliasesOf(entries) {
  const byName = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const parts = String(entry.path ?? "").split("/");
    if (parts[0] !== "work" || parts.length !== 3) continue;
    if (parts[2].toLowerCase() !== "index.md") continue;
    byName.set(parts[1], { name: parts[1], aliases: [] });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function resolveProject(cwd, projects) {
  const text = String(cwd ?? "").trim();
  const knownProjects = projects.map((item) => item.name);
  if (text === "") {
    return { project: null, matchedAlias: null, matchedBy: null, cwd: null, knownProjects, reason: "" };
  }
  const segments = cwdSegments(text);
  if (segments.length === 0) {
    return { project: null, matchedAlias: null, matchedBy: null, cwd: text, knownProjects, reason: "" };
  }
  const tiers = [];
  for (const item of projects) {
    const candidates = [
      { value: item.name, by: "name" },
      ...item.aliases.map((value) => ({ value, by: "alias" }))
    ];
    for (const candidate of candidates) {
      const needle = candidate.value.toLowerCase();
      if (needle === "") continue;
      for (const segment of segments) {
        const bare = segment.startsWith(".") ? segment.slice(1) : segment;
        if (segment === needle || bare === needle) {
          const score = needle.length * 10 - (segment === needle ? 0 : 0.5);
          tiers.push({ by: candidate.by, score, project: item.name, alias: candidate.value });
          continue;
        }
        const rest = segment.slice(needle.length, needle.length + 1);
        if (segment.startsWith(needle) && (rest === "-" || rest === "_" || rest === ".")) {
          tiers.push({ by: "prefix", score: needle.length * 10 - 1, project: item.name, alias: candidate.value });
        }
      }
    }
  }
  if (tiers.length === 0) {
    return {
      project: null,
      matchedAlias: null,
      matchedBy: null,
      cwd: text,
      knownProjects,
      reason: knownProjects.length === 0 ? "\u5E93\u91CC\u8FD8\u6CA1\u6709\u4EFB\u4F55\u9879\u76EE\uFF08work/ \u4E0B\u6CA1\u6709 index.md\uFF09" : `cwd \u91CC\u6CA1\u6709\u51FA\u73B0\u4EFB\u4F55\u5DF2\u77E5\u9879\u76EE\u540D\u6216\u522B\u540D\uFF08\u5DF2\u77E5\uFF1A${knownProjects.join(" / ")}\uFF09`
    };
  }
  const tierRank = { name: 3, alias: 2, prefix: 1 };
  const best = tiers.sort(
    (a, b) => tierRank[b.by] - tierRank[a.by] || b.score - a.score || b.alias.length - a.alias.length
  )[0];
  return {
    project: best.project,
    matchedAlias: best.alias,
    matchedBy: best.by,
    cwd: text,
    knownProjects,
    reason: ""
  };
}
var init_project = __esm({
  "../core/src/project.ts"() {
    "use strict";
  }
});

// ../core/src/schema.ts
var INBOX_COLUMNS = ["\u65E5\u671F", "\u7C7B\u578B", "\u5185\u5BB9", "\u72B6\u6001", "\u53BB\u5411"];
var INBOX_KINDS = ["\u60F3\u6CD5", "\u8BA1\u5212", "\u95EE\u9898", "\u5F85\u529E", "\u51B3\u7B56"];
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
function isStateAllowed(kind, state) {
  return statesOfKind(kind).includes(String(state ?? "").trim());
}
var CONFIDENCE_STATES = [
  "hypothesis",
  "observed",
  "reinforced",
  "confirmed",
  "rejected",
  "stale",
  "archived"
];
var STATE_CONFIDENCE = {
  hypothesis: 0.3,
  observed: 0.5,
  reinforced: 0.7,
  confirmed: 0.9,
  rejected: 0,
  stale: 0.4,
  archived: 0
};
var STATE_TRANSITIONS = {
  hypothesis: ["observed", "rejected", "stale", "archived"],
  observed: ["reinforced", "rejected", "stale", "archived"],
  reinforced: ["confirmed", "rejected", "stale", "archived"],
  confirmed: ["rejected", "stale", "archived"],
  rejected: ["hypothesis", "observed", "reinforced", "confirmed"],
  stale: ["confirmed", "rejected", "archived"],
  archived: ["confirmed", "stale"]
};
var HUMAN_STATE_TRANSITIONS = {
  hypothesis: ["confirmed", "rejected", "stale", "archived", "observed"],
  observed: ["confirmed", "rejected", "stale", "archived", "reinforced"],
  reinforced: ["confirmed", "rejected", "stale", "archived"],
  confirmed: ["rejected", "stale", "archived"],
  rejected: ["hypothesis", "observed", "reinforced", "confirmed"],
  stale: ["confirmed", "rejected", "archived"],
  archived: ["confirmed", "stale"]
};
var ORIGINS = ["G1", "G2", "G3", "G4"];
var ORIGIN_NEEDS_EVIDENCE = {
  G1: false,
  G2: true,
  G3: true,
  G4: true
};
var FILE_LINE_LIMIT = 80;
var FILE_TOKEN_SOFT_LIMIT = 1200;
var RESIDENT_TOKEN_BUDGET = 1024;
var SHARED_BRANCH = "_shared";
var SHARED_ALLOWED_KINDS = ["mechanism", "convention"];
function canShareAcrossBranches(kind) {
  const value = String(kind ?? "").trim();
  return SHARED_ALLOWED_KINDS.includes(value);
}
var ANY_BRANCH = "*";
var BRANCH_SEPARATOR = "-";
var STALE_AFTER_DAYS = 90;
var RETIRE_AFTER_DAYS = 134;
var REJECT_SILENCE_DAYS = 30;
var STALE_WEIGHT = 0.4;
var REINFORCE_MIN_SESSIONS = 3;
var AUTO_PROMOTABLE_STATES = ["hypothesis", "observed"];
var MISS_VERIFY_DAYS = 7;
var TRUNCATE_CHARS = 46;
var EMPTY_VALUE = "\u2014";
function orEmpty(value) {
  if (value === void 0 || value === null) return EMPTY_VALUE;
  const text = String(value).trim();
  return text === "" ? EMPTY_VALUE : text;
}
function truncate(text, max = TRUNCATE_CHARS) {
  const value = String(text ?? "");
  const chars = [...value];
  if (chars.length <= max) return value;
  return `${chars.slice(0, Math.max(0, max - 1)).join("")}\u2026`;
}
function estimateTokens(text) {
  const value = String(text ?? "");
  if (value === "") return 0;
  let cjk = 0;
  let rest = 0;
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const wide = code >= 11904 && code <= 40959 || code >= 44032 && code <= 55215 || code >= 63744 && code <= 64255 || code >= 65280 && code <= 65519 || code >= 12288 && code <= 12351;
    if (wide) cjk += 1;
    else rest += 1;
  }
  return Math.ceil(cjk + rest / 4);
}
function daysSince(iso, now = Date.now()) {
  const at = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(at)) return null;
  return Math.floor((now - at) / 864e5);
}
function expiryOf(entry, now = Date.now()) {
  const days = daysSince(entry.lastCitedAt ?? entry.updatedAt ?? entry.createdAt, now);
  if (days === null) return { level: "unknown", days: null };
  if (days >= RETIRE_AFTER_DAYS) return { level: "retire", days };
  if (days >= STALE_AFTER_DAYS) return { level: "stale", days };
  return { level: "fresh", days };
}
function needsDecision(entry, now = Date.now()) {
  if (entry.status === "hypothesis" || entry.status === "observed") return true;
  if (entry.status === "rejected") {
    const at = Date.parse(entry.refutedAt ?? "") || 0;
    return at > 0 && now - at < REJECT_SILENCE_DAYS * 864e5;
  }
  return entry.status === "stale";
}
function canTransition(from, to) {
  if (from === to) return true;
  const allowed = STATE_TRANSITIONS[from];
  return allowed !== void 0 && allowed.includes(to);
}
function canHumanTransition(from, to) {
  if (from === to) return true;
  const allowed = HUMAN_STATE_TRANSITIONS[from];
  if (allowed !== void 0 && allowed.includes(to)) return true;
  if (allowed === void 0) return canTransition(from, to);
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

// ../core/src/actions.ts
init_project();

// ../core/src/scope.ts
function norm(value) {
  return String(value ?? "").trim().toLowerCase();
}
function branchMatches(entryBranch, sessionBranch) {
  const entry = norm(entryBranch);
  if (entry === "" || entry === norm(SHARED_BRANCH) || entry === ANY_BRANCH) return true;
  const session = norm(sessionBranch);
  if (session === "") return false;
  if (entry === session) return true;
  return session.startsWith(`${entry}${BRANCH_SEPARATOR}`);
}
var UNKNOWN_BRANCH_POLICY = "show";
function projectParentsOf(entries) {
  const parents = {};
  for (const entry of entries) {
    const parts = String(entry.path ?? "").split("/");
    if (parts[0] !== "work" || parts.length !== 3) continue;
    if (parts[2].toLowerCase() !== "index.md") continue;
    const name2 = parts[1];
    const declared = entry.frontmatter?.parent;
    const parent = typeof declared === "string" ? declared.trim() : "";
    parents[name2] = parent === "" ? null : parent;
  }
  return parents;
}
async function inferParentProject({
  cwd,
  projects,
  maxDepth = 5,
  readRepo = readRepoIdentity
}) {
  const start = String(cwd ?? "").trim();
  if (start === "") return { parent: null, detail: "\u6CA1\u6709\u4F1A\u8BDD\u76EE\u5F55\uFF0C\u65E0\u6CD5\u63A8\u65AD\u7236\u9879\u76EE" };
  const byName = new Map(projects.map((item) => [item.name.toLowerCase(), item.name]));
  const parts = start.replace(/\\/g, "/").split("/").filter((part) => part !== "");
  const tried = [];
  let self = true;
  for (let depth = 0; depth < maxDepth && parts.length > 0; depth += 1) {
    const dir = `${start.startsWith("/") ? "/" : ""}${parts.join("/")}`;
    const repo = await readRepo(dir);
    if (repo.repo !== null) {
      const known = byName.get(repo.repo.toLowerCase());
      if (known !== void 0 && !self) {
        return {
          parent: known,
          detail: `\u7531\u4E0A\u7EA7\u76EE\u5F55 ${parts[parts.length - 1]} \u7684 remote\uFF08${repo.repo}\uFF09\u63A8\u65AD`
        };
      }
      tried.push(`${parts[parts.length - 1] ?? "/"}\u2192${repo.repo}`);
    }
    parts.pop();
    self = false;
  }
  return {
    parent: null,
    detail: tried.length === 0 ? "\u5411\u4E0A\u5404\u7EA7\u76EE\u5F55\u90FD\u4E0D\u662F git \u4ED3\u5E93\uFF0C\u65E0\u6CD5\u63A8\u65AD\u7236\u9879\u76EE" : `\u5411\u4E0A\u67E5\u4E86 ${tried.length} \u5C42\uFF08${tried.join("\u3001")}\uFF09\uFF0C\u90FD\u4E0D\u662F\u5E93\u91CC\u5DF2\u77E5\u7684\u9879\u76EE`
  };
}
var COMMON_BRANCH_NAMES = [
  "main",
  "master",
  "develop",
  "dev",
  "trunk",
  "release"
];
function looksLikeBranch(segment, declared) {
  if (segment === "" || segment === SHARED_BRANCH) return false;
  if (declared !== void 0) {
    for (const name2 of declared) {
      if (norm(name2) === norm(segment)) return true;
    }
    return false;
  }
  const value = norm(segment);
  if (COMMON_BRANCH_NAMES.includes(value)) return true;
  return /^v?\d+(\.\d+)+/i.test(segment);
}
function scopeOfPath(relPath, declared) {
  const parts = String(relPath ?? "").replace(/\\/g, "/").split("/").filter((part) => part !== "");
  if (parts[0] !== "work" || parts[1] === void 0) return { project: null, branch: null };
  const project = parts[1];
  const third = parts[2];
  if (third === void 0 || third.toLowerCase().endsWith(".md")) {
    return { project, branch: null };
  }
  if (third === SHARED_BRANCH) return { project, branch: null };
  if (!looksLikeBranch(third, declared)) return { project, branch: null };
  return { project, branch: third };
}
function projectLineage(project, parents) {
  if (project === null || project === "") return [];
  const seen = /* @__PURE__ */ new Set();
  const chain = [];
  let current = project;
  while (current !== null && current !== "" && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = parents[current] ?? null;
  }
  return chain;
}
function isEntryVisible(entry, view) {
  if (entry.project === null) return true;
  if (view.project === null) {
    return view.branch === null ? true : branchMatches(entry.branch, view.branch);
  }
  const lineage = projectLineage(view.project, view.parents);
  if (!lineage.includes(entry.project)) return false;
  if (view.branch === null) {
    return UNKNOWN_BRANCH_POLICY === "show" ? true : entry.branch === null;
  }
  return branchMatches(entry.branch, view.branch);
}
function describeScope(scope) {
  if (scope.project === null) return "\u4E2A\u4EBA\u57DF";
  if (scope.branch === null) return `${scope.project} \xB7 \u5168\u90E8\u5206\u652F`;
  return `${scope.project} \xB7 ${scope.branch}`;
}
function isUnscopedEntry(relPath, declared) {
  const parts = String(relPath ?? "").replace(/\\/g, "/").split("/").filter((part) => part !== "");
  if (parts[0] !== "work" || parts[1] === void 0) return false;
  const third = parts[2];
  if (third === void 0) return false;
  if (parts.length === 3 && third.toLowerCase() === "index.md") return false;
  if (third === SHARED_BRANCH) return false;
  if (third.toLowerCase().endsWith(".md")) return true;
  return !looksLikeBranch(third, declared);
}
function branchFromPath(cwd) {
  const parts = String(cwd ?? "").replace(/\\/g, "/").split("/").filter((part) => part !== "");
  const last = parts[parts.length - 1];
  if (last === void 0 || last === "") return null;
  if (/^\d/.test(last)) return null;
  if (!/^[A-Za-z0-9._\/-]+$/.test(last)) return null;
  if (/^v?\d+(\.\d+)*(-|$)/i.test(last)) return last;
  return null;
}
async function readGitBranch(cwd, run = defaultRun) {
  const dir = String(cwd ?? "").trim();
  if (dir === "") {
    return { branch: null, source: null, reason: "no_cwd", detail: "\u6CA1\u6709\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55" };
  }
  try {
    const out = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir });
    const name2 = out.trim();
    if (name2 === "" || name2 === "HEAD") {
      return {
        branch: null,
        source: null,
        reason: "detached_head",
        detail: "git \u5904\u4E8E detached HEAD\uFF0C\u6CA1\u6709\u5206\u652F\u540D\uFF1B\u8BF7\u663E\u5F0F\u6307\u5B9A\u5206\u652F"
      };
    }
    return { branch: name2, source: "git", reason: "", detail: `git rev-parse --abbrev-ref HEAD \u2192 ${name2}` };
  } catch (error) {
    const fallback = branchFromPath(dir);
    const detail = error instanceof Error ? error.message : String(error);
    if (fallback !== null) {
      return {
        branch: fallback,
        source: "path",
        reason: "",
        detail: `\u8BFB git \u5931\u8D25\uFF08${detail}\uFF09\uFF0C\u6309\u76EE\u5F55\u540D\u63A8\u65AD\u4E3A ${fallback}`
      };
    }
    return {
      branch: null,
      source: null,
      reason: "no_git",
      detail: `\u8BFB git \u5931\u8D25\uFF08${detail}\uFF09\uFF0C\u4E14\u76EE\u5F55\u540D\u4E0D\u542B\u7248\u672C\u53F7\uFF0C\u65E0\u6CD5\u63A8\u65AD\u5206\u652F`
    };
  }
}
async function defaultRun(cmd, args, options) {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: options.cwd, timeout: 3e3 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(String(stdout));
    });
  });
}
function repoNameFromRemote(url) {
  const cleaned = String(url ?? "").trim().replace(/\.git$/i, "").replace(/[\/]+$/, "");
  if (cleaned === "") return null;
  const last = cleaned.split(/[\/:]/).pop() ?? "";
  return last.trim() === "" ? null : last.trim();
}
async function readRepoIdentity(cwd, run = defaultRun) {
  const dir = String(cwd ?? "").trim();
  if (dir === "") return { repo: null, detail: "\u6CA1\u6709\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55" };
  try {
    const url = await run("git", ["config", "--get", "remote.origin.url"], { cwd: dir });
    const repo = repoNameFromRemote(url);
    return repo === null ? { repo: null, detail: "remote.origin.url \u4E3A\u7A7A" } : { repo, detail: `git remote \u2192 ${repo}` };
  } catch (error) {
    return {
      repo: null,
      detail: `\u8BFB remote \u5931\u8D25\uFF08${error instanceof Error ? error.message : String(error)}\uFF09`
    };
  }
}
async function resolveScope({
  cwd,
  projects,
  entries,
  readBranch = readGitBranch,
  readRepo = readRepoIdentity
}) {
  const text = String(cwd ?? "").trim();
  const parents = text === "" ? {} : projectParentsOf(entries);
  let parentDetail = "";
  if (text !== "") {
    const inferred = await inferParentProject({ cwd: text, projects, readRepo });
    parentDetail = inferred.detail;
    const repo2 = await readRepo(text);
    const selfName = repo2.repo === null ? null : projects.find((item) => item.name.toLowerCase() === repo2.repo.toLowerCase())?.name ?? null;
    if (inferred.parent !== null && selfName !== null && selfName !== inferred.parent) {
      parents[selfName] = inferred.parent;
    }
  }
  if (text === "") {
    return {
      project: null,
      branch: null,
      branchSource: null,
      cwd: null,
      reasons: ["no_cwd"],
      detail: "\u6CA1\u6709\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55",
      parents
    };
  }
  const { resolveProject: resolveProject2 } = await Promise.resolve().then(() => (init_project(), project_exports));
  const repo = await readRepo(text);
  const repoProject = repo.repo === null ? null : projects.find((item) => item.name.toLowerCase() === repo.repo.toLowerCase())?.name ?? null;
  const resolution = repoProject !== null ? { project: repoProject, matchedAlias: repo.repo, matchedBy: "remote", cwd: text, reason: "" } : (() => {
    const byPath = resolveProject2(text, projects.map((item) => ({ name: item.name, aliases: [] })));
    return { ...byPath, matchedBy: byPath.matchedBy };
  })();
  const detection = await readBranch(text);
  const reasons = [];
  if (resolution.project === null) reasons.push("unknown_project");
  if (detection.branch === null) reasons.push(detection.reason || "unknown_branch");
  const details = [];
  details.push(resolution.project === null ? resolution.reason || "\u672A\u8BA4\u51FA\u9879\u76EE" : repoProject !== null ? `\u9879\u76EE ${resolution.project}\uFF08\u7531 ${repo.detail}\uFF09` : `\u9879\u76EE ${resolution.project}\uFF08\u7531\u8DEF\u5F84\u547D\u4E2D ${resolution.matchedAlias}\uFF09`);
  if (repoProject === null && repo.repo !== null) {
    details.push(`remote \u662F ${repo.repo}\uFF0C\u5E93\u91CC\u6CA1\u6709\u540C\u540D\u9879\u76EE`);
  }
  details.push(detection.branch === null ? detection.detail : `\u5206\u652F ${detection.branch}\uFF08\u6765\u6E90 ${detection.source}\uFF09`);
  if (parentDetail !== "") {
    const selfName = repo.repo === null ? null : projects.find((item) => item.name.toLowerCase() === repo.repo.toLowerCase())?.name ?? null;
    const isRoot = selfName !== null && (parents[selfName] ?? null) === null;
    const parentLine = isRoot ? `\u7236\u9879\u76EE\uFF1A${selfName} \u81EA\u8EAB\u5373\u4E3B\u4ED3\uFF0C\u65E0\u7236\u9879\u76EE` : selfName !== null && parents[selfName] !== void 0 ? `\u7236\u9879\u76EE\uFF1A${parents[selfName]}` : `\u7236\u9879\u76EE\uFF1A${parentDetail}`;
    details.push(parentLine);
  }
  return {
    project: resolution.project,
    branch: detection.branch,
    branchSource: detection.source,
    cwd: text,
    reasons,
    detail: details.join("\uFF1B"),
    parents
  };
}

// ../core/src/search.ts
function normalize(text) {
  return String(text ?? "").toLowerCase();
}
function isCjk(term) {
  return /[\u2e80-\u9fff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/.test(term);
}
function escapeRegExp(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function entryMatches(entry, terms) {
  const title = normalize(entry.title);
  const tags = normalize(entry.tags.join(" "));
  const body = normalize(entry.body);
  const id = normalize(entry.id);
  return terms.every((term) => {
    if (isCjk(term)) {
      return title.includes(term) || body.includes(term) || tags.includes(term) || id.includes(term);
    }
    const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(term)}`, "i");
    return pattern.test(title) || pattern.test(body) || pattern.test(tags) || pattern.test(id);
  });
}
function snippetOf(entry, terms) {
  const lines = String(entry.body ?? "").split("\n");
  const lowerTerms = terms.map(normalize);
  for (let index = 0; index < lines.length; index += 1) {
    const line = normalize(lines[index]);
    if (lowerTerms.some((term) => line.includes(term))) {
      const before = lines[index - 1]?.trim() ?? "";
      const context = before === "" ? lines[index].trim() : `${before} / ${lines[index].trim()}`;
      return truncate(context, 120);
    }
  }
  return truncate(entry.title, 120);
}
function scoreOf(entry, terms) {
  const title = normalize(entry.title);
  const tags = normalize(entry.tags.join(" "));
  const body = normalize(entry.body);
  let score = 0;
  for (const term of terms.map(normalize)) {
    if (title.includes(term)) score += 10;
    if (tags.includes(term)) score += 6;
    if (body.includes(term)) score += 2;
  }
  if (entry.pinned) score += 3;
  if (entry.layer === "l0") score += 2;
  if (entry.layer === "l1") score += 1;
  if (entry.status === "stale" || entry.status === "rejected") {
    score = score * STALE_WEIGHT;
  }
  return score;
}
function searchEntries(entries, query, options = {}) {
  const text = String(query ?? "").trim();
  if (text === "") return { query: text, terms: [], hits: [], matched: false };
  const terms = text.split(/\s+/).filter(Boolean);
  const scope = options.scope;
  const scoped = scope !== void 0 && scope !== null ? entries.filter((entry) => isEntryVisible(
    { project: entry.project, branch: entry.branch },
    { project: scope.project, branch: scope.branch, parents: scope.parents }
  )) : options.project === void 0 || options.project === null || options.project === "" ? entries : entries.filter((entry) => entry.project === options.project);
  const hits = scoped.filter((entry) => entryMatches(entry, terms)).map((entry) => ({
    id: entry.id,
    path: entry.path,
    title: entry.title,
    domain: entry.domain,
    domainLabel: entry.domainLabel,
    layer: entry.layer,
    status: entry.status,
    confidence: entry.confidence,
    tokens: entry.tokens,
    snippet: snippetOf(entry, terms),
    score: scoreOf(entry, terms)
  })).sort((a, b) => b.score - a.score);
  return { query: text, terms, hits, matched: hits.length > 0 };
}
function searchCost(hits) {
  return hits.reduce((sum, hit) => sum + estimateTokens(hit.snippet) + 8, 0);
}

// ../core/src/maintenance.ts
import crypto from "node:crypto";
function hashOf(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex").slice(0, 12);
}
async function verifyAnchors(entries, reader, { baseDir = "" } = {}) {
  const checks = [];
  let withoutAnchor = 0;
  for (const entry of entries) {
    const anchor = entry.anchor;
    if (anchor === null || Object.keys(anchor).length === 0) {
      withoutAnchor += 1;
      continue;
    }
    const anchorPath = String(anchor.path ?? "").trim();
    const symbol = String(anchor.symbol ?? "").trim();
    const recordedHash = String(anchor.hash ?? "").trim();
    const base = {
      id: entry.id,
      path: entry.path,
      title: entry.title,
      anchorPath,
      symbol,
      recordedHash
    };
    if (anchorPath === "") {
      checks.push({
        ...base,
        actualHash: "",
        state: "unverifiable",
        reason: "\u951A\u70B9\u7F3A\u5C11 path\uFF0C\u65E0\u6CD5\u5B9A\u4F4D"
      });
      continue;
    }
    const text = await reader(anchorPath);
    if (text === null) {
      checks.push({
        ...base,
        actualHash: "",
        state: "missing",
        reason: `\u951A\u70B9\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${anchorPath}`
      });
      continue;
    }
    const actualHash = hashOf(text);
    if (symbol !== "" && !text.includes(symbol)) {
      checks.push({
        ...base,
        actualHash,
        state: "stale",
        reason: `\u627E\u4E0D\u5230\u7B26\u53F7\u300C${truncate(symbol, 30)}\u300D\u2014\u2014\u4EE3\u7801\u53EF\u80FD\u5DF2\u91CD\u547D\u540D\u6216\u5220\u9664`
      });
      continue;
    }
    if (recordedHash !== "" && recordedHash !== actualHash) {
      checks.push({
        ...base,
        actualHash,
        state: "stale",
        reason: `\u6587\u4EF6\u5DF2\u53D8\u66F4\uFF08\u8BB0\u5F55 ${recordedHash} \u2192 \u73B0\u5728 ${actualHash}\uFF09\uFF0C\u7ED3\u8BBA\u53EF\u80FD\u8FC7\u671F`
      });
      continue;
    }
    checks.push({ ...base, actualHash, state: "fresh", reason: "\u951A\u70B9\u6709\u6548" });
  }
  const summary = { fresh: 0, stale: 0, missing: 0, unverifiable: 0 };
  for (const check of checks) summary[check.state] += 1;
  return { checks, summary, withoutAnchor, baseDir };
}
function contentLines(text) {
  if (text === "") return 0;
  const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
  return trimmed.split("\n").length;
}
function compactBody(body) {
  const text = String(body ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const kept = [];
  let trimmed = 0;
  let collapsed = 0;
  let previousBlank = false;
  for (const line of lines) {
    const hardBreak = /  $/.test(line);
    const cleaned = hardBreak ? `${line.replace(/\s+$/, "")}  ` : line.replace(/\s+$/, "");
    if (cleaned !== line) trimmed += 1;
    const isBlank = cleaned.trim() === "";
    if (isBlank && previousBlank) {
      collapsed += 1;
      continue;
    }
    previousBlank = isBlank;
    kept.push(cleaned);
  }
  let start = 0;
  let end = kept.length;
  while (start < end && kept[start].trim() === "") start += 1;
  while (end > start && kept[end - 1].trim() === "") end -= 1;
  const headTail = start + (kept.length - end);
  const result = kept.slice(start, end);
  const changes = [];
  if (trimmed > 0) changes.push(`\u53BB\u884C\u5C3E\u7A7A\u767D ${trimmed} \u884C`);
  if (collapsed > 0) changes.push(`\u6298\u53E0\u8FDE\u7EED\u7A7A\u884C ${collapsed} \u884C`);
  if (headTail > 0) changes.push(`\u53BB\u9996\u5C3E\u7A7A\u884C ${headTail} \u884C`);
  return {
    body: result.length === 0 ? "" : `${result.join("\n")}
`,
    before: contentLines(text),
    /**
     * `before` / `after` / `removed` 全部走 `contentLines`，口径完全统一。
     *
     * 早先 `after` 写的是 `result.length + 1`（把补上的结尾换行算成一行），
     * 于是「本来没有结尾换行」的文件会算出 `removed = -1`——压缩反而报告变长。
     * `removed <= 0` 时 apply 会跳过、不会写坏数据，但把负数展示给用户就是错的。
     */
    after: contentLines(result.length === 0 ? "" : `${result.join("\n")}
`),
    removed: Math.max(0, contentLines(text) - contentLines(result.length === 0 ? "" : `${result.join("\n")}
`)),
    changes,
    splitSuggestions: splitSuggestionsOf(result)
  };
}
function splitSuggestionsOf(lines) {
  const sections = [];
  let current = null;
  for (const line of lines) {
    const heading = /^#{2,3}\s+(.*)$/.exec(line);
    if (heading !== null) {
      if (current !== null) sections.push(current);
      current = { heading: heading[1].trim(), lines: 0 };
      continue;
    }
    if (current !== null) current.lines += 1;
  }
  if (current !== null) sections.push(current);
  return sections.filter((section) => section.lines >= 20).sort((a, b) => b.lines - a.lines);
}
function needsCompact(entry) {
  return entry.overLineLimit || entry.lines > FILE_LINE_LIMIT;
}
function weeklyReview(entries, events, misses, { nowMs = Date.now(), days = 7 } = {}) {
  const windowStart = nowMs - days * 864e5;
  const inWindow = events.filter((event) => {
    const at = Date.parse(event.at ?? "");
    return Number.isFinite(at) && at >= windowStart;
  });
  const eventCounts = {};
  for (const event of inWindow) {
    eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1;
  }
  const touched = entries.filter((entry) => {
    const at = Date.parse(entry.updatedAt ?? "");
    return Number.isFinite(at) && at >= windowStart;
  }).length;
  const pending = entries.filter((entry) => entry.status === "hypothesis" || entry.status === "observed").length;
  const stale = entries.filter((entry) => entry.status === "stale").length;
  const overLimit = entries.filter((entry) => entry.overLineLimit).length;
  const missCount = misses.reduce((sum, miss) => sum + (miss.count ?? 1), 0);
  const topMisses = [...misses].sort((a, b) => (b.count ?? 1) - (a.count ?? 1)).slice(0, 5).map((miss) => ({ query: miss.query, count: miss.count ?? 1 }));
  const todo = [];
  for (const entry of entries) {
    const expiry = expiryOf(entry, nowMs);
    if (expiry.level === "retire") {
      todo.push({
        kind: "retire",
        title: entry.title,
        detail: `${expiry.days} \u5929\u672A\u88AB\u5F15\u7528\uFF0C\u8BE5\u5F52\u6863\u6216\u518D\u7559 90 \u5929`,
        path: entry.path
      });
    }
  }
  for (const entry of entries) {
    if (entry.status === "hypothesis" || entry.status === "observed") {
      todo.push({
        kind: "confirm",
        title: entry.title,
        detail: `\u72B6\u6001 ${entry.status}\uFF0C\u7B49\u4F60\u786E\u8BA4\u6216\u9A73\u56DE`,
        path: entry.path
      });
    }
  }
  for (const entry of entries) {
    if (entry.status === "stale") {
      todo.push({
        kind: "review",
        title: entry.title,
        detail: `\u5F85\u590D\u6838\uFF08${daysSince(entry.updatedAt, nowMs) ?? "?"} \u5929\u672A\u52A8\uFF09`,
        path: entry.path
      });
    }
  }
  for (const entry of entries) {
    if (entry.overLineLimit) {
      todo.push({
        kind: "compact",
        title: entry.title,
        detail: `${entry.lines} \u884C\uFF0C\u8D85 ${FILE_LINE_LIMIT} \u884C\u4E0A\u9650\uFF0C\u53EF\u53BB\u300C\u603B\u89C8 \xB7 \u51CF\u91CD\u300D\u505A\u673A\u68B0\u538B\u7F29`,
        path: entry.path
      });
    }
  }
  for (const miss of topMisses) {
    if (miss.count >= 3) {
      todo.push({ kind: "fill", title: miss.query, detail: `\u672A\u547D\u4E2D ${miss.count} \u6B21\uFF0C\u8BE5\u8865\u4E00\u6761` });
    }
  }
  return {
    window: {
      days,
      from: new Date(windowStart).toISOString(),
      to: new Date(nowMs).toISOString()
    },
    events: eventCounts,
    counts: { touched, pending, stale, overLimit, misses: missCount },
    topMisses,
    todo
  };
}
function planPromotions(entries, events, { minSessions = REINFORCE_MIN_SESSIONS } = {}) {
  const sessionsById = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.kind !== "cite" && event.kind !== "recall") continue;
    const session = String(event.session ?? "unknown");
    for (const id of event.ids ?? []) {
      const set = sessionsById.get(id) ?? /* @__PURE__ */ new Set();
      set.add(session);
      sessionsById.set(id, set);
    }
  }
  const plans = [];
  for (const entry of entries) {
    const current = entry.status;
    if (!AUTO_PROMOTABLE_STATES.includes(current)) continue;
    const sessions = [...sessionsById.get(entry.id) ?? /* @__PURE__ */ new Set()];
    if (sessions.length < minSessions) continue;
    const to = current === "hypothesis" ? "observed" : "reinforced";
    plans.push({
      id: entry.id,
      path: entry.path,
      title: entry.title,
      from: current,
      to,
      sessions,
      reason: `${sessions.length} \u4E2A\u4E0D\u540C\u4F1A\u8BDD\u5F15\u7528\u8FC7\uFF08\u9608\u503C ${minSessions}\uFF09`
    });
  }
  return plans.sort((a, b) => b.sessions.length - a.sessions.length);
}
var VALID_STATUS = /* @__PURE__ */ new Set([
  "hypothesis",
  "observed",
  "reinforced",
  "confirmed",
  "rejected",
  "stale",
  "archived"
  // 下面两个是「记录流专用」的展示态，出现在记忆条目里也算历史遗留，一并纠正
]);
function guessLayer(relPath, body) {
  const name2 = relPath.split("/").pop() ?? "";
  if (/^index\.md$/i.test(name2)) return "l0";
  const lines = body.split("\n").length;
  const hasTable = /^\|.*\|$/m.test(body);
  if (hasTable && lines < 60) return "l1";
  return "l2";
}
function guessStatus(relPath, body) {
  const name2 = relPath.split("/").pop() ?? "";
  if (/^index\.md$/i.test(name2) || /^INBOX\.md$/i.test(name2)) return "confirmed";
  if (/待确认|待核实|推测|猜测/i.test(body)) return "hypothesis";
  return "confirmed";
}
function guessTitle(relPath, body) {
  const heading = /^#\s+(.+)$/m.exec(body);
  if (heading !== null && heading[1].trim() !== "") return heading[1].trim();
  return (relPath.split("/").pop() ?? relPath).replace(/\.md$/i, "");
}
function planRepair(entry, today) {
  const meta = entry.frontmatter;
  const hadFrontmatter = Object.keys(meta).length > 0;
  const patch = {};
  const reasons = [];
  const overwrite = [];
  const declaredId = typeof meta.id === "string" ? meta.id.trim() : "";
  if (declaredId === "") {
    patch.id = entry.id;
    reasons.push("\u8865 id\uFF08\u539F\u7531\u8DEF\u5F84\u6D3E\u751F\uFF0C\u91CD\u547D\u540D\u4F1A\u6362\u8EAB\u4EFD\uFF09");
  }
  if (typeof meta.title !== "string" || meta.title.trim() === "") {
    patch.title = guessTitle(entry.path, entry.body);
    reasons.push("\u8865 title");
  }
  if (typeof meta.layer !== "string" || !["l0", "l1", "l2"].includes(meta.layer)) {
    patch.layer = guessLayer(entry.path, entry.body);
    if (typeof meta.layer === "string" && meta.layer.trim() !== "") overwrite.push("layer");
    reasons.push(`\u8865 layer=${patch.layer}\uFF08\u5426\u5219\u9884\u7B97\u8D26\u672C\u4E09\u6BB5\u7EDF\u8BA1\u4E0D\u51FA\u6765\uFF09`);
  }
  const declaredStatus = typeof meta.status === "string" ? meta.status.trim() : "";
  if (declaredStatus === "" || !VALID_STATUS.has(declaredStatus)) {
    patch.status = guessStatus(entry.path, entry.body);
    if (declaredStatus !== "") overwrite.push("status");
    reasons.push(
      declaredStatus === "" ? `\u8865 status=${patch.status}\uFF08\u7F3A\u5931 \u2192 \u8BFB\u6210 active\uFF0C\u5F85\u4F60\u5904\u7406\u961F\u5217\u6C38\u8FDC\u7A7A\uFF09` : `\u7EA0\u6B63 status: ${declaredStatus} \u2192 ${patch.status}\uFF08${declaredStatus} \u4E0D\u5728\u5408\u6CD5\u679A\u4E3E\u5185\uFF09`
    );
  }
  if (typeof meta.updated !== "string" || meta.updated.trim() === "") {
    patch.updated = today;
    reasons.push("\u8865 updated\uFF08\u5426\u5219\u5230\u671F\u5224\u5B9A\u6CA1\u6709\u57FA\u51C6\uFF0C\u6C38\u8FDC\u4E0D\u63D0\u793A\u9000\u5F79\uFF09");
  }
  if (typeof meta.kind !== "string" || meta.kind.trim() === "") {
    patch.kind = "fact";
    reasons.push("\u8865 kind=fact");
  }
  if (Object.keys(patch).length === 0) return null;
  return { path: entry.path, title: entry.title, hadFrontmatter, patch, reasons, overwrite };
}
function planRepairs(entries, today) {
  const fixes = [];
  for (const entry of entries) {
    const fix = planRepair(entry, today);
    if (fix !== null) fixes.push(fix);
  }
  return { fixes, healthy: entries.length - fixes.length, total: entries.length };
}

// ../core/src/actions/errors.ts
function classifyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const text = message.trim();
  if (/不存在|已存在|找不到|被删除|ENOENT|no such file/i.test(text)) {
    return { kind: "not-found", hint: "\u8FD9\u6761\u53EF\u80FD\u5DF2\u88AB\u5220\u9664\u6216\u6539\u540D\uFF0C\u5237\u65B0\u5217\u8868\u518D\u770B\u3002" };
  }
  if (/非法状态迁移|不允许的迁移|不能从/.test(text)) {
    return {
      kind: "invalid-state",
      hint: "\u72B6\u6001\u673A\u53EA\u5141\u8BB8\u7279\u5B9A\u8DEF\u5F84\u3002\u4EBA\u53EF\u4EE5\u76F4\u63A5\u786E\u8BA4\u5019\u9009/\u89C2\u5BDF\u4E2D\uFF0C\u4F46\u4E0D\u80FD\u4ECE\u5DF2\u5F52\u6863\u76F4\u63A5\u8DF3\u56DE\u3002"
    };
  }
  if (/写锁超时|EBUSY|EEXIST|锁/.test(text)) {
    return { kind: "conflict", hint: "\u53E6\u4E00\u4E2A\u8FDB\u7A0B\u6B63\u5728\u5199\u540C\u4E00\u4E2A\u6587\u4EF6\uFF0C\u7B49\u4E00\u4E24\u79D2\u518D\u8BD5\u3002" };
  }
  if (/不能为空|不接受|越界|不是 INBOX|非法的行|类型非法/.test(text)) {
    return { kind: "invalid-input", hint: "\u8FD9\u662F\u5165\u53C2\u95EE\u9898\uFF0C\u4E0D\u662F\u6570\u636E\u635F\u574F\u3002\u6309\u63D0\u793A\u6539\u6B63\u540E\u91CD\u8BD5\u3002" };
  }
  if (/隐私|疑似密钥|密钥|私钥|身份证|内网 IP|拒写/.test(text)) {
    return { kind: "blocked", hint: "\u660E\u6587 Markdown \u4E0D\u80FD\u5B58\u5BC6\u94A5\u3002\u53EF\u4EE5\u7528\u8131\u654F\u7248\u672C\u91CD\u5B58\u3002" };
  }
  if (/_shared/.test(text)) {
    return { kind: "invalid-input", hint: "\u968F\u7248\u672C\u53D8\u5316\u7684\u77E5\u8BC6\u5FC5\u987B\u843D\u5230\u5177\u4F53\u5206\u652F\uFF0C\u4E0D\u80FD\u8FDB\u5171\u4EAB\u5C42\u3002" };
  }
  if (/EACCES|EPERM|EROFS|ENOSPC|EIO|磁盘|权限|写入失败|读取失败/.test(text)) {
    return { kind: "io", hint: "\u78C1\u76D8\u6216\u6743\u9650\u95EE\u9898\u3002\u5E93\u6587\u4EF6\u6CA1\u6709\u4E22\uFF0C\u91CD\u8BD5\u901A\u5E38\u53EF\u6062\u590D\u3002" };
  }
  return { kind: "unknown" };
}

// ../core/src/actions/read.ts
init_project();

// ../core/src/parse.ts
var FRONTMATTER_FENCE = "---";
var INBOX_HEADER = `| ${INBOX_COLUMNS.join(" | ")} |
|${INBOX_COLUMNS.map(() => "---").join("|")}|`;
function splitFrontmatter(source) {
  const text = String(source ?? "").replace(/\r\n/g, "\n");
  if (!text.startsWith(`${FRONTMATTER_FENCE}
`)) return { frontmatter: "", body: text };
  const end = text.indexOf(`
${FRONTMATTER_FENCE}`, FRONTMATTER_FENCE.length);
  if (end < 0) return { frontmatter: "", body: text };
  return {
    frontmatter: text.slice(FRONTMATTER_FENCE.length + 1, end),
    body: text.slice(end + FRONTMATTER_FENCE.length + 2)
  };
}
function unquote(value) {
  const text = String(value ?? "").trim();
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if (first === '"' && last === '"' || first === "'" && last === "'") {
      return text.slice(1, -1);
    }
  }
  return text;
}
function parseInlineArray(value) {
  const inner = value.trim().slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((item) => unquote(item)).filter((item) => item !== "");
}
var KEY_PREFIX = /^[A-Za-z_][\w-]*\s*:/;
function parseFrontmatter(raw) {
  const result = {};
  const lines = String(raw ?? "").split("\n");
  let currentKey = null;
  let currentItem = null;
  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const itemMatch = /^(\s*)-\s+(.*)$|^(\s*)-\s*$/.exec(line);
    if (itemMatch !== null && currentKey !== null) {
      const payload = (itemMatch[2] ?? "").trim();
      const isObjectItem = KEY_PREFIX.test(payload);
      const list = Array.isArray(result[currentKey]) ? result[currentKey] : [];
      if (isObjectItem) {
        const colon = payload.indexOf(":");
        const item = {
          [payload.slice(0, colon).trim()]: unquote(payload.slice(colon + 1))
        };
        list.push(item);
        result[currentKey] = list;
        currentItem = item;
      } else {
        list.push(unquote(payload));
        result[currentKey] = list;
        currentItem = null;
      }
      continue;
    }
    const continuation = /^(\s{2,})([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (continuation !== null && currentItem !== null && currentKey !== null) {
      currentItem[continuation[2]] = unquote(continuation[3]);
      continue;
    }
    const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const [, key, rawValue] = match;
    currentKey = key;
    currentItem = null;
    const value = rawValue.trim();
    if (value === "") {
      result[key] = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      result[key] = parseInlineArray(value);
    } else {
      result[key] = unquote(value);
    }
  }
  return result;
}
function serializeFrontmatter(frontmatter) {
  const lines = [FRONTMATTER_FENCE];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === void 0 || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every((item) => typeof item !== "object" || item === null)) {
        lines.push(`${key}: [${value.map((item) => String(item)).join(", ")}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item !== "object" || item === null) {
            lines.push(`  - ${String(item)}`);
            continue;
          }
          const entries = Object.entries(item).filter(([, v]) => v !== void 0);
          entries.forEach(([k, v], index) => {
            lines.push(index === 0 ? `  - ${k}: ${String(v)}` : `    ${k}: ${String(v)}`);
          });
        }
      }
      continue;
    }
    lines.push(`${key}: ${String(value)}`);
  }
  lines.push(FRONTMATTER_FENCE);
  return lines.join("\n");
}
function splitTableRow(line) {
  const text = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buffer = "";
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\\" && text[index + 1] === "|") {
      buffer += "|";
      index += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  cells.push(buffer.trim());
  return cells;
}
function parseInboxRow(line) {
  const text = String(line ?? "").trim();
  if (!text.startsWith("|")) return null;
  const cells = splitTableRow(text);
  if (cells.length !== INBOX_COLUMNS.length) return null;
  const [date, kind, content, state, destination] = cells;
  if (date === INBOX_COLUMNS[0] && kind === INBOX_COLUMNS[1]) return null;
  if (/^[-: ]+$/.test(date)) return null;
  return { date, kind, content, state, destination, raw: text };
}
function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}
function serializeInboxRow(entry) {
  return `| ${[
    escapeCell(entry.date),
    escapeCell(entry.kind),
    escapeCell(entry.content),
    escapeCell(entry.state),
    escapeCell(entry.destination ?? "\u2014")
  ].join(" | ")} |`;
}
function parseInbox(source, kinds, states) {
  const { frontmatter, body } = splitFrontmatter(source);
  const lines = body.split("\n");
  const entries = [];
  lines.forEach((line, index) => {
    const row = parseInboxRow(line);
    if (row === null) return;
    entries.push({
      ...row,
      kindValid: kinds.includes(row.kind),
      stateValid: states.includes(row.state),
      lineIndex: index
    });
  });
  return { frontmatter: parseFrontmatter(frontmatter), entries, lines, body };
}
function parseSections(body) {
  const sections = [];
  let current = { title: "", level: 0, lines: [] };
  for (const line of String(body ?? "").split("\n")) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading !== null) {
      if (current.lines.length > 0 || current.title !== "") sections.push(current);
      current = { title: heading[2].trim(), level: heading[1].length, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.length > 0 || current.title !== "") sections.push(current);
  return sections;
}

// ../core/src/actions/context.ts
async function guard(run) {
  try {
    return { ok: true, ...await run() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { kind, hint } = classifyError(error);
    return { ok: false, error: message, kind, hint };
  }
}
function projectEntry(entry, nowMs, citeCounts) {
  return {
    id: entry.id,
    path: entry.path,
    title: entry.title,
    domain: entry.domain,
    domainLabel: entry.domainLabel,
    project: entry.project,
    layer: entry.layer,
    status: entry.status,
    confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status] ?? null,
    kind: entry.kind,
    tags: entry.tags,
    tokens: entry.tokens,
    bytes: entry.bytes,
    lines: entry.lines,
    overLineLimit: entry.overLineLimit,
    pinned: entry.pinned,
    updatedAt: entry.updatedAt,
    origin: entry.origin,
    evidence: entry.evidence,
    anchor: entry.anchor,
    expiry: expiryOf(entry, nowMs),
    /** 被 cite 的次数（真正被用上的次数，不含 recall）。 */
    citeCount: citeCounts?.get(entry.id) ?? 0
  };
}

// ../core/src/actions/helpers.ts
function citeCountsOf(events) {
  const counts = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.kind !== "cite") continue;
    for (const id of event.ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
function projectLineageOf(scope) {
  return projectLineage(scope.project, scope.parents);
}
function excludedSummary(entries, scope) {
  const byProject = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (isEntryVisible(
      { project: entry.project, branch: entry.branch },
      { project: scope.project, branch: scope.branch, parents: scope.parents }
    )) continue;
    byProject.set(entry.project, (byProject.get(entry.project) ?? 0) + 1);
  }
  return [...byProject.entries()].map(([project, count]) => ({ project, count })).sort((a, b) => b.count - a.count);
}
function navOf(entries) {
  const byDir = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (entry.project === null) continue;
    const parts = entry.path.split("/");
    const branch = parts[2];
    const category = parts[3];
    if (branch === void 0) continue;
    const dir = category === void 0 || category.toLowerCase().endsWith(".md") ? branch.replace(/\.md$/i, "") : `${branch}/${category}`;
    const current = byDir.get(dir) ?? { count: 0, tokens: 0 };
    current.count += 1;
    current.tokens += entry.tokens;
    byDir.set(dir, current);
  }
  return [...byDir.entries()].map(([key, value]) => {
    const head = key.split("/")[0];
    const kind = head === "_shared" ? "shared" : /^v?\d+(\.\d+)+/i.test(head) || ["main", "master", "dev", "develop", "trunk", "release"].includes(head.toLowerCase()) ? "branch" : "root";
    return { path: key, count: value.count, tokens: value.tokens, kind };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

// ../core/src/actions/constants.ts
var SKILL_CATALOG_FRAME_TOKENS = 171;

// ../core/src/actions/read.ts
function createReadActions({ store, now }) {
  async function snapshot({ project, domain, cwd, branch } = {}) {
    return guard(async () => {
      const entries = await store.scan();
      const events = await store.readEvents();
      const misses = await store.readMisses();
      let resolution = null;
      let scope = null;
      let effectiveProject = project;
      if ((project === void 0 || project === null || project === "") && typeof cwd === "string" && cwd.trim() !== "") {
        const projects = projectAliasesOf(entries);
        scope = await resolveScope({ cwd, projects, entries });
        effectiveProject = scope.project;
        resolution = {
          project: scope.project,
          matchedAlias: null,
          matchedBy: scope.project === null ? null : "remote",
          cwd: scope.cwd,
          knownProjects: projects.map((item) => item.name),
          reason: scope.project === null ? scope.detail : ""
        };
        if (typeof branch === "string" && branch.trim() !== "") {
          scope = { ...scope, branch: branch.trim(), branchSource: null, reasons: scope.reasons.filter((r) => r !== "unknown_branch" && r !== "no_git" && r !== "detached_head") };
        }
      } else if (typeof branch === "string" && branch.trim() !== "") {
        scope = {
          project: project ?? null,
          branch: branch.trim(),
          branchSource: null,
          cwd: null,
          reasons: [],
          detail: "\u7531\u8C03\u7528\u65B9\u663E\u5F0F\u6307\u5B9A\u7684\u9879\u76EE\u4E0E\u5206\u652F",
          parents: projectParentsOf(entries)
        };
      }
      const projectFilter = effectiveProject;
      const filtered = entries.filter((entry) => {
        if (scope !== null) {
          if (!isEntryVisible(
            { project: entry.project, branch: entry.branch },
            { project: scope.project, branch: scope.branch, parents: scope.parents }
          )) return false;
        } else if (projectFilter !== void 0 && projectFilter !== null && projectFilter !== "" && entry.project !== projectFilter) {
          return false;
        }
        if (domain !== void 0 && domain !== null && domain !== "" && entry.domain !== domain) return false;
        return true;
      });
      const scoped = projectFilter !== void 0 && projectFilter !== null && projectFilter !== "" || domain !== void 0 && domain !== null && domain !== "";
      const stats = store.summarize(scoped ? filtered : entries, events, misses, { nowMs: now() });
      const citeCounts = citeCountsOf(events);
      const queue = filtered.filter((entry) => needsDecision(entry, now()) || entry.status === "stale").map((entry) => {
        const expiry = expiryOf(entry, now());
        const kind = entry.status === "stale" ? "anchor" : expiry.level === "retire" ? "retire" : "confirm";
        return {
          id: entry.id,
          path: entry.path,
          title: entry.title,
          domain: entry.domain,
          domainLabel: entry.domainLabel,
          status: entry.status,
          confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status] ?? null,
          kind,
          evidence: (entry.evidence ?? []).slice(0, 1),
          origin: entry.origin,
          days: expiry.days,
          reason: kind === "retire" ? `${expiry.days} \u5929\u672A\u88AB\u5F15\u7528` : kind === "anchor" ? "\u951A\u70B9\u5931\u6548\uFF0C\u5F85\u590D\u6838" : "\u63A8\u65AD\u5F85\u786E\u8BA4"
        };
      }).sort((a, b) => (b.days ?? 0) - (a.days ?? 0));
      return {
        root: store.root,
        projectScoped: projectFilter !== void 0 && projectFilter !== null && projectFilter !== "",
        project: projectFilter ?? null,
        domain: domain ?? null,
        /**
         * 解析诊断：`null` 表示调用方没给 cwd（不是解析失败）。
         * 给了 cwd 就必须能回答「凭什么」，否则界面只能猜。
         */
        resolution,
        /**
         * 作用域：当前会话到底看到哪些记忆，以及为什么。
         *
         * `inheritedFrom` 列出因父链而额外可见的项目（子模块读主仓），
         * `excluded` 列出被挡掉的项目及数量——**必须能说清挡住了什么**，
         * 否则「规则④生效了」与「数据丢了」在界面上长得一样。
         */
        scope: scope === null ? null : {
          project: scope.project,
          branch: scope.branch,
          branchSource: scope.branchSource,
          label: describeScope({ project: scope.project, branch: scope.branch }),
          /** 父链（含自身），按由近到远。 */
          lineage: scope.project === null ? [] : projectLineageOf(scope),
          /** 因继承而可见的祖先项目。 */
          inheritedFrom: scope.project === null ? [] : projectLineageOf(scope).slice(1),
          /** 被作用域挡掉的项目及条目数（诊断用，不参与检索）。 */
          excluded: excludedSummary(entries, scope),
          /** 失败原因码：有值说明这次判定不可靠，界面必须显式提示。 */
          reasons: scope.reasons,
          detail: scope.detail
        },
        /** 库里有记忆的项目全集，供「你可能想要哪个」提示。 */
        knownProjects: projectAliasesOf(entries).map((item) => item.name),
        entries: filtered.map((entry) => projectEntry(entry, now(), citeCounts)),
        stats,
        queue,
        /**
         * 统计口径：`all` = 全库；`scoped` = 仅当前 project/domain。
         * UI 据此说明「这个数字覆盖了什么」，避免与总览的全库数字混淆。
         */
        statsScope: scoped ? "scoped" : "all",
        /** 当前项目自己的常驻索引（layer: l0）文件，供「本项目」分区展示。 */
        projectIndex: filtered.filter((entry) => entry.layer === "l0").map((entry) => ({ path: entry.path, title: entry.title, tokens: entry.tokens })),
        /**
         * 导航：**从真实条目聚合，不读手写表格**。
         *
         * ## 为什么删掉 index.md 里的导航表
         *
         * 手写的目录表必然过时：`sz-web/index.md` 曾列着 `gslx/`、`dsh/`，
         * 而实际结构早已变成 `V2.1.25-dev/`、`_shared/`——每个字都是错的。
         * 过时的导航比没有导航更糟，因为它会被当成事实读。
         *
         * 这里直接从 `filtered` 条目聚合出「哪个目录有多少条」，
         * 结构与磁盘天然一致，零维护。
         */
        nav: navOf(filtered),
        generatedAt: new Date(now()).toISOString()
      };
    });
  }
  function residentBreakdown(entries, skills) {
    const indexItems = entries.filter((entry) => entry.layer === "l0").map((entry) => ({
      kind: "index",
      id: entry.id,
      path: entry.path,
      title: entry.title,
      tokens: entry.tokens,
      bytes: entry.bytes,
      lines: entry.lines,
      overLineLimit: entry.overLineLimit,
      // 索引是否真的进上下文，取决于它有没有被 skill 目录引用
      billed: false,
      note: "\u4EC5\u5728\u88AB read \u65F6\u8FDB\u4E0A\u4E0B\u6587"
    }));
    const catalogItems = skills.map((skill) => ({
      kind: "catalog",
      id: `skill.${skill.name}`,
      path: skill.path,
      title: skill.name,
      tokens: skill.descriptionTokens,
      bytes: skill.description.length,
      lines: 1,
      overLineLimit: false,
      billed: true,
      note: "skill description\uFF0C\u6BCF\u8BF7\u6C42\u4ED8\u8D39"
    }));
    const indexTokens = indexItems.reduce((sum, item) => sum + item.tokens, 0);
    const catalogTokens = catalogItems.reduce((sum, item) => sum + item.tokens, 0);
    return {
      items: [...catalogItems, ...indexItems],
      catalogTokens,
      indexTokens,
      frameTokens: SKILL_CATALOG_FRAME_TOKENS,
      /** 真正每请求付费的部分：catalog + 框架。 */
      billedTokens: catalogTokens + SKILL_CATALOG_FRAME_TOKENS,
      /** 标了 l0 但按需加载的部分。 */
      onDemandTokens: indexTokens
    };
  }
  async function overview({ skillDescriptions = [], skillsError = "" } = {}) {
    return guard(async () => {
      const entries = await store.scan();
      const events = await store.readEvents();
      const misses = await store.readMisses();
      const stats = store.summarize(entries, events, misses, { nowMs: now() });
      const l0 = stats.layers.l0.tokens;
      const resident = residentBreakdown(entries, skillDescriptions);
      return {
        kpi: {
          /**
           * **`residentTokens` 是每请求付费的常驻前缀，不是 L0 索引体积。**
           *
           * 这里曾经取 `l0`（所有 `layer: l0` 文件之和），于是顶栏第一格显示的
           * 是「索引层 286」，而卡片上挂的却是「361」这个基准——两个数字对不上，
           * 且按它去优化会去删索引表，一分钱每请求成本都省不下来。
           * 详见 product.md §十二：361 = catalog 190 + 框架 171；286 = 索引文件之和。
           */
          residentTokens: resident.billedTokens,
          /** 索引层体积单列一格，两个数字各自有名字，不再互相冒充。 */
          indexTokens: l0,
          residentBudget: RESIDENT_TOKEN_BUDGET,
          hitRate: stats.rates.hitRate,
          confirmRate: stats.rates.confirmRate,
          expireRate: stats.rates.expireRate,
          pending: stats.counts.pending
        },
        resident: {
          ...resident,
          /**
           * 三态，UI 必须区分：
           *   `ok`     有 catalog，数字可信
           *   `empty`  读到了但一个都没有（可能真是没装 skill）
           *   `error`  没读到（宿主没给服务 / list 抛错），此时 171 只是框架开销
           *
           * 不区分三态的话，「读不到」会伪装成「没有」，用户会以为 171 就是全部。
           */
          state: skillsError !== "" ? "error" : skillDescriptions.length === 0 ? "empty" : "ok",
          error: skillsError
        },
        /**
         * 预算账本 —— 三段各自的**付费方式**才是重点，不是数字本身。
         *
         * 这里曾经把 L0 的 `tokens` 填成 `l0` 文件之和（索引层 316），
         * 而 KPI 的「常驻前缀」是 billedTokens（每请求 171）。
         * 同一屏两个 L0 数字对不上，用户没法判断该信哪个、该优化哪个。
         *
         * 现在每段都带 `billing` 与 `advice`：说清「什么时候付费」和「超了该怎么办」。
         * 数字只有在能指导决策时才有价值。
         */
        budget: [
          {
            layer: "L0",
            name: "\u5E38\u9A7B\u524D\u7F00",
            tokens: resident.billedTokens,
            files: skillDescriptions.length,
            limit: RESIDENT_TOKEN_BUDGET,
            billing: "per-request",
            note: "skill description + \u76EE\u5F55\u6846\u67B6\uFF0C\u6BCF\u4E2A\u8BF7\u6C42\u90FD\u4ED8\u8D39",
            advice: "\u8D85\u4E86\u8981\u538B\u7F29 skill description\uFF08\u6539\u5B83\u624D\u4F1A\u7701\u6BCF\u8BF7\u6C42\u6210\u672C\uFF09"
          },
          {
            layer: "L1",
            name: "\u7D22\u5F15\u5C42",
            tokens: stats.layers.l1.tokens,
            files: stats.layers.l1.files,
            limit: 2048,
            billing: "on-demand",
            note: "\u88AB read \u65F6\u624D\u8FDB\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u5728\u6BCF\u8BF7\u6C42\u524D\u7F00\u91CC",
            advice: "\u8D85\u4E86\u62C6\u7D22\u5F15\u6587\u4EF6\uFF1B\u8FD9\u53EA\u5F71\u54CD\u68C0\u7D22\u5B9A\u4F4D\u7CBE\u5EA6\uFF0C\u4E0D\u5F71\u54CD\u6BCF\u8BF7\u6C42\u8D26\u5355"
          },
          {
            layer: "L2",
            name: "\u8BE6\u60C5\u5C42",
            tokens: stats.layers.l2.tokens,
            files: stats.layers.l2.files,
            limit: null,
            billing: "on-demand",
            note: "\u5355\u7BC7\u547D\u4E2D\u624D\u8BFB\uFF0C\u603B\u91CF\u5927\u4E0D\u76F4\u63A5\u7B49\u4E8E\u8D35",
            advice: "\u5173\u6CE8\u5355\u7BC7\u4F53\u79EF\uFF08\u8D85 80 \u884C / 1200 tokens\uFF09\uFF0C\u800C\u4E0D\u662F\u603B\u91CF"
          },
          {
            /** 汇总行：把「L0 索引文件之和」这个容易混淆的数字单独摆出来。 */
            layer: "L0*",
            name: "\u7D22\u5F15\u6587\u4EF6\u5408\u8BA1",
            tokens: l0,
            files: stats.layers.l0.files,
            limit: null,
            billing: "on-demand",
            note: "\u6807\u8BB0 layer: l0 \u7684\u6587\u4EF6\u4E4B\u548C\uFF0C\u4E0E\u300C\u5E38\u9A7B\u524D\u7F00\u300D\u4E0D\u662F\u540C\u4E00\u4E2A\u6570",
            advice: "\u8FD9\u4E2A\u6570\u5B57\u5927\u4E0D\u4EE3\u8868\u6BCF\u8BF7\u6C42\u8D35\uFF1B\u5220\u5B83\u4E0D\u4F1A\u7701\u6BCF\u8BF7\u6C42\u6210\u672C"
          }
        ],
        /**
         * 域统计**带明细**。
         *
         * 原来只给「sz-web 35 篇 / 63,030 tokens」——用户看到了数字却不知道是哪 35 篇，
         * 这个数字就无法验证、无法下钻、也就无法据此做任何事。
         * 所以每个域都带上自己的文件清单（按 tokens 降序，最重的排前面）。
         */
        domains: stats.domains.map((domain) => ({
          ...domain,
          entries: entries.filter((entry) => entry.domain === domain.key).sort((a, b) => b.tokens - a.tokens).map((entry) => ({
            id: entry.id,
            path: entry.path,
            title: entry.title,
            layer: entry.layer,
            status: entry.status,
            tokens: entry.tokens,
            lines: entry.lines,
            overLineLimit: entry.overLineLimit,
            citeCount: citeCountsOf(events).get(entry.id) ?? 0
          }))
        })),
        rates: stats.rates,
        counts: stats.counts,
        misses: stats.misses,
        files: stats.files,
        bytes: stats.bytes,
        tokens: stats.tokens,
        overLimit: stats.overLimit,
        cacheNote: "\u6539\u5E38\u9A7B\u524D\u7F00\u4F1A\u4F5C\u5E9F\u5F53\u524D\u4F1A\u8BDD KV cache\uFF08\u5B9E\u6D4B\u5355\u6B21 20\u201357 \u4E07 tokens\uFF09\uFF0C\u6512\u6279\u6539\u3002"
      };
    });
  }
  async function search({ query, project, cwd, branch, session = "plugin", record = true }) {
    return guard(async () => {
      const entries = await store.scan();
      let scope = null;
      if (typeof cwd === "string" && cwd.trim() !== "" || typeof branch === "string" && branch.trim() !== "") {
        const projects = projectAliasesOf(entries);
        const resolved = typeof cwd === "string" && cwd.trim() !== "" ? await resolveScope({ cwd, projects, entries }) : { project: project ?? null, branch: null, branchSource: null, cwd: null, reasons: [], detail: "", parents: projectParentsOf(entries) };
        scope = typeof branch === "string" && branch.trim() !== "" ? { ...resolved, branch: branch.trim() } : resolved;
      }
      const result = searchEntries(entries, query, { project, scope });
      if (record) {
        if (result.matched) {
          await store.recordCite({ ids: result.hits.map((hit) => hit.id), kind: "recall", session, query: result.query });
          await store.recordVerifyHit({ query: result.query });
        } else {
          await store.recordMiss({ query: result.query, session });
        }
      }
      return {
        query: result.query,
        matched: result.matched,
        hits: result.hits.slice(0, 20),
        total: result.hits.length,
        cost: searchCost(result.hits.slice(0, 20))
      };
    });
  }
  async function detail({ path: path5 }) {
    return guard(async () => {
      const entry = await store.readEntry(path5);
      const events = await store.readEvents();
      const refs = events.filter((event) => (event.ids ?? []).includes(entry.id));
      const cites = refs.filter((event) => event.kind === "cite");
      const lastCite = cites.length === 0 ? null : cites[cites.length - 1].at;
      return {
        entry: {
          ...projectEntry(entry, now()),
          overTokenLimit: entry.tokens > FILE_TOKEN_SOFT_LIMIT,
          body: entry.body
        },
        trust: {
          confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status] ?? null,
          evidenceCount: (entry.evidence ?? []).length,
          citeCount: cites.length,
          recallCount: refs.filter((event) => event.kind === "recall").length,
          lastCitedAt: lastCite,
          anchor: entry.anchor,
          anchorState: entry.status === "stale" ? "stale" : entry.anchor === null ? "none" : "fresh"
        },
        references: refs.slice(-20).reverse(),
        states: [...CONFIDENCE_STATES],
        sections: parseSections(entry.body).map((section) => ({
          title: section.title,
          level: section.level,
          lines: section.lines.length
        }))
      };
    });
  }
  return { snapshot, overview, search, detail };
}

// ../core/src/privacy.ts
var PATTERNS = [
  { label: "OpenAI/DeepSeek \u98CE\u683C\u5BC6\u94A5", re: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { label: "GitHub token", re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { label: "AWS Access Key", re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { label: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { label: "PEM \u79C1\u94A5", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{0,4096}?-----END [A-Z ]*PRIVATE KEY-----/g },
  { label: "\u4E2D\u56FD\u5927\u9646\u8EAB\u4EFD\u8BC1\u53F7", re: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g },
  { label: "\u5185\u7F51 IP", re: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g },
  { label: "\u53E3\u4EE4/\u4EE4\u724C\u8D4B\u503C", re: /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?([^\s"',;]{6,})/gi }
];
var MASK = "***";
function inspectText(text) {
  const source = String(text ?? "");
  const findings = [];
  let masked = source;
  for (const { label, re } of PATTERNS) {
    const pattern = new RegExp(re.source, re.flags);
    let match = pattern.exec(source);
    let count = 0;
    while (match !== null) {
      count += 1;
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
      match = pattern.exec(source);
    }
    if (count === 0) continue;
    findings.push({ label, count });
    masked = masked.replace(new RegExp(re.source, re.flags), (full) => {
      const assignment = /^([^:=]+[:=]\s*["']?)(.+)$/.exec(full);
      if (assignment !== null) return `${assignment[1]}${MASK}`;
      return MASK;
    });
  }
  return {
    blocked: findings.length > 0,
    findings,
    masked,
    reason: findings.length === 0 ? "" : `\u7591\u4F3C\u654F\u611F\u4FE1\u606F\uFF1A${findings.map((item) => `${item.label} \xD7${item.count}`).join("\u3001")}`
  };
}
function auditRecord(text, findings) {
  return {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    length: String(text ?? "").length,
    findings: findings.map((item) => item.label),
    // 只留首尾各 6 字，便于定位是哪一条，又不构成泄密
    preview: `${String(text).slice(0, 6)}\u2026${String(text).slice(-6)}`
  };
}

// ../core/src/actions/memory.ts
function createMemoryActions({ store, now }) {
  async function writeBody({ path: path5, body, session = "plugin" }) {
    const privacy = inspectText(body);
    if (privacy.blocked) {
      return {
        ok: false,
        kind: "blocked",
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(body, privacy.findings),
        hint: "\u6B63\u6587\u91CC\u6709\u7591\u4F3C\u5BC6\u94A5\uFF0C\u5DF2\u62D2\u5199\u3002\u6539\u5B8C\u518D\u5B58\uFF0C\u6216\u7528\u8131\u654F\u7248\u672C\u3002"
      };
    }
    return guard(async () => {
      const entry = await store.writeBody(path5, body);
      await store.appendEvent({ session, kind: "write", ids: [entry.id] });
      return { entry: { id: entry.id, path: entry.path, tokens: entry.tokens, lines: entry.lines } };
    });
  }
  async function setStatus({ path: path5, status, reason, session = "plugin" }) {
    if (!CONFIDENCE_STATES.includes(status)) {
      return {
        ok: false,
        kind: "invalid-state",
        error: `\u72B6\u6001\u5FC5\u987B\u662F ${CONFIDENCE_STATES.join(" / ")}`,
        hint: "\u8BB0\u5FC6\u72B6\u6001\u53EA\u80FD\u662F\u7F6E\u4FE1\u5EA6\u72B6\u6001\u673A\u91CC\u7684\u503C\u3002"
      };
    }
    if (status === "rejected" && String(reason ?? "").trim() === "") {
      return {
        ok: false,
        kind: "invalid-input",
        error: "\u9A73\u56DE\u5FC5\u987B\u5199\u4E00\u53E5\u7406\u7531\uFF0830 \u5929\u540E\u53EF\u590D\u67E5\uFF09",
        hint: "\u9A73\u56DE\u4F1A\u9759\u9ED8 30 \u5929\uFF0C\u6CA1\u6709\u7406\u7531\u5C31\u65E0\u6CD5\u5728\u590D\u6838\u65F6\u5224\u65AD\u5F53\u521D\u4E3A\u4EC0\u4E48\u5426\u6389\u5B83\u3002"
      };
    }
    return guard(async () => {
      const current = await store.readEntry(path5);
      if (!canHumanTransition(current.status, status)) {
        throw new Error(`\u975E\u6CD5\u72B6\u6001\u8FC1\u79FB\uFF1A${current.status} \u2192 ${status}`);
      }
      const patch = {
        status,
        confidence: STATE_CONFIDENCE[status] ?? current.confidence
      };
      if (status === "rejected") {
        patch.refuted_reason = String(reason).trim();
        patch.refuted_at = new Date(now()).toISOString();
      }
      if (status === "confirmed") patch.confirmed_at = new Date(now()).toISOString();
      const entry = await store.patchMeta(path5, patch);
      await store.appendEvent({
        session,
        kind: "status",
        ids: [entry.id],
        query: `${current.status} \u2192 ${status}`
      });
      return { entry: { id: entry.id, path: entry.path, status: entry.status } };
    });
  }
  async function confirm({ path: path5, session = "plugin" }) {
    return setStatus({ path: path5, status: "confirmed", session });
  }
  async function reject({ path: path5, reason, session = "plugin" }) {
    return setStatus({ path: path5, status: "rejected", reason, session });
  }
  async function undoReject({ path: path5, session = "plugin" }) {
    return setStatus({ path: path5, status: "reinforced", session });
  }
  async function archive({ path: path5, reason = "\u5230\u671F\u9000\u5F79", session = "plugin" }) {
    return guard(async () => {
      const result = await store.archiveEntry({ relPath: path5, reason });
      await store.appendEvent({ session, kind: "archive", ids: [path5] });
      return { archived: result };
    });
  }
  async function keep({ path: path5, session = "plugin" }) {
    return guard(async () => {
      const entry = await store.keepLonger({ relPath: path5 });
      await store.appendEvent({ session, kind: "keep", ids: [entry.id] });
      return { kept: { id: entry.id, path: entry.path, updatedAt: entry.updatedAt } };
    });
  }
  async function batchArchive({ paths = [], reason = "\u6279\u91CF\u9000\u5F79", session = "plugin" }) {
    const archived = [];
    const failed = [];
    for (const path5 of paths) {
      const result = await archive({ path: path5, reason, session });
      if (result.ok) archived.push(result.archived);
      else failed.push({ path: path5, error: result.error });
    }
    return { ok: true, archived, failed };
  }
  return {
    writeBody,
    setStatus,
    confirm,
    reject,
    undoReject,
    archive,
    keep,
    batchArchive
  };
}

// ../core/src/actions/inbox.ts
function createInboxActions({ store, now }) {
  async function inbox({ domain = "personal", state, kind } = {}) {
    return guard(async () => {
      const result = await store.readInbox(domain);
      let entries = result.entries.map((entry, index) => ({ ...entry, index }));
      if (typeof state === "string" && state !== "") entries = entries.filter((entry) => entry.state === state);
      if (typeof kind === "string" && kind !== "") entries = entries.filter((entry) => entry.kind === kind);
      const all = result.entries;
      return {
        path: result.path,
        exists: result.exists,
        entries,
        throughput: {
          total: all.length,
          open: all.filter((entry) => entry.state === "open").length,
          todo: all.filter((entry) => entry.state === "todo").length,
          done: all.filter((entry) => entry.state === "done").length,
          dropped: all.filter((entry) => entry.state === "dropped").length,
          toPromote: all.filter((entry) => entry.state === "done" && (entry.destination === "" || entry.destination === "\u2014")).length,
          invalidKind: all.filter((entry) => !entry.kindValid).length,
          invalidState: all.filter((entry) => !entry.stateValid).length
        },
        kinds: [...INBOX_KINDS],
        states: [...INBOX_STATES]
      };
    });
  }
  async function capture({ content, kind = "\u60F3\u6CD5", domain = "personal", session = "plugin" }) {
    const text = String(content ?? "").trim();
    if (text === "") {
      return {
        ok: false,
        kind: "invalid-input",
        error: "\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A",
        hint: "\u5199\u70B9\u5185\u5BB9\u518D\u5B58\u3002"
      };
    }
    if (!INBOX_KINDS.includes(kind)) {
      return {
        ok: false,
        kind: "invalid-input",
        error: `\u7C7B\u578B\u5FC5\u987B\u662F ${INBOX_KINDS.join(" / ")}`,
        hint: "\u4ECE\u8FD9\u4E94\u4E2A\u7C7B\u578B\u91CC\u9009\u4E00\u4E2A\u3002"
      };
    }
    const privacy = inspectText(text);
    if (privacy.blocked) {
      return {
        ok: false,
        kind: "blocked",
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(text, privacy.findings),
        hint: "\u547D\u4E2D\u9690\u79C1\u95F8\u95E8\uFF0C\u5DF2\u62D2\u5199\u3002\u53EF\u7528\u8131\u654F\u540E\u7684\u6587\u672C\u91CD\u5B58\u3002"
      };
    }
    return guard(async () => {
      const result = await store.appendInbox({ domain, kind, content: text });
      await store.appendEvent({ session, kind: "capture", query: text.slice(0, 80), ids: [] });
      return { captured: result, privacy: { blocked: false } };
    });
  }
  async function captureBatch({ text, kind = "\u60F3\u6CD5", domain = "personal", session = "plugin" }) {
    const lines = String(text ?? "").split(/\n|;/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      return {
        ok: false,
        kind: "invalid-input",
        error: "\u6CA1\u6709\u53EF\u6355\u83B7\u7684\u5185\u5BB9",
        hint: "\u8F93\u5165\u4E3A\u7A7A\uFF0C\u6CA1\u6709\u53EF\u5B58\u7684\u6761\u76EE\u3002"
      };
    }
    const accepted = [];
    const blocked = [];
    for (const line of lines) {
      const result = await capture({ content: line, kind, domain, session });
      if (result.ok) accepted.push(line);
      else blocked.push({ line, reason: result.reason ?? result.error ?? "\u672A\u77E5\u539F\u56E0" });
    }
    return { ok: true, accepted, blocked, total: lines.length };
  }
  async function updateInbox({ domain, lineIndex, patch = {}, session = "plugin" }) {
    return guard(async () => {
      if (typeof patch.state === "string" && !INBOX_STATES.includes(patch.state)) {
        throw new Error(`\u72B6\u6001\u5FC5\u987B\u662F ${INBOX_STATES.join(" / ")}`);
      }
      if (typeof patch.kind === "string" && !INBOX_KINDS.includes(patch.kind)) {
        throw new Error(`\u7C7B\u578B\u5FC5\u987B\u662F ${INBOX_KINDS.join(" / ")}`);
      }
      if (typeof patch.state === "string") {
        const before = await store.readInbox(domain);
        const current = before.entries.find((entry) => entry.lineIndex === lineIndex);
        const effectiveKind = typeof patch.kind === "string" ? patch.kind : current?.kind ?? "";
        if (effectiveKind !== "" && !isStateAllowed(effectiveKind, patch.state)) {
          const allowed = statesOfKind(effectiveKind);
          throw new Error(
            `\u300C${effectiveKind}\u300D\u4E0D\u652F\u6301\u72B6\u6001 ${patch.state}\uFF0C\u53EF\u7528\uFF1A${allowed.join(" / ")}` + (allowed.length < INBOX_STATES.length ? "\uFF08\u8BE5\u7C7B\u578B\u6CA1\u6709\u300C\u8FDB\u884C\u4E2D\u300D\u8FD9\u4E2A\u9636\u6BB5\uFF09" : "")
          );
        }
      }
      const result = await store.updateInboxRow({ domain, lineIndex, patch });
      if (patch.state === "todo" && result.row !== null) {
        await store.appendEvent({
          session,
          kind: "inbox-start",
          query: String(result.row.content ?? "").slice(0, 60)
        });
      }
      await store.appendEvent({
        session,
        kind: "inbox-update",
        query: String(result.row?.content ?? "").slice(0, 60)
      });
      return { updated: result };
    });
  }
  async function deleteInbox({ domain, lineIndexes = [], session = "plugin" }) {
    return guard(async () => {
      const result = await store.deleteInboxRows({ domain, lineIndexes });
      await store.appendEvent({ session, kind: "inbox-delete", query: `\u5220\u9664 ${result.removed} \u884C` });
      return { removed: result.removed, path: result.path };
    });
  }
  async function batchInboxState({ domain, lineIndexes = [], state, session = "plugin" }) {
    if (!INBOX_STATES.includes(state)) {
      return {
        ok: false,
        kind: "invalid-state",
        error: `\u72B6\u6001\u5FC5\u987B\u662F ${INBOX_STATES.join(" / ")}`,
        hint: "INBOX \u7684\u5408\u6CD5\u72B6\u6001\u662F open / todo / done / dropped\u3002"
      };
    }
    const updated = [];
    const failed = [];
    for (const lineIndex of [...lineIndexes].sort((a, b) => b - a)) {
      const result = await updateInbox({ domain, lineIndex, patch: { state }, session });
      if (result.ok) updated.push(lineIndex);
      else failed.push({ lineIndex, error: result.error });
    }
    return { ok: true, updated, failed };
  }
  async function promoteInbox({ domain, lineIndex, target, session = "plugin" }) {
    return guard(async () => {
      const result = await store.readInbox(domain);
      const row = result.entries.find((entry) => entry.lineIndex === lineIndex);
      if (row === void 0) throw new Error(`\u7B2C ${lineIndex + 1} \u884C\u4E0D\u662F INBOX \u6761\u76EE`);
      const date = new Date(now()).toISOString().slice(0, 10);
      const targetPath = String(target ?? "").trim() !== "" ? String(target).trim() : `personal/notes/INBOX-\u63D0\u5347-${date}.md`;
      const relPath = targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`;
      const body = `
# ${row.content}

> \u7531 INBOX \u4E8E ${date} \u63D0\u5347\u3002\u7C7B\u578B\uFF1A${row.kind}\u3002

${row.content}
`;
      let created;
      try {
        created = await store.createEntry({
          relPath,
          frontmatter: {
            title: truncate(row.content, 40),
            kind: "fact",
            layer: "l2",
            status: "confirmed",
            confidence: 0.9,
            origin: "G1",
            updated: date
          },
          body
        });
      } catch {
        const existing = await store.readEntry(relPath);
        created = await store.writeBody(
          relPath,
          `${existing.body.trimEnd()}

## ${date} \u63D0\u5347

${row.content}
`
        );
      }
      await store.updateInboxRow({ domain, lineIndex, patch: { state: "done", destination: relPath } });
      await store.appendEvent({
        session,
        kind: "promote",
        ids: [created.id],
        query: row.content.slice(0, 60)
      });
      return {
        promoted: { path: relPath, id: created.id },
        inbox: { lineIndex, state: "done", destination: relPath }
      };
    });
  }
  return {
    inbox,
    capture,
    captureBatch,
    updateInbox,
    deleteInbox,
    batchInboxState,
    promoteInbox
  };
}

// ../core/src/actions/misses.ts
function createMissActions({ store, now }) {
  async function misses({ sort = "frequency" } = {}) {
    return guard(async () => {
      const list = await store.readMisses();
      const pipeline = {
        observing: [],
        "should-fill": [],
        drafting: [],
        verifying: [],
        verified: []
      };
      const nowMs = now();
      for (const miss of list) {
        const state = miss.state ?? "observing";
        const bucket = pipeline[state] ?? pipeline.observing;
        const startedMs = Date.parse(miss.verifyAt ?? miss.stateAt ?? miss.lastAt ?? miss.at);
        const elapsedDays = Number.isFinite(startedMs) ? Math.floor((nowMs - startedMs) / 864e5) : null;
        bucket.push({
          query: miss.query,
          count: miss.count ?? 1,
          at: miss.at,
          lastAt: miss.lastAt ?? miss.at,
          state,
          drafts: miss.drafts ?? [],
          // 平均多花多少 token：一次未命中意味着模型多试一轮，按 120 tokens 估
          wastedTokens: (miss.count ?? 1) * 120,
          sessions: (miss.sessions ?? [miss.session]).length,
          hits: miss.hits ?? 0,
          remainingDays: state === "verifying" && elapsedDays !== null ? Math.max(0, MISS_VERIFY_DAYS - elapsedDays) : null,
          draftPath: miss.draftPath ?? null
        });
      }
      for (const bucket of Object.values(pipeline)) {
        if (sort === "recent") {
          bucket.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
        } else if (sort === "breadth") {
          bucket.sort((a, b) => b.sessions - a.sessions || b.count - a.count);
        } else {
          bucket.sort((a, b) => b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)));
        }
      }
      return {
        pipeline,
        /** 五态各自的条数，供 UI 顶部计数条直接消费（不必自己数）。 */
        counts: {
          observing: pipeline.observing.length,
          "should-fill": pipeline["should-fill"].length,
          drafting: pipeline.drafting.length,
          verifying: pipeline.verifying.length,
          verified: pipeline.verified.length
        },
        total: list.length,
        conversion: list.length === 0 ? null : pipeline.verified.length / list.length,
        verifyDays: MISS_VERIFY_DAYS,
        /** 阈值：问过几次算「该补了」。UI 上要能说清这个数字的来源。 */
        fillThreshold: 3,
        /** 当前排序口径，UI 用来回显选中的那一项。 */
        sort
      };
    });
  }
  async function missDraft({ query, type = "\u95EE\u9898", session = "plugin" }) {
    if (!INBOX_KINDS.includes(type)) {
      return {
        ok: false,
        kind: "invalid-input",
        error: `\u7C7B\u578B\u5FC5\u987B\u662F ${INBOX_KINDS.join(" / ")}`,
        hint: "\u8349\u7A3F\u7C7B\u578B\u5FC5\u987B\u4ECE\u4E94\u4E2A INBOX \u7C7B\u578B\u91CC\u9009\u3002"
      };
    }
    return guard(async () => {
      const updated = await store.updateMiss({ query, state: "drafting" });
      const draft = {
        query,
        type,
        title: truncate(query, 40),
        content: `\u5173\u4E8E\u300C${query}\u300D\u7684\u7ED3\u8BBA\uFF1A`,
        at: new Date(now()).toISOString()
      };
      await store.updateMiss({ query, draftId: `${query}@${draft.at}` });
      await store.appendEvent({ session, kind: "miss-draft", query });
      return { draft, miss: updated };
    });
  }
  async function missConfirm({ query, content, type = "\u95EE\u9898", domain = "personal", session = "plugin" }) {
    return guard(async () => {
      const text = String(content ?? "").trim();
      if (text === "") throw new Error("\u8349\u7A3F\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
      const privacy = inspectText(text);
      if (privacy.blocked) {
        return {
          ok: false,
          kind: "blocked",
          blocked: true,
          reason: privacy.reason,
          masked: privacy.masked,
          hint: "\u7ED3\u8BBA\u91CC\u6709\u7591\u4F3C\u5BC6\u94A5\uFF0C\u5DF2\u62D2\u5199\u3002\u6539\u5B8C\u518D\u5B58\u3002"
        };
      }
      const date = new Date(now()).toISOString().slice(0, 10);
      const slug = text.slice(0, 24).replace(/[^\w\u4e00-\u9fff-]+/g, "-");
      const relPath = `${domain}/misses/${date}-${slug}.md`;
      const entry = await store.createEntry({
        relPath,
        frontmatter: {
          title: truncate(query, 40),
          kind: "fact",
          layer: "l2",
          status: "observed",
          confidence: 0.5,
          origin: "G2",
          evidence: [{ session, excerpt: text.slice(0, 120), gate: "G2" }]
        },
        body: `
# ${query}

${text}
`
      });
      const updated = await store.updateMiss({
        query,
        state: "verifying",
        draftId: entry.id,
        draftPath: relPath
      });
      await store.appendEvent({ session, kind: "miss-confirm", ids: [entry.id], query });
      return {
        entry: { id: entry.id, path: relPath },
        miss: updated,
        verifyUntil: new Date(now() + MISS_VERIFY_DAYS * 864e5).toISOString(),
        draftType: type
      };
    });
  }
  async function missBatchDraft({ queries = [], type = "\u95EE\u9898", session = "plugin" }) {
    const drafts = [];
    const failed = [];
    for (const query of queries) {
      const result = await missDraft({ query, type, session });
      if (result.ok) drafts.push(result.draft);
      else failed.push({ query, error: result.error });
    }
    return { ok: true, drafts, failed };
  }
  async function missDelete({ query }) {
    return guard(async () => ({ removed: await store.deleteMiss(query) }));
  }
  return { misses, missDraft, missConfirm, missBatchDraft, missDelete };
}

// ../core/src/actions.ts
async function guard2(run) {
  try {
    return { ok: true, ...await run() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { kind, hint } = classifyError(error);
    return { ok: false, error: message, kind, hint };
  }
}
function createActions({ store, now = () => Date.now(), readExternal }) {
  const ctx = { store, now: () => now() };
  const readActions = createReadActions(ctx);
  const memoryActions = createMemoryActions(ctx);
  const inboxActions = createInboxActions(ctx);
  const missActions = createMissActions(ctx);
  async function exportData({ format = "markdown", domain } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const scoped = domain === void 0 || domain === null || domain === "" ? entries : entries.filter((entry) => entry.domain === domain);
      const stamp = new Date(now()).toISOString().slice(0, 10);
      if (format === "json") {
        return {
          filename: `memory-ops-${domain ?? "all"}-${stamp}.json`,
          content: JSON.stringify(scoped.map((entry) => ({
            id: entry.id,
            path: entry.path,
            domain: entry.domain,
            title: entry.title,
            layer: entry.layer,
            status: entry.status,
            confidence: entry.confidence,
            tags: entry.tags,
            updatedAt: entry.updatedAt,
            tokens: entry.tokens,
            evidence: entry.evidence,
            body: entry.body
          })), null, 2),
          count: scoped.length
        };
      }
      const parts = [`# \u8BB0\u5FC6\u5E93\u5BFC\u51FA \xB7 ${stamp}`, "", `\u5171 ${scoped.length} \u6761\uFF0C\u57DF\uFF1A${domain ?? "\u5168\u90E8"}`, ""];
      for (const entry of scoped) {
        parts.push(
          `## ${entry.title}`,
          "",
          `- \u8DEF\u5F84\uFF1A${entry.path}`,
          `- \u57DF\uFF1A${entry.domainLabel}`,
          `- \u5C42\uFF1A${entry.layer}`,
          `- \u72B6\u6001\uFF1A${entry.status}`,
          `- tokens\uFF1A${entry.tokens}`,
          "",
          entry.body.trim(),
          ""
        );
      }
      return {
        filename: `memory-ops-${domain ?? "all"}-${stamp}.md`,
        content: parts.join("\n"),
        count: scoped.length
      };
    });
  }
  async function sessionMemory({ query, project, sessionId, cwd } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      let resolution = null;
      let projectFilter = project;
      if ((project === void 0 || project === null || project === "") && typeof cwd === "string" && cwd.trim() !== "") {
        resolution = resolveProject(cwd, projectAliasesOf(entries));
        projectFilter = resolution.project;
      }
      const events = sessionId === void 0 || sessionId === "" ? await store.readEventsTail(200) : (await store.readEvents()).filter((event) => event.session === sessionId);
      const recent = events.slice(-200);
      const injectedEvents = recent.filter((event) => event.kind === "recall");
      const citedEvents = recent.filter((event) => event.kind === "cite");
      const missesRecent = recent.filter((event) => event.kind === "miss");
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      const reasons = [];
      for (const event of [...recent].reverse()) {
        if (event.kind !== "recall") continue;
        const terms = String(event.query ?? "").split(/\s+/).filter(Boolean);
        for (const id of event.ids ?? []) {
          if (reasons.some((reason) => reason.id === id)) continue;
          const entry = byId.get(id);
          if (entry === void 0) continue;
          reasons.push({
            id,
            title: entry.title,
            why: terms.length === 0 ? "\u68C0\u7D22\u547D\u4E2D\uFF08\u65E0\u5173\u952E\u8BCD\u8BB0\u5F55\uFF09" : `\u5173\u952E\u8BCD\u547D\u4E2D\uFF1A${terms.join(" ")}`,
            anchor: entry.anchor,
            /** 锚点状态：让「为什么注入」能说清是命中了内容还是命中了失效锚点。 */
            anchorState: entry.status === "stale" ? "stale" : entry.anchor === null ? "none" : "fresh",
            tokens: entry.tokens,
            at: event.at
          });
          if (reasons.length >= 5) break;
        }
        if (reasons.length >= 5) break;
      }
      if (reasons.length === 0 && typeof query === "string" && query.trim() !== "") {
        const result = searchEntries(entries, query, { project: projectFilter });
        for (const hit of result.hits.slice(0, 5)) {
          const matched = entries.find((entry) => entry.id === hit.id);
          reasons.push({
            id: hit.id,
            title: hit.title,
            why: `\u5173\u952E\u8BCD\u547D\u4E2D\uFF1A${result.terms.join(" ")}`,
            anchor: matched?.anchor ?? null,
            anchorState: matched?.status === "stale" ? "stale" : matched?.anchor === null || matched?.anchor === void 0 ? "none" : "fresh",
            tokens: hit.tokens,
            at: ""
          });
        }
      }
      return {
        sessionId: sessionId ?? null,
        project: projectFilter ?? null,
        resolution,
        injected: injectedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        recalled: injectedEvents.length,
        cited: citedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        missed: missesRecent.length,
        reasons,
        recentInjected: injectedEvents.slice(-10),
        recentCites: citedEvents.slice(-10),
        recentMisses: missesRecent.slice(-10)
      };
    });
  }
  async function health() {
    return guard2(async () => {
      const entries = await store.scan();
      const events = await store.readEvents();
      const misses2 = await store.readMisses();
      const stats = store.summarize(entries, events, misses2, { nowMs: now() });
      const silenced = entries.filter((entry) => {
        if (entry.status !== "rejected") return false;
        const at = Date.parse(entry.refutedAt ?? "");
        return Number.isFinite(at) && now() - at < 30 * 864e5;
      });
      return {
        rates: stats.rates,
        counts: stats.counts,
        overLimit: stats.overLimit,
        silenced: silenced.map((entry) => ({ id: entry.id, path: entry.path, title: entry.title })),
        stale: entries.filter((entry) => expiryOf(entry, now()).level !== "fresh").map((entry) => ({ id: entry.id, path: entry.path, title: entry.title, ...expiryOf(entry, now()) })),
        lineLimit: FILE_LINE_LIMIT,
        tokenSoftLimit: FILE_TOKEN_SOFT_LIMIT
      };
    });
  }
  async function verifyAnchorJob({ baseDir = "", apply: apply2 = false, session = "plugin" } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const reader = readExternal ?? (async () => null);
      const report = await verifyAnchors(entries, reader, { baseDir });
      const changed = [];
      const failed = [];
      if (apply2) {
        for (const check of report.checks) {
          if (check.state !== "stale" && check.state !== "missing") continue;
          const entry = entries.find((item) => item.path === check.path);
          if (entry === void 0) continue;
          if (entry.status === "stale") continue;
          if (!canTransition(entry.status, "stale")) {
            failed.push({ path: check.path, error: `${entry.status} \u4E0D\u80FD\u8FC1\u5230 stale` });
            continue;
          }
          try {
            const updated = await store.patchMeta(check.path, {
              status: "stale",
              anchor_checked_at: new Date(now()).toISOString(),
              anchor_state: check.state
            });
            changed.push({ path: updated.path, from: entry.status, to: "stale" });
          } catch (error) {
            failed.push({ path: check.path, error: error instanceof Error ? error.message : String(error) });
          }
        }
        await store.appendEvent({
          session,
          kind: "anchor-verify",
          query: `stale ${report.summary.stale} \xB7 missing ${report.summary.missing}`
        });
      }
      return { ...report, applied: apply2, changed, failed };
    });
  }
  async function compact({ paths = [], apply: apply2 = false, session = "plugin" } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const targets = paths.length > 0 ? entries.filter((entry) => paths.includes(entry.path)) : entries.filter((entry) => needsCompact(entry));
      const previews = targets.map((entry) => {
        const result = compactBody(entry.body);
        return {
          path: entry.path,
          title: entry.title,
          /**
           * 行数一律用**正文口径**（`compactBody.before`），不用 `entry.lines`。
           *
           * `entry.lines` 是整个文件（含 frontmatter + 结尾换行），而
           * `result.removed` 只统计正文。两者混用会让「7 行 → 3 行」看起来
           * 像删掉了 4 行正文——实际一行正文都没删。同一个界面里的数字必须同口径。
           */
          before: result.before,
          after: result.after,
          removed: result.removed,
          changes: result.changes,
          /**
           * 压缩后是否仍超限。
           *
           * 必须用**同一口径**：`before`/`after` 都是正文行数，这里不能用
           * `entry.lines`（含 frontmatter）去减正文口径的 `removed`——
           * 那会算出比实际小 5~10 行的假象，让「压缩后合规了」的判断提前成立。
           */
          stillOverLimit: result.after + (entry.lines - result.before) > FILE_LINE_LIMIT,
          splitSuggestions: result.splitSuggestions
        };
      });
      const written = [];
      const failed = [];
      if (apply2) {
        for (const entry of targets) {
          const result = compactBody(entry.body);
          if (result.removed <= 0) continue;
          try {
            await store.writeBody(entry.path, result.body);
            written.push({ path: entry.path, removed: result.removed });
          } catch (error) {
            failed.push({ path: entry.path, error: error instanceof Error ? error.message : String(error) });
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: "compact",
            query: `${written.length} \u7BC7\uFF0C\u53BB ${written.reduce((sum, item) => sum + item.removed, 0)} \u884C`
          });
        }
      }
      return {
        candidates: previews,
        total: previews.length,
        /** 只做无损压缩，节省通常有限；这里如实报出来，避免让人误以为一键就合规。 */
        removableLines: previews.reduce((sum, item) => sum + item.removed, 0),
        applied: apply2,
        written,
        failed,
        lineLimit: FILE_LINE_LIMIT
      };
    });
  }
  async function review({ days = 7 } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const events = await store.readEvents();
      const misses2 = await store.readMisses();
      return weeklyReview(entries, events, misses2, { nowMs: now(), days });
    });
  }
  async function promote({ apply: apply2 = false, session = "plugin" } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const events = await store.readEvents();
      const plans = planPromotions(entries, events);
      const changed = [];
      const failed = [];
      if (apply2) {
        for (const plan of plans) {
          if (!canTransition(plan.from, plan.to)) {
            failed.push({ path: plan.path, error: `${plan.from} \u4E0D\u80FD\u8FC1\u5230 ${plan.to}` });
            continue;
          }
          try {
            await store.patchMeta(plan.path, {
              status: plan.to,
              confidence: STATE_CONFIDENCE[plan.to],
              promoted_at: new Date(now()).toISOString()
            });
            changed.push({ path: plan.path, from: plan.from, to: plan.to });
          } catch (error) {
            failed.push({ path: plan.path, error: error instanceof Error ? error.message : String(error) });
          }
        }
        if (changed.length > 0) {
          await store.appendEvent({ session, kind: "promote-auto", query: `${changed.length} \u6761` });
        }
      }
      return { plans, applied: apply2, changed, failed, minSessions: REINFORCE_MIN_SESSIONS };
    });
  }
  async function repairMeta({ apply: apply2 = false, paths = [], session = "plugin" } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const today = new Date(now()).toISOString().slice(0, 10);
      const plan = planRepairs(entries, today);
      const targets = paths.length === 0 ? plan.fixes : plan.fixes.filter((fix) => paths.includes(fix.path));
      const written = [];
      const failed = [];
      if (apply2) {
        for (const fix of targets) {
          try {
            await store.mergeMeta(fix.path, fix.patch, { overwrite: fix.overwrite });
            written.push({ path: fix.path, fields: Object.keys(fix.patch) });
          } catch (error) {
            failed.push({ path: fix.path, error: error instanceof Error ? error.message : String(error) });
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: "repair-meta",
            query: `${written.length} \u7BC7`
          });
        }
      }
      return {
        fixes: targets,
        healthy: plan.healthy,
        total: plan.total,
        applied: apply2,
        written,
        failed
      };
    });
  }
  async function index({ domain } = {}) {
    return guard2(async () => {
      const entries = await store.scan();
      const scoped = domain === void 0 || domain === null || domain === "" ? entries : entries.filter((entry) => entry.domain === domain);
      const rows = scoped.filter((entry) => entry.layer === "l0" || entry.layer === "l1" || entry.path.endsWith("index.md")).map((entry) => ({
        path: entry.path,
        title: entry.title,
        domain: entry.domain,
        layer: entry.layer,
        tokens: entry.tokens
      }));
      return {
        rows,
        residentTokens: scoped.filter((entry) => entry.layer === "l0").reduce((sum, entry) => sum + entry.tokens, 0)
      };
    });
  }
  const {
    inbox,
    capture,
    captureBatch,
    updateInbox,
    deleteInbox,
    batchInboxState,
    promoteInbox
  } = inboxActions;
  const {
    writeBody,
    setStatus,
    confirm,
    reject,
    undoReject,
    archive,
    keep,
    batchArchive
  } = memoryActions;
  const {
    misses,
    missDraft,
    missConfirm,
    missBatchDraft,
    missDelete
  } = missActions;
  const { snapshot, overview, search, detail } = readActions;
  return {
    snapshot,
    overview,
    inbox,
    capture,
    captureBatch,
    updateInbox,
    deleteInbox,
    batchInboxState,
    promoteInbox,
    search,
    detail,
    writeBody,
    setStatus,
    confirm,
    reject,
    undoReject,
    archive,
    keep,
    batchArchive,
    misses,
    missDraft,
    missConfirm,
    missBatchDraft,
    missDelete,
    export: exportData,
    sessionMemory,
    health,
    index,
    verifyAnchor: verifyAnchorJob,
    compact,
    review,
    promote,
    repairMeta,
    store
  };
}

// ../core/src/store.ts
import fs from "node:fs";
import fsp2 from "node:fs/promises";
import path3 from "node:path";

// ../core/src/store/paths.ts
import os from "node:os";
import path from "node:path";
var SKIP_NAMES = /* @__PURE__ */ new Set([".DS_Store", ".gitignore", "README.md"]);
var STATE_DIR = ".state";
var ARCHIVE_DIR = "archive";
function defaultRoot() {
  const configured = process.env.MEMORY_OPS_ROOT;
  if (typeof configured === "string" && configured.trim() !== "") return configured.trim();
  return path.join(os.homedir(), ".memory-ops");
}
function identityOf(relPath, frontmatter) {
  const declared = frontmatter?.id;
  if (typeof declared === "string" && declared.trim() !== "") return declared.trim();
  return relPath.replace(/\.md$/i, "").replace(/\//g, ".");
}
function domainLabelOf(relPath) {
  const parts = relPath.split("/");
  if (parts[0] === "personal") return "\u4E2A\u4EBA\u57DF";
  if (parts[0] === "work" && parts[1] !== void 0) return `\u5DE5\u4F5C\u57DF \xB7 ${parts[1]}`;
  return parts[0] ?? "\u672A\u77E5\u57DF";
}
function domainKeyOf(relPath) {
  const parts = relPath.split("/");
  if (parts[0] === "personal") return "personal";
  if (parts[0] === "work" && parts[1] !== void 0) return `work/${parts[1]}`;
  return parts[0] ?? "unknown";
}
function projectOf(relPath) {
  const parts = relPath.split("/");
  return parts[0] === "work" && parts[1] !== void 0 ? parts[1] : null;
}
function branchOfEntry(pathBranch, declared) {
  if (pathBranch !== null && pathBranch !== "") return pathBranch;
  const text = typeof declared === "string" ? declared.trim() : "";
  if (text === "") return null;
  if (/[/,、]/.test(text)) return null;
  return text;
}
function safeRelPath(input) {
  const value = String(input ?? "").replace(/\\/g, "/").trim();
  if (value === "") throw new Error("\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A");
  if (value.startsWith("/")) throw new Error("\u4E0D\u63A5\u53D7\u7EDD\u5BF9\u8DEF\u5F84");
  if (value.split("/").includes("..")) throw new Error("\u4E0D\u63A5\u53D7\u4E0A\u7EA7\u76EE\u5F55\u7A7F\u8D8A");
  return value.replace(/^\.\//, "");
}
function normalizeAnchor(raw) {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "object" || first === null) return null;
  const record = first;
  const shaped = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === void 0 || value === null) continue;
    shaped[key] = String(value);
  }
  return Object.keys(shaped).length === 0 ? null : shaped;
}

// ../core/src/store/io.ts
import fsp from "node:fs/promises";
import path2 from "node:path";
async function atomicWrite(target, content) {
  const dir = path2.dirname(target);
  await fsp.mkdir(dir, { recursive: true });
  const tmp = path2.join(dir, `.${path2.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  await fsp.writeFile(tmp, content, "utf8");
  await fsp.rename(tmp, target);
}
async function withLock(target, run, { timeoutMs = 3e3 } = {}) {
  const lockPath = `${target}.lock`;
  await fsp.mkdir(path2.dirname(lockPath), { recursive: true });
  const started = Date.now();
  let handle = null;
  while (handle === null) {
    try {
      handle = await fsp.open(lockPath, "wx");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const stat = await fsp.stat(lockPath);
        if (Date.now() - stat.mtimeMs > timeoutMs) {
          await fsp.unlink(lockPath).catch(() => {
          });
          continue;
        }
      } catch {
      }
      if (Date.now() - started > timeoutMs) throw new Error(`\u5199\u9501\u8D85\u65F6\uFF1A${lockPath}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    await handle.writeFile(String(process.pid));
    return await run();
  } finally {
    await handle.close().catch(() => {
    });
    await fsp.unlink(lockPath).catch(() => {
    });
  }
}
async function listMarkdown(root, relative = "") {
  const absolute = path2.join(root, relative);
  let entries;
  try {
    entries = await fsp.readdir(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (SKIP_NAMES.has(entry.name)) continue;
    if (relative === "" && (entry.name === STATE_DIR || entry.name === ARCHIVE_DIR)) continue;
    const nextRelative = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...await listMarkdown(root, nextRelative));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith(".md")) continue;
    found.push(nextRelative);
  }
  return found;
}

// ../core/src/store/stats.ts
function summarize(entries, events, misses, { nowMs }, expiryOf2) {
  const byDomain = /* @__PURE__ */ new Map();
  let bytes = 0;
  let tokens = 0;
  let overLimit = 0;
  for (const entry of entries) {
    bytes += entry.bytes;
    tokens += entry.tokens;
    if (entry.overLineLimit) overLimit += 1;
    const bucket = byDomain.get(entry.domain) ?? {
      key: entry.domain,
      label: entry.domainLabel,
      files: 0,
      bytes: 0,
      tokens: 0,
      overLimit: 0
    };
    bucket.files += 1;
    bucket.bytes += entry.bytes;
    bucket.tokens += entry.tokens;
    if (entry.overLineLimit) bucket.overLimit += 1;
    byDomain.set(entry.domain, bucket);
  }
  const layers = {
    l0: { files: 0, tokens: 0 },
    l1: { files: 0, tokens: 0 },
    l2: { files: 0, tokens: 0 }
  };
  for (const entry of entries) {
    const key = String(entry.layer).toLowerCase();
    if (key === "l0" || key === "l1" || key === "l2") {
      layers[key].files += 1;
      layers[key].tokens += entry.tokens;
    }
  }
  const windowStart = nowMs - 30 * 864e5;
  const recent = events.filter((event) => {
    const at = Date.parse(event.at ?? "");
    return Number.isFinite(at) && at >= windowStart;
  });
  const recallEvents = recent.filter((event) => event.kind === "recall");
  const citedIds = /* @__PURE__ */ new Set();
  for (const event of recent) {
    if (event.kind !== "cite") continue;
    for (const id of event.ids ?? []) citedIds.add(id);
  }
  const recalledIds = /* @__PURE__ */ new Set();
  for (const event of recallEvents) {
    for (const id of event.ids ?? []) recalledIds.add(id);
  }
  const hitRate = recalledIds.size === 0 ? null : Math.min(1, citedIds.size / recalledIds.size);
  const confirmed = entries.filter((entry) => entry.status === "confirmed").length;
  const rejected = entries.filter((entry) => entry.status === "rejected").length;
  const confirmRate = confirmed + rejected === 0 ? null : confirmed / (confirmed + rejected);
  const staleOrArchived = entries.filter(
    (entry) => entry.status === "stale" || entry.status === "archived"
  ).length;
  const expireRate = entries.length === 0 ? null : staleOrArchived / entries.length;
  const missTotal = misses.length;
  const missVerified = misses.filter((miss) => miss.state === "verified").length;
  const missRate = missTotal === 0 ? null : missVerified / missTotal;
  return {
    files: entries.length,
    bytes,
    tokens,
    overLimit,
    /** 按文件数降序（不是 tokens）——保持原口径。 */
    domains: [...byDomain.values()].sort((a, b) => b.files - a.files),
    layers,
    rates: { hitRate, confirmRate, expireRate, missRate },
    misses: { total: missTotal, verified: missVerified },
    counts: {
      pending: entries.filter((entry) => entry.status === "hypothesis" || entry.status === "observed").length,
      confirmed,
      rejected,
      stale: entries.filter((entry) => entry.status === "stale").length,
      archived: entries.filter((entry) => entry.status === "archived").length
    },
    expiry: entries.map((entry) => ({ id: entry.id, ...expiryOf2(entry, nowMs) }))
  };
}

// ../core/src/store.ts
function createStore({ root, now = () => Date.now() } = {}) {
  const base = path3.resolve(root ?? defaultRoot());
  const stateDir = path3.join(base, STATE_DIR);
  const eventsPath = path3.join(stateDir, "events.jsonl");
  const missesPath = path3.join(stateDir, "misses.json");
  let scanCount = 0;
  function getScanCount() {
    return scanCount;
  }
  function resetScanCount() {
    scanCount = 0;
  }
  const absoluteOf = (relPath) => path3.join(base, safeRelPath(relPath));
  async function ensureLayout() {
    await fsp2.mkdir(stateDir, { recursive: true });
    await fsp2.mkdir(path3.join(base, "personal"), { recursive: true });
    await fsp2.mkdir(path3.join(base, "work"), { recursive: true });
    await fsp2.mkdir(path3.join(base, ARCHIVE_DIR), { recursive: true });
  }
  async function readEntry(relPath, declaredBranches) {
    const absolute = absoluteOf(relPath);
    const stat = await fsp2.stat(absolute);
    const source = await fsp2.readFile(absolute, "utf8");
    const { frontmatter, body } = splitFrontmatter(source);
    const meta = parseFrontmatter(frontmatter);
    const lineCount = source.split("\n").length;
    const evidence = Array.isArray(meta.evidence) ? meta.evidence.filter((item) => typeof item === "object" && item !== null) : [];
    const anchor = normalizeAnchor(meta.anchor);
    const pathScope = scopeOfPath(relPath, declaredBranches);
    return {
      path: relPath,
      id: identityOf(relPath, meta),
      domain: domainKeyOf(relPath),
      domainLabel: domainLabelOf(relPath),
      project: pathScope.project,
      branch: branchOfEntry(pathScope.branch, meta.branch),
      unscoped: isUnscopedEntry(relPath, declaredBranches),
      title: orEmpty(meta.title ?? path3.basename(relPath, ".md")),
      kind: orEmpty(meta.kind),
      scope: orEmpty(meta.scope),
      layer: orEmpty(meta.layer),
      status: typeof meta.status === "string" ? meta.status : "active",
      confidence: typeof meta.confidence === "number" ? meta.confidence : typeof meta.confidence === "string" && meta.confidence !== "" ? Number(meta.confidence) : null,
      pinned: meta.pinned === true || meta.pinned === "true",
      updatedAt: orEmpty(meta.updated),
      createdAt: orEmpty(meta.created),
      lastCitedAt: typeof meta.last_cited === "string" ? meta.last_cited : void 0,
      refutedAt: typeof meta.refuted_at === "string" ? meta.refuted_at : void 0,
      tags: Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === "string") : [],
      evidence,
      anchor,
      supersededBy: orEmpty(meta.superseded_by),
      refutedReason: orEmpty(meta.refuted_reason),
      origin: orEmpty(meta.origin),
      bytes: stat.size,
      tokens: estimateTokens(source),
      lines: lineCount,
      overLineLimit: lineCount > FILE_LINE_LIMIT,
      frontmatter: meta,
      body,
      source,
      mtime: stat.mtimeMs
    };
  }
  async function scan() {
    scanCount += 1;
    const files = await listMarkdown(base);
    const declared = /* @__PURE__ */ new Map();
    for (const relPath of files) {
      const parts = relPath.split("/");
      if (parts[0] !== "work" || parts.length !== 3) continue;
      if (parts[2].toLowerCase() !== "index.md") continue;
      try {
        const { frontmatter } = splitFrontmatter(await fsp2.readFile(absoluteOf(relPath), "utf8"));
        const meta = parseFrontmatter(frontmatter);
        const branches = Array.isArray(meta.branches) ? meta.branches.map((item) => String(item).trim()).filter((item) => item !== "") : [];
        if (branches.length > 0) declared.set(parts[1], branches);
      } catch {
      }
    }
    const loaded = await Promise.all(files.map(async (relPath) => {
      try {
        const project = projectOf(relPath);
        return await readEntry(relPath, project === null ? void 0 : declared.get(project));
      } catch {
        return null;
      }
    }));
    const entries = loaded.filter((entry) => entry !== null);
    entries.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
    return entries;
  }
  async function readEvents() {
    let raw = "";
    try {
      raw = await fsp2.readFile(eventsPath, "utf8");
    } catch {
      return [];
    }
    return parseEventLines(raw);
  }
  async function readEventsTail(count) {
    if (count <= 0) return [];
    let handle = null;
    try {
      handle = await fsp2.open(eventsPath, "r");
      const size = (await handle.stat()).size;
      if (size === 0) return [];
      const BLOCK = 64 * 1024;
      let position = size;
      let text = "";
      let newlines = 0;
      while (position > 0 && newlines <= count) {
        const want = Math.min(BLOCK, position);
        position -= want;
        const buf = Buffer.allocUnsafe(want);
        const { bytesRead } = await handle.read(buf, 0, want, position);
        text = buf.subarray(0, bytesRead).toString("utf8") + text;
        newlines = 0;
        for (let i = 0; i < text.length; i += 1) {
          if (text[i] === "\n") newlines += 1;
        }
      }
      const lines = text.split("\n");
      const atFileStart = position === 0;
      const usable = atFileStart ? lines : lines.slice(1);
      const nonEmpty = usable.filter((line) => line.trim() !== "");
      const tail = nonEmpty.slice(-count);
      return parseEventLines(tail.join("\n"));
    } catch {
      return [];
    } finally {
      await handle?.close().catch(() => {
      });
    }
  }
  function parseEventLines(raw) {
    const events = [];
    for (const line of raw.split("\n")) {
      if (line.trim() === "") continue;
      try {
        events.push(JSON.parse(line));
      } catch {
      }
    }
    return events;
  }
  async function appendEvent(event) {
    await fsp2.mkdir(stateDir, { recursive: true });
    const row = { at: new Date(now()).toISOString(), ...event };
    await fsp2.appendFile(eventsPath, `${JSON.stringify(row)}
`, "utf8");
    return row;
  }
  async function readMisses() {
    try {
      const raw = await fsp2.readFile(missesPath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.misses) ? parsed.misses : [];
    } catch {
      return [];
    }
  }
  async function writeMisses(misses) {
    await fsp2.mkdir(stateDir, { recursive: true });
    await atomicWrite(missesPath, `${JSON.stringify({ version: 1, misses }, null, 2)}
`);
  }
  async function recordMiss({ query, session = "plugin", scope = "all" }) {
    const text = String(query ?? "").trim();
    if (text === "") return null;
    const misses = await readMisses();
    const at = new Date(now()).toISOString();
    const existing = misses.find((item) => item.query === text && item.state !== "verified");
    if (existing !== void 0) {
      existing.hits = 0;
      existing.count = (existing.count ?? 1) + 1;
      existing.lastAt = at;
      const sessions = existing.sessions ?? [existing.session];
      if (!sessions.includes(session)) sessions.push(session);
      existing.sessions = sessions;
      if (existing.state === void 0) existing.state = "observing";
      if (existing.count >= 3 && existing.state === "observing") existing.state = "should-fill";
    } else {
      misses.push({
        at,
        lastAt: at,
        session,
        query: text,
        hits: 0,
        count: 1,
        state: "observing",
        scope,
        drafts: [],
        sessions: [session]
      });
    }
    await writeMisses(misses);
    await appendEvent({ session, kind: "miss", query: text });
    return misses.find((item) => item.query === text) ?? null;
  }
  async function recordVerifyHit({ query }) {
    const text = String(query ?? "").trim();
    if (text === "") return null;
    const misses = await readMisses();
    const target = misses.find((item) => item.query === text && item.state === "verifying");
    if (target === void 0) return null;
    target.hits = (target.hits ?? 0) + 1;
    target.lastAt = new Date(now()).toISOString();
    if (target.hits >= 3) {
      target.state = "verified";
      target.stateAt = new Date(now()).toISOString();
    }
    await writeMisses(misses);
    return target;
  }
  async function updateMiss({ query, state, draftId, draftPath, verifyAt }) {
    const misses = await readMisses();
    const target = misses.find((item) => item.query === query);
    if (target === void 0) throw new Error(`\u672A\u547D\u4E2D\u4E0D\u5B58\u5728\uFF1A${query}`);
    if (typeof state === "string") {
      target.state = state;
      target.stateAt = new Date(now()).toISOString();
      if (state === "verifying") {
        target.verifyAt = verifyAt ?? new Date(now()).toISOString();
        target.hits = 0;
      } else if (state !== "verifying") {
        delete target.verifyAt;
      }
    }
    if (typeof draftId === "string" && !(target.drafts ?? []).includes(draftId)) {
      target.drafts = [...target.drafts ?? [], draftId];
    }
    if (typeof draftPath === "string" && draftPath !== "") target.draftPath = draftPath;
    await writeMisses(misses);
    return target;
  }
  async function deleteMiss(query) {
    const misses = await readMisses();
    const next = misses.filter((item) => item.query !== query);
    await writeMisses(next);
    return misses.length - next.length;
  }
  async function writeBody(relPath, body) {
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      const source = await fsp2.readFile(absolute, "utf8");
      const { frontmatter } = splitFrontmatter(source);
      const meta = parseFrontmatter(frontmatter);
      meta.updated = new Date(now()).toISOString().slice(0, 10);
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${String(body ?? "").replace(/^\n+/, "")}`);
      return readEntry(relPath);
    });
  }
  async function mergeMeta(relPath, patch, { overwrite = [] } = {}) {
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      const source = await fsp2.readFile(absolute, "utf8");
      const { frontmatter, body } = splitFrontmatter(source);
      const meta = parseFrontmatter(frontmatter);
      for (const [key, value] of Object.entries(patch)) {
        if (value === void 0) continue;
        if (!overwrite.includes(key)) {
          const current = meta[key];
          if (typeof current === "string" && current.trim() !== "") continue;
        }
        meta[key] = value;
      }
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${body.replace(/^\n+/, "")}`);
      return readEntry(relPath);
    });
  }
  async function patchMeta(relPath, patch) {
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      const source = await fsp2.readFile(absolute, "utf8");
      const { frontmatter, body } = splitFrontmatter(source);
      const meta = parseFrontmatter(frontmatter);
      for (const [key, value] of Object.entries(patch)) {
        if (value === void 0) continue;
        meta[key] = value;
      }
      meta.updated = new Date(now()).toISOString().slice(0, 10);
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${body.replace(/^\n+/, "")}`);
      return readEntry(relPath);
    });
  }
  function branchPathOf({
    project,
    branch,
    tail,
    kind
  }) {
    const safeProject = String(project).replace(/[\\/]/g, "");
    const safeBranch = String(branch).replace(/[\\/]/g, "");
    const safeTail = safeRelPath(tail);
    if (safeProject === "") throw new Error("\u9879\u76EE\u540D\u4E0D\u80FD\u4E3A\u7A7A");
    if (safeBranch === "") throw new Error("\u5206\u652F\u540D\u4E0D\u80FD\u4E3A\u7A7A\uFF08\u8DE8\u5206\u652F\u5171\u4EAB\u8BF7\u663E\u5F0F\u7528 _shared\uFF09");
    if (safeBranch === SHARED_BRANCH && kind !== void 0 && !canShareAcrossBranches(kind)) {
      throw new Error(
        `\u300C${kind}\u300D\u4E0D\u80FD\u653E\u8FDB _shared\uFF1A\u968F\u7248\u672C\u53D8\u5316\u7684\u77E5\u8BC6\u5FC5\u987B\u843D\u5230\u5177\u4F53\u5206\u652F\u3002\u5141\u8BB8\u5171\u4EAB\u7684\u7C7B\u578B\uFF1A${SHARED_ALLOWED_KINDS.join(" / ")}`
      );
    }
    return `work/${safeProject}/${safeBranch}/${safeTail}`;
  }
  async function createEntry({ relPath, frontmatter = {}, body = "" }) {
    const relative = safeRelPath(relPath);
    assertSharedAdmission(relative, frontmatter);
    const absolute = absoluteOf(relative);
    return withLock(absolute, async () => {
      if (fs.existsSync(absolute)) throw new Error(`\u6761\u76EE\u5DF2\u5B58\u5728\uFF1A${relative}`);
      const meta = {
        id: identityOf(relative, frontmatter),
        title: orEmpty(frontmatter.title),
        scope: frontmatter.scope ?? domainKeyOf(relative),
        kind: frontmatter.kind ?? "fact",
        layer: frontmatter.layer ?? "l2",
        status: frontmatter.status ?? "active",
        pinned: frontmatter.pinned === true,
        updated: new Date(now()).toISOString().slice(0, 10),
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        ...frontmatter
      };
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${String(body).replace(/^\n+/, "")}`);
      return readEntry(relative);
    });
  }
  function assertSharedAdmission(relPath, frontmatter) {
    const parts = relPath.split("/");
    if (parts[0] !== "work" || parts[2] !== SHARED_BRANCH) return;
    const kind = frontmatter.knowledgeKind;
    if (canShareAcrossBranches(kind)) return;
    throw new Error(
      `\u4E0D\u80FD\u5199\u5165 ${SHARED_BRANCH}/\uFF1AknowledgeKind\u300C${String(kind ?? "\u672A\u6807\u6CE8")}\u300D\u968F\u7248\u672C\u53D8\u5316\uFF0C\u5FC5\u987B\u843D\u5230\u5177\u4F53\u5206\u652F\u3002\u5141\u8BB8\u5171\u4EAB\uFF1A${SHARED_ALLOWED_KINDS.join(" / ")}`
    );
  }
  function inboxPathOf(domain) {
    const key = String(domain ?? "personal");
    return `${key}/INBOX.md`;
  }
  async function appendInbox({ domain, kind, content, state = "open", destination = "\u2014" }) {
    const relPath = inboxPathOf(domain);
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      let source = "";
      try {
        source = await fsp2.readFile(absolute, "utf8");
      } catch {
        const date = new Date(now()).toISOString().slice(0, 10);
        source = `---
id: ${relPath.replace(/\.md$/, "").replace(/\//g, ".")}
title: INBOX
scope: ${domain ?? "personal"}
kind: fact
layer: l2
status: active
pinned: false
updated: ${date}
tags: []
---

# INBOX

${INBOX_HEADER}`;
      }
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES);
      const row = serializeInboxRow({
        date: new Date(now()).toISOString().slice(0, 10),
        kind,
        content,
        state,
        destination
      });
      const lines = parsed.body.split("\n");
      let insertAt = -1;
      lines.forEach((line, index) => {
        if (parseInboxRow(line) !== null) insertAt = index;
      });
      if (insertAt >= 0) {
        lines.splice(insertAt + 1, 0, row);
      } else {
        if (!lines.some((line) => line.trim().startsWith("|"))) lines.push("", INBOX_HEADER);
        while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
        lines.push(row);
      }
      const meta = parsed.frontmatter;
      meta.updated = new Date(now()).toISOString().slice(0, 10);
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${lines.join("\n").replace(/^\n+/, "")}`);
      return {
        path: relPath,
        row: parseInboxRow(row) === null ? null : { ...parseInboxRow(row), kindValid: true, stateValid: true, lineIndex: insertAt + 1 }
      };
    });
  }
  async function readInbox(domain) {
    const relPath = inboxPathOf(domain);
    const absolute = absoluteOf(relPath);
    let source = "";
    try {
      source = await fsp2.readFile(absolute, "utf8");
    } catch {
      return { path: relPath, entries: [], exists: false };
    }
    const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES);
    return { path: relPath, entries: parsed.entries, exists: true };
  }
  async function updateInboxRow({ domain, lineIndex, patch }) {
    const relPath = inboxPathOf(domain);
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      const source = await fsp2.readFile(absolute, "utf8");
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES);
      const lines = parsed.body.split("\n");
      const row = parseInboxRow(lines[lineIndex] ?? "");
      if (row === null) throw new Error(`\u7B2C ${lineIndex + 1} \u884C\u4E0D\u662F INBOX \u6761\u76EE`);
      const next = serializeInboxRow({
        date: patch.date ?? row.date,
        kind: patch.kind ?? row.kind,
        content: patch.content ?? row.content,
        state: patch.state ?? row.state,
        destination: patch.destination ?? row.destination
      });
      lines[lineIndex] = next;
      const meta = parsed.frontmatter;
      meta.updated = new Date(now()).toISOString().slice(0, 10);
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${lines.join("\n").replace(/^\n+/, "")}`);
      const updated = parseInboxRow(next);
      return {
        path: relPath,
        lineIndex,
        row: updated === null ? null : {
          ...updated,
          kindValid: INBOX_KINDS.includes(updated.kind),
          stateValid: INBOX_STATES.includes(updated.state),
          lineIndex
        }
      };
    });
  }
  async function deleteInboxRows({ domain, lineIndexes }) {
    const relPath = inboxPathOf(domain);
    const absolute = absoluteOf(relPath);
    return withLock(absolute, async () => {
      const source = await fsp2.readFile(absolute, "utf8");
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES);
      const lines = parsed.body.split("\n");
      const ordered = [...new Set(lineIndexes)].sort((a, b) => b - a);
      let removed = 0;
      for (const index of ordered) {
        if (parseInboxRow(lines[index] ?? "") === null) continue;
        lines.splice(index, 1);
        removed += 1;
      }
      const meta = parsed.frontmatter;
      meta.updated = new Date(now()).toISOString().slice(0, 10);
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}
${lines.join("\n").replace(/^\n+/, "")}`);
      return { path: relPath, removed };
    });
  }
  async function archiveEntry({ relPath, reason = "\u5230\u671F\u9000\u5F79" }) {
    const relative = safeRelPath(relPath);
    const absolute = absoluteOf(relative);
    return withLock(absolute, async () => {
      const stamp = new Date(now()).toISOString().slice(0, 10).replace(/-/g, "");
      const targetRel = `${ARCHIVE_DIR}/${stamp}/${relative}`;
      const targetAbs = absoluteOf(targetRel);
      await fsp2.mkdir(path3.dirname(targetAbs), { recursive: true });
      const source = await fsp2.readFile(absolute, "utf8");
      const { frontmatter, body } = splitFrontmatter(source);
      const meta = parseFrontmatter(frontmatter);
      meta.status = "archived";
      meta.archived_at = new Date(now()).toISOString().slice(0, 10);
      meta.archive_reason = reason;
      await atomicWrite(targetAbs, `${serializeFrontmatter(meta)}
${body.replace(/^\n+/, "")}`);
      await fsp2.unlink(absolute);
      await appendEvent({
        session: "plugin",
        kind: "archive",
        ids: [identityOf(relative, meta)],
        query: reason
      });
      return { from: relative, to: targetRel };
    });
  }
  async function keepLonger({ relPath }) {
    return patchMeta(relPath, { updated: new Date(now()).toISOString().slice(0, 10) });
  }
  async function recordCite({ ids, kind = "cite", session = "plugin", query }) {
    const event = await appendEvent({ session, kind, ids, query });
    if (kind !== "cite" || ids.length === 0) return event;
    const at = new Date(now()).toISOString().slice(0, 10);
    try {
      const entries = await scan();
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      for (const id of ids) {
        const entry = byId.get(id);
        if (entry === void 0) continue;
        try {
          await patchMeta(entry.path, { last_cited: at });
        } catch {
        }
      }
    } catch {
    }
    return event;
  }
  function summarizeStats(entries, events, misses, { nowMs = now() } = {}) {
    return summarize(entries, events, misses, { nowMs }, expiryOf);
  }
  return {
    root: base,
    stateDir,
    eventsPath,
    missesPath,
    ensureLayout,
    scan,
    getScanCount,
    resetScanCount,
    readEntry,
    readEvents,
    readEventsTail,
    appendEvent,
    readMisses,
    writeMisses,
    recordMiss,
    recordVerifyHit,
    updateMiss,
    deleteMiss,
    writeBody,
    patchMeta,
    mergeMeta,
    createEntry,
    branchPathOf,
    inboxPathOf,
    appendInbox,
    readInbox,
    updateInboxRow,
    deleteInboxRows,
    archiveEntry,
    keepLonger,
    recordCite,
    summarize: summarizeStats,
    absoluteOf
  };
}

// src/index.ts
import fsp3 from "node:fs/promises";
import path4 from "node:path";

// src/bridge.ts
var ROUTES = {
  // —— 读 ——
  snapshot: { method: "POST", run: (a, b) => a.snapshot(b) },
  overview: {
    method: "POST",
    /**
     * 必须 `await`：宿主的 `skills.list()` 是异步的。
     * 早先同步当数组用，抛 `all.filter is not a function` 被吞成
     * 「读不到 skill」——于是常驻前缀恒等于框架 171，而不是真实 361。
     */
    run: async (a, _b, env) => a.overview({
      skillDescriptions: await env.listSkills?.() ?? [],
      skillsError: env.skillsError?.() ?? ""
    })
  },
  inbox: { method: "POST", run: (a, b) => a.inbox(b) },
  search: { method: "POST", run: (a, b) => a.search(b) },
  detail: { method: "POST", run: (a, b) => a.detail(b) },
  // 未命中支持排序：三种口径见 core misses() 的注释
  misses: { method: "POST", run: (a, b) => a.misses(b) },
  health: { method: "POST", run: (a) => a.health() },
  index: { method: "POST", run: (a, b) => a.index(b) },
  // —— 记录流写 ——
  capture: { method: "POST", run: (a, b) => a.capture(b) },
  captureBatch: { method: "POST", run: (a, b) => a.captureBatch(b) },
  updateInbox: { method: "POST", run: (a, b) => a.updateInbox(b) },
  deleteInbox: { method: "POST", run: (a, b) => a.deleteInbox(b) },
  batchInboxState: { method: "POST", run: (a, b) => a.batchInboxState(b) },
  promoteInbox: { method: "POST", run: (a, b) => a.promoteInbox(b) },
  // —— 记忆写 ——
  writeBody: { method: "POST", run: (a, b) => a.writeBody(b) },
  setStatus: { method: "POST", run: (a, b) => a.setStatus(b) },
  confirm: { method: "POST", run: (a, b) => a.confirm(b) },
  reject: { method: "POST", run: (a, b) => a.reject(b) },
  undoReject: { method: "POST", run: (a, b) => a.undoReject(b) },
  archive: { method: "POST", run: (a, b) => a.archive(b) },
  keep: { method: "POST", run: (a, b) => a.keep(b) },
  batchArchive: { method: "POST", run: (a, b) => a.batchArchive(b) },
  // —— 未命中 ——
  missDraft: { method: "POST", run: (a, b) => a.missDraft(b) },
  missConfirm: { method: "POST", run: (a, b) => a.missConfirm(b) },
  missBatchDraft: { method: "POST", run: (a, b) => a.missBatchDraft(b) },
  missDelete: { method: "POST", run: (a, b) => a.missDelete(b) },
  // —— 维护（按需触发，无常驻定时器）——
  verifyAnchor: { method: "POST", run: (a, b) => a.verifyAnchor(b) },
  compact: { method: "POST", run: (a, b) => a.compact(b) },
  review: { method: "POST", run: (a, b) => a.review(b) },
  promote: { method: "POST", run: (a, b) => a.promote(b) },
  repairMeta: { method: "POST", run: (a, b) => a.repairMeta(b) },
  // —— 其他 ——
  export: { method: "POST", run: (a, b) => a.export(b) },
  sessionMemory: { method: "POST", run: (a, b) => a.sessionMemory(b) },
  // —— 诊断 ——
  healthCheck: {
    method: "GET",
    run: (a) => ({ ok: true, root: a.store.root, routes: Object.keys(ROUTES).length })
  }
};
function routePathOf(prefix, routeName) {
  return `${prefix}/${routeName}`;
}
function isLoopback(req) {
  const address = req?.socket?.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1" || address.startsWith("127.");
}
function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  });
  res.end(JSON.stringify(body));
}
async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > limit) throw new Error("\u8BF7\u6C42\u4F53\u8FC7\u5927");
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  return typeof parsed === "object" && parsed !== null ? parsed : {};
}
function createBridge({ actions, prefix, env = {} }) {
  function handlerFor(routeName) {
    const route = ROUTES[routeName];
    if (route === void 0) return null;
    return async (req, res) => {
      const request = req;
      const response = res;
      if (!isLoopback(request)) {
        json(response, 403, { ok: false, error: "\u4EC5\u63A5\u53D7\u672C\u673A\u56DE\u73AF\u8BF7\u6C42" });
        return;
      }
      if (request.method !== route.method) {
        json(response, 405, { ok: false, error: `\u8BE5\u80FD\u529B\u53EA\u652F\u6301 ${route.method}` });
        return;
      }
      try {
        const body = route.method === "POST" ? await readBody(request) : {};
        const result = await route.run(actions, body, env);
        const failed = typeof result === "object" && result !== null && result.ok === false;
        json(response, failed ? 400 : 200, result ?? { ok: true });
      } catch (error) {
        json(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };
  }
  function attach(ctx) {
    const disposers = [];
    for (const routeName of Object.keys(ROUTES)) {
      const handler = handlerFor(routeName);
      if (handler === null) continue;
      disposers.push(ctx.webServer.register({
        kind: "exact",
        path: routePathOf(prefix, routeName),
        handler
      }));
    }
    return () => {
      for (const dispose of disposers) dispose();
    };
  }
  return { attach, handlerFor, routes: ROUTES };
}

// src/tools.ts
function registerTools({ actions }) {
  function attach(ctx) {
    const disposers = [];
    disposers.push(ctx.tools.register({
      name: "memory_recall",
      description: [
        "\u5728\u300C\u8BB0\u5FC6\u5E93\u300D\u91CC\u6309\u5173\u952E\u8BCD\u68C0\u7D22\u5DF2\u6C89\u6DC0\u7684\u7ED3\u8BBA\uFF08\u4E2A\u4EBA\u57DF\u504F\u597D/\u539F\u5219\u3001\u5DE5\u4F5C\u57DF\u67B6\u6784\u7ED3\u8BBA\u4E0E\u8E29\u5751\u53F0\u8D26\uFF09\u3002",
        "\u547D\u4E2D\u65F6\u8FD4\u56DE\u6761\u76EE\u8DEF\u5F84\u3001\u6807\u9898\u3001tokens \u4E0E\u7247\u6BB5\uFF1B\u672A\u547D\u4E2D\u4F1A\u8BB0\u4E00\u6761 miss \u4F9B\u540E\u7EED\u8865\u9F50\u3002",
        "\u5148\u7528\u5B83\u5224\u65AD\u300C\u8BE5\u8BFB\u54EA\u4E2A\u6587\u4EF6\u300D\uFF0C\u518D\u51B3\u5B9A\u8981\u4E0D\u8981\u8BFB\u8BE6\u60C5\u2014\u2014\u4E0D\u8981\u4E00\u6B21\u8BFB\u6574\u4E2A\u5E93\u3002"
      ].join(" "),
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "\u68C0\u7D22\u8BCD\uFF0C\u53EF\u7A7A\u683C\u5206\u9694\u591A\u4E2A" },
          project: { type: "string", description: "\u9650\u5B9A\u9879\u76EE\u540D\uFF08work/<project> \u7684 project \u90E8\u5206\uFF09\uFF0C\u7701\u7565\u8868\u793A\u5168\u90E8" },
          limit: { type: "number", description: "\u8FD4\u56DE\u6761\u6570\u4E0A\u9650\uFF0C\u9ED8\u8BA4 5" },
          cite: {
            type: "array",
            items: { type: "string" },
            description: "\u672C\u6B21**\u5B9E\u9645\u7528\u5230**\u7684\u6761\u76EE id\u3002\u8BFB\u5B8C\u8BE6\u60C5\u540E\u56DE\u586B\uFF0C\u7528\u6765\u7B97\u547D\u4E2D\u7387\uFF08\u4E0D\u586B\u5219\u53EA\u8BB0 recall\uFF09"
          }
        },
        required: ["query"]
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            matched: { type: "boolean" },
            total: { type: "number" },
            cost: { type: "number" },
            text: { type: "string" },
            hits: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  path: { type: "string" },
                  title: { type: "string" },
                  domainLabel: { type: "string" },
                  tokens: { type: "number" },
                  snippet: { type: "string" }
                }
              }
            }
          },
          required: ["matched", "total", "text"]
        },
        render(_args, value) {
          return [{ type: "text", text: value.text }];
        }
      },
      async execute(rawArgs, exec) {
        const args = rawArgs ?? {};
        const agent = exec?.agent;
        const limit = Number.isFinite(args.limit) ? Number(args.limit) : 5;
        const result = await actions.search({
          query: String(args.query ?? ""),
          project: args.project,
          session: agent?.id ?? "agent"
        });
        if (result.ok && Array.isArray(args.cite) && args.cite.length > 0) {
          const valid = args.cite.filter((id) => result.hits.some((hit) => hit.id === id));
          if (valid.length > 0) {
            await actions.store.recordCite({
              ids: valid,
              kind: "cite",
              session: agent?.id ?? "agent",
              query: String(args.query ?? "")
            });
          }
        }
        if (!result.ok) {
          return { matched: false, total: 0, cost: 0, text: `\u8BB0\u5FC6\u5E93\u68C0\u7D22\u5931\u8D25\uFF1A${result.error}` };
        }
        const hits = result.hits.slice(0, Math.max(1, limit)).map((hit) => ({
          id: hit.id,
          path: hit.path,
          title: hit.title,
          domainLabel: hit.domainLabel,
          tokens: hit.tokens,
          snippet: hit.snippet
        }));
        const lines = result.matched ? [
          `\u8BB0\u5FC6\u5E93\u547D\u4E2D ${result.total} \u6761\uFF08\u663E\u793A ${hits.length} \u6761\uFF09\uFF1A`,
          ...hits.map((hit) => `- [${hit.domainLabel}] ${hit.title}\uFF08${hit.path} \xB7 ${hit.tokens} tokens\uFF09
  ${hit.snippet}`),
          "",
          "\u8BFB\u53D6\u8BE6\u60C5\u8BF7\u7528 read \u6253\u5F00\u4E0A\u9762\u5217\u51FA\u7684\u8DEF\u5F84\uFF1B\u672C\u5C42\u53EA\u56DE\u7B54\u300C\u8BE5\u8BFB\u54EA\u4E2A\u6587\u4EF6\u300D\u3002"
        ] : [
          `\u8BB0\u5FC6\u5E93\u672A\u547D\u4E2D\uFF1A\u300C${String(args.query ?? "")}\u300D\u3002`,
          "\u8FD9\u6761\u672A\u547D\u4E2D\u5DF2\u8BB0\u8D26\u2014\u2014\u5982\u679C\u8FD9\u6B21\u4F1A\u8BDD\u5F97\u51FA\u4E86\u7ED3\u8BBA\uFF0C\u7528 memory_write \u5199\u56DE\uFF0C\u5B83\u5C31\u4F1A\u53D8\u6210\u4E0B\u6B21\u7684\u547D\u4E2D\u3002"
        ];
        return {
          matched: result.matched,
          total: result.total,
          cost: result.cost,
          hits,
          text: lines.join("\n")
        };
      }
    }));
    disposers.push(ctx.tools.register({
      name: "memory_write",
      description: [
        "\u628A\u4E00\u6761\u5DF2\u786E\u8BA4\u7684\u7ED3\u8BBA\u5199\u8FDB\u300C\u8BB0\u5FC6\u5E93\u300D\uFF08Markdown \u771F\u76F8\u6E90\uFF09\uFF0C\u6216\u5FEB\u901F\u8BB0\u4E00\u6761 INBOX \u60F3\u6CD5\u3002",
        "mode=inbox \u53EA\u8FDB\u8BB0\u5F55\u6D41\u7B49\u5F85\u4EBA\u5DE5\u6D41\u8F6C\uFF1Bmode=entry \u76F4\u63A5\u843D\u4E00\u4E2A\u5E26 frontmatter \u7684\u6761\u76EE\u3002",
        "\u8BC1\u636E\u5FC5\u586B\uFF1Aorigin \u4E3A G2/G3/G4 \u65F6\u5FC5\u987B\u7ED9 evidence\uFF0C\u5426\u5219\u62D2\u6536\uFF08\u6321\u5E7B\u89C9\u5199\u5165\uFF09\u3002",
        "\u547D\u4E2D\u9690\u79C1\u95F8\u95E8\uFF08\u5BC6\u94A5/\u79C1\u94A5/\u8EAB\u4EFD\u8BC1/\u5185\u7F51 IP\uFF09\u4F1A\u62D2\u5199\u5E76\u8FD4\u56DE\u8131\u654F\u6587\u672C\u3002"
      ].join(" "),
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          mode: { type: "string", enum: ["inbox", "entry"], description: "inbox=\u901F\u8BB0\u8FDB\u8BB0\u5F55\u6D41\uFF1Bentry=\u843D\u6B63\u5F0F\u6761\u76EE" },
          content: { type: "string", description: "\u5185\u5BB9\u6B63\u6587" },
          title: { type: "string", description: "mode=entry \u65F6\u7684\u6807\u9898" },
          kind: { type: "string", description: "inbox \u7C7B\u578B\uFF1A\u60F3\u6CD5/\u8BA1\u5212/\u95EE\u9898/\u5F85\u529E/\u51B3\u7B56" },
          domain: { type: "string", description: "\u57DF\uFF1Apersonal \u6216 work/<project>" },
          path: { type: "string", description: "mode=entry \u65F6\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF0C\u7701\u7565\u5219\u81EA\u52A8\u751F\u6210" },
          origin: { type: "string", enum: [...ORIGINS], description: "\u5199\u5165\u6765\u6E90\u95F8\u95E8\uFF0C\u9ED8\u8BA4 G2" },
          evidence: { type: "string", description: "\u8BC1\u636E\u6458\u5F55\uFF08origin=G2/G3/G4 \u5FC5\u586B\uFF09" }
        },
        required: ["mode", "content"]
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean" },
            blocked: { type: "boolean" },
            path: { type: "string" },
            message: { type: "string" },
            masked: { type: "string" }
          },
          required: ["ok", "message"]
        },
        render(_args, value) {
          return [{ type: "text", text: value.message }];
        }
      },
      async execute(rawArgs, exec) {
        const args = rawArgs ?? {};
        const agent = exec?.agent;
        const session = agent?.id ?? "agent";
        const mode = String(args.mode ?? "inbox");
        const content = String(args.content ?? "").trim();
        const origin = String(args.origin ?? "G2");
        if (content === "") return { ok: false, message: "\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" };
        if (!ORIGINS.includes(origin)) {
          return { ok: false, message: `origin \u5FC5\u987B\u662F ${ORIGINS.join(" / ")}` };
        }
        if (mode === "inbox") {
          const result = await actions.capture({
            content,
            kind: args.kind ?? "\u60F3\u6CD5",
            domain: args.domain ?? "personal",
            session
          });
          if (!result.ok) {
            return {
              ok: false,
              blocked: result.blocked === true,
              masked: result.masked ?? "",
              message: result.blocked === true ? `\u9690\u79C1\u95F8\u95E8\u62E6\u622A\uFF1A${result.reason}
\u8131\u654F\u540E\u5EFA\u8BAE\uFF1A${result.masked}` : `\u5199\u5165\u5931\u8D25\uFF1A${result.error ?? result.reason ?? "\u672A\u77E5\u539F\u56E0"}`
            };
          }
          return {
            ok: true,
            path: result.captured.path,
            message: `\u5DF2\u8BB0\u5165 ${result.captured.path}\uFF1A${content}`
          };
        }
        if (ORIGIN_NEEDS_EVIDENCE[origin] === true && String(args.evidence ?? "").trim() === "") {
          return { ok: false, message: "\u8BC1\u636E\u5FC5\u586B\uFF1Aorigin \u4E3A G2/G3/G4 \u65F6\u5FC5\u987B\u7ED9 evidence\uFF08\u65E0\u8BC1\u636E\u4E0D\u5F97\u5165\u5E93\uFF09" };
        }
        const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const domain = String(args.domain ?? "personal");
        const slug = String(args.title ?? content).slice(0, 24).replace(/[^\w\u4e00-\u9fff-]+/g, "-");
        const relPath = typeof args.path === "string" && args.path.trim() !== "" ? args.path.trim() : `${domain.startsWith("work/") ? domain : "personal"}/notes/${date}-${slug}.md`;
        try {
          const entry = await actions.store.createEntry({
            relPath,
            frontmatter: {
              title: args.title ?? slug,
              kind: "fact",
              layer: "l2",
              status: origin === "G1" ? "confirmed" : "observed",
              confidence: origin === "G1" ? 0.9 : 0.5,
              origin,
              evidence: origin === "G1" ? [] : [{ session, excerpt: String(args.evidence).slice(0, 160), gate: origin }]
            },
            body: `
# ${args.title ?? slug}

${content}
`
          });
          await actions.store.appendEvent({ session, kind: "write", ids: [entry.id], query: slug });
          return {
            ok: true,
            path: relPath,
            message: `\u5DF2\u5199\u5165 ${relPath}\uFF08${entry.tokens} tokens\uFF0C\u72B6\u6001 ${entry.status}\uFF09`
          };
        } catch (error) {
          return {
            ok: false,
            message: `\u5199\u5165\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
    }));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }
  return { attach };
}

// src/index.ts
var name = "dsh-memory-ops";
var BRIDGE_PREFIX = "/api/dsh-memory-ops";
function apply(ctx, config = {}) {
  const configured = typeof config.root === "string" && config.root.trim() !== "" ? config.root.trim() : defaultRoot();
  const store = createStore({ root: configured });
  const readExternal = async (relPath) => {
    try {
      const safe = safeRelPath(relPath);
      return await fsp3.readFile(path4.join(process.cwd(), safe), "utf8");
    } catch {
      return null;
    }
  };
  const actions = createActions({ store, readExternal });
  void store.ensureLayout().catch(() => {
  });
  const disposers = [];
  let skillsError = "";
  const env = {
    listSkills: async () => {
      const skills = ctx.get?.("skills");
      if (skills === void 0) {
        skillsError = '\u5BBF\u4E3B\u6CA1\u6709\u63D0\u4F9B skills \u670D\u52A1\uFF08ctx.get("skills") \u8FD4\u56DE undefined\uFF09';
        return [];
      }
      if (typeof skills.list !== "function") {
        skillsError = "skills \u670D\u52A1\u6CA1\u6709 list() \u65B9\u6CD5";
        return [];
      }
      try {
        const listed = await Promise.resolve(skills.list());
        const all = Array.isArray(listed) ? listed : [];
        const filtered = all.filter((row) => typeof row?.description === "string" && row.description.trim() !== "");
        if (filtered.length === 0) {
          skillsError = all.length === 0 ? "skills.list() \u8FD4\u56DE\u7A7A\u6570\u7EC4\u2014\u2014\u5BBF\u4E3B\u7684 skill \u76EE\u5F55\u53EF\u80FD\u6CA1\u6709\u914D\u7F6E" : `${all.length} \u4E2A skill \u90FD\u6CA1\u6709 description\uFF0C\u65E0\u6CD5\u8BA1\u5165\u5E38\u9A7B\u524D\u7F00`;
        } else {
          skillsError = "";
        }
        return filtered.map((row) => ({
          name: row.name,
          path: row.path ?? "",
          description: row.description,
          descriptionTokens: estimateTokens(row.description)
        }));
      } catch (error) {
        skillsError = `skills.list() \u629B\u9519\uFF1A${error instanceof Error ? error.message : String(error)}`;
        return [];
      }
    },
    skillsError: () => skillsError
  };
  void Promise.resolve(env.listSkills?.()).catch((error) => {
    skillsError = `\u542F\u52A8\u63A2\u6D4B skills \u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`;
  });
  ctx.inject(["webServer"], (serverCtx) => {
    const dispose = createBridge({ actions, prefix: BRIDGE_PREFIX, env }).attach(serverCtx);
    return dispose;
  });
  ctx.inject(["tools"], (toolCtx) => {
    const dispose = registerTools({ actions }).attach(toolCtx);
    return dispose;
  });
  return () => {
    for (const dispose of disposers) dispose();
  };
}
var index_default = { name, apply };
export {
  BRIDGE_PREFIX,
  apply,
  index_default as default,
  name
};
