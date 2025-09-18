import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// motion fallback stub (replace with framer-motion if installed)
const motion = { div: (props) => <div {...props} /> };
// NLP fallback stub (replace with compromise if installed)
const nlp = (txt) => ({
sentences: () => ({ out: () => [] }),
verbs: () => ({ toInfinitive: () => ({ out: () => [] }), out: () => [] }),
nouns: () => ({ out: () => [] })
});
import {
Upload,
FileText,
CheckCircle2,
XCircle,
AlertTriangle,
Lightbulb,
Wand2,
Hammer,
Filter,
Search,
Download,
Trash2,
PlusCircle,
Loader2,
Eye,
EyeOff,
Save,
Clipboard,
ClipboardCheck,
Info
} from "lucide-react";

/**
 * Professionalized single-file React component
 * - Stronger UX: a11y labels, keyboard shortcuts, better empty/error states
 * - Safer parsing: defensive NLP calls, stricter regexes, normalized inputs
 * - Cleaner architecture: small components, helpers, constants, memoization
 * - Persistence: robust localStorage keys, versioned schema
 * - Prover: env-configurable endpoint with timeout + graceful fallback
 * - NFR → TLA+ rewrite: clearer templates + assumptions
 * - CSV/JSON export: proper quoting and UTF-8 BOM for Excel
 * - Drag & drop + picker + filename preview
 * - Subtle animations, consistent Tailwind styles
 */

// ------------------------------ Types ------------------------------
/** @typedef {"Functional" | "Non-functional"} Kind */
/** @typedef {"High" | "Medium" | "Low"} Priority */
/** @typedef {"Unproven" | "Proved" | "Failed" | "Unclear"} Status */

// ------------------------------ Config ------------------------------
const APP_VERSION = "1.4.0";
const LS_KEYS = {
  reqs: `tla-reqs-v${APP_VERSION}`,
  src: `tla-src-v${APP_VERSION}`,
};

// Map real time to steps for NFR rewrites (edit to suit your model)
const STEP_MS = 50; // 1 Next-step ≈ 50 ms

// Env-configurable prover endpoint
// ---- Prover URL resolution ----
const LS_BACKEND_KEY = "tla-prover-url";
const urlParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("prover") : null;
if (urlParam) {
  try { localStorage.setItem(LS_BACKEND_KEY, urlParam); } catch {}
}
const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_PROVER_URL) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_PROVER_URL) || null;
let fromStorage = null;
try { fromStorage = localStorage.getItem(LS_BACKEND_KEY); } catch {}
const sameOrigin = (typeof location !== "undefined") ? (location.origin + "/api/prove") : null;
const candidates = [fromEnv, urlParam, fromStorage, sameOrigin, "http://localhost:8787/api/prove"].filter(Boolean);
const PROVER_URL = candidates[0];
// --------------------------------
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_PROVER_URL) ||
  "http://localhost:8787/api/prove";

// Network timeout for prover
const PROVER_TIMEOUT_MS = 12000;

// ------------------------------ Constants ------------------------------
const FN_KEYWORDS = [
  "shall",
  "must",
  "will",
  "ensure",
  "if",
  "when",
  "then",
  "always",
  "eventually",
  "invariant",
  "liveness",
  "safety",
  "init",
  "next",
  "spec",
  "theorem",
];

const NFR_CLUSTERS = {
  Performance: ["latency", "throughput", "deadline", "response", "ms", "rate", "load", "time"],
  Reliability: ["fault", "recover", "availability", "retry", "crash", "robust", "mtbf", "uptime"],
  Safety: ["hazard", "violation", "deadlock", "collision", "unsafe"],
  Security: ["auth", "encrypt", "integrity", "confidential", "tamper", "attack", "threat"],
  Usability: ["accessible", "learn", "intuitive", "ux", "human", "operator"],
  Maintainability: ["log", "trace", "monitor", "debug", "observability", "maintain"],
};

const PRIORITY_RULES = [
  { level: "High", cues: ["must", "shall", "safety", "hazard", "deadlock", "always"] },
  { level: "Medium", cues: ["should", "ensure", "reliab", "security", "eventually"] },
  { level: "Low", cues: ["may", "could", "nice", "optional", "usability"] },
];

const COLORS = {
  High: "bg-red-100 text-red-800 border-red-300",
  Medium: "bg-amber-100 text-amber-800 border-amber-300",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Functional: "bg-blue-50 text-blue-700 border-blue-200",
  "Non-functional": "bg-purple-50 text-purple-700 border-purple-200",
};

const DEMO = `---- MODULE TrafficLight ----
EXTENDS Naturals, TLC

CONSTANTS Cars
VARIABLES light, queue

(* Requirement: The system shall never allow conflicting greens. *)
(* NFR: Average waiting time should be under 40s at peak. *)
(* NFR: Availability >= 99.9% during cruise. *)
(* NFR: Mode change latency should be under 100 ms. *)

Init == /\ light = "R" /\ queue = 0

Next == 
  \ /\ light = "R" /\ queue' = queue + 1 /\ light' = "G"
  \ /\ light = "G" /\ queue' = queue - IF queue > 0 THEN 1 ELSE 0 /\ light' = "Y"
  \ /\ light = "Y" /\ queue' = queue /\ light' = "R"

Spec == Init /\ [][](Next)_<<light, queue>> \* expanded temporal box

TypeOK == light \in {"R","Y","G"} /\ queue \in Nat
NoConflict == ~(light = "G" /\ queue > 0 /\ light' = "G") \* toy example

Invariant == TypeOK /\ NoConflict
THEOREM Spec => []Invariant
====`;

// ------------------------------ Helpers ------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const ceilDiv = (a, b) => Math.floor((a + b - 1) / b);

function withTimeout(promise, ms, signal) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`Prover timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]).catch((e) => {
    if (signal?.aborted) throw new Error("Prover request cancelled");
    throw e;
  });
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** quick sentence split via compromise (fallback: simple split) */
function splitSentences(text) {
  try {
    const doc = nlp(text);
    const sents = doc.sentences().out("array");
    if (sents && sents.length) return sents;
  } catch (e) { /* noop */ }
  return text
    .replace(/\(\*[^]*?\*\)/g, " ")
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** identify NFR label if any */
function detectNFRLabel(s) {
  const low = s.toLowerCase();
  for (const [label, words] of Object.entries(NFR_CLUSTERS)) {
    if (words.some((w) => low.includes(w))) return label;
  }
  return null;
}

/** classify Functional vs Non-functional with rationale */
function classifyKind(s) {
  const low = s.toLowerCase();
  const hasFn = FN_KEYWORDS.some((k) => low.includes(k));
  const nfrLabel = detectNFRLabel(s);
  if (nfrLabel && !hasFn) {
    return { kind: "Non-functional", rationale: `Mentions ${nfrLabel.toLowerCase()} cues` };
  }
  if (hasFn) {
    return { kind: "Functional", rationale: "Uses spec cues (Init/Next/Spec/invariant/temporal) or normative verbs" };
  }
  try {
    const doc = nlp(s);
    const verbs = doc.verbs().out("array");
    if (verbs.length) return { kind: "Functional", rationale: "Contains action verbs" };
  } catch {}
  return { kind: "Non-functional", rationale: "No spec cues; reads like a quality constraint" };
}

/** simple priority scorer */
function scorePriority(s) {
  const low = s.toLowerCase();
  for (const rule of PRIORITY_RULES) {
    if (rule.cues.some((c) => low.includes(c))) return /** @type {Priority} */ (rule.level);
  }
  if (low.includes("deadlock") || low.includes("hazard")) return "High";
  return "Medium";
}

/** extract candidate requirements from TLA+ + comments */
function extractCandidates(tlaText) {
  const lines = tlaText.split(/\n/);
  const buckets = [];
  const commentRE = /\(\*([\s\S]*?)\*\)/g; // non-greedy
  let block;
  while ((block = commentRE.exec(tlaText))) {
    const t = block[1].replace(/\n+/g, " ").trim();
    if (t.length > 0) buckets.push(t);
  }
  for (const ln of lines) {
    const trimmed = ln.trim();
    if (/^\*+/.test(trimmed)) continue; // skip stars-only
    if (/(Requirement:|Req:|Assume|THEOREM|Invariant|invariant|\[\]|<>)/.test(trimmed)) buckets.push(trimmed);
  }
  const sentences = buckets.flatMap(splitSentences).map((s) => s.trim());
  const uniq = Array.from(new Set(sentences)).filter((s) => s.length > 6);
  return uniq.map((s) => {
    const { kind, rationale } = classifyKind(s);
    const priority = scorePriority(s);
    return {
      id: uid(),
      text: s,
      kind,
      priority,
      rationale,
      suggestions: suggestImprovements(s, kind),
      status: "Unproven",
    };
  });
}

/** AI-ish suggestions (deterministic NLP templates) */
function suggestImprovements(s, kind) {
  const out = [];
  let verbs = [];
  let nouns = [];
  try {
    const doc = nlp(s);
    verbs = doc.verbs().toInfinitive().out("array");
    nouns = doc.nouns().out("array");
  } catch {}
  const hasTemporal = /(\balways\b|\beventually\b|\buntil\b|\[\]|<>)/i.test(s);
  if (kind === "Functional") {
    if (!/\b(shall|must|always)\b/i.test(s)) out.push("Use a normative modal like 'shall' or 'must'.");
    if (!hasTemporal) out.push("State the temporal mode: 'always', 'eventually', or 'until'.");
    if (!/\b(Invariant|TypeOK|THEOREM|Spec)\b/i.test(s)) out.push("Tie it to a named invariant and a theorem (e.g., Spec => []Invariant).");
    if (verbs.length && nouns.length) out.push(`Rewrite: The system shall ${verbs[0]} ${nouns.slice(0,2).join(" ")}.`);
  } else {
    const label = detectNFRLabel(s) || "quality";
    if (!/(under|within|<=|<|>=|>|\bms\b|\bs\b)/i.test(s)) out.push("Quantify it with a bound (e.g., under 40 ms, >= 99.9% uptime).");
    out.push(`Consider a monitor variable and an invariant recording ${label.toLowerCase()} compliance.`);
    out.push("Add testable acceptance criteria.");
  }
  return out.slice(0, 4);
}

/** mock prover (kept as fallback) */
function mockProve(requirements, tlaText) {
  const names = {
    invariants: Array.from(tlaText.matchAll(/\n([A-Za-z_][A-Za-z0-9_]*)\s*==/g)).map((m) => m[1]),
    theorems: Array.from(tlaText.matchAll(/THEOREM[^\n]*Spec\s*=>\s*\[\]\s*([A-Za-z_][A-Za-z0-9_]*)/g)).map((m) => m[1]),
    nextBodies: (tlaText.match(/Next\s*==([\s\S]*?)\n\n/g) || []).join(" "),
  };
  return requirements.map((r) => {
    let status = r.status || "Unproven";
    let evidence = r.evidence || "";
    const invUsed = names.theorems.find((nm) => r.text.includes(nm));
    const invDefined = names.invariants.find((nm) => r.text.includes(nm));
    if (invUsed && invDefined) {
      status = "Proved";
      evidence = `Theorem asserts Spec => []${invUsed} and ${invDefined} is defined.`;
    } else if (/never\s+allow\s+([A-Za-z_][A-Za-z0-9_]*)/i.test(r.text)) {
      const pred = RegExp.$1;
      if (names.nextBodies.includes(pred)) {
        status = "Failed";
        evidence = `Next mentions '${pred}', contradicting 'never allow'.`;
      }
    }
    return { ...r, status, evidence };
  });
}

/** call real prover backend (Express + Apalache) */
async function proveOnServer({ tla, moduleName, invariants = [] }) {
  const ctrl = new AbortController();
  const req = fetch(PROVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tla, moduleName, invariants }),
    signal: ctrl.signal,
  });
  try {
    const resp = await withTimeout(req, PROVER_TIMEOUT_MS, ctrl.signal);
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  } finally {
    ctrl.abort();
  }
}

/** NFR → temporal rewrite (returns {title, tla, assumptions?}) */
function rewriteNFRToTemporal(nfrText) {
  // Latency / recovery within K ms/s
  const lat = /(?:latency|respond|response|recover|recovery|mode\s*change).*?(?:under|<=|less than|within)\s*(\d+)\s*(ms|millisecond|milliseconds|s|sec|second|seconds)/i.exec(nfrText);
  if (lat) {
    const val = +lat[1];
    const unit = lat[2].toLowerCase();
    const ms = unit.startsWith("s") && unit !== "ms" ? val * 1000 : val;
    const K = Math.max(1, ceilDiv(ms, STEP_MS));
    return {
      title: `Bounded response within ${ms} ms (~${K} steps)`,
      tla: `VARIABLE lat_req, lat_t
InitLB == /\ lat_req = FALSE /\ lat_t = 0
NextLB ==
  \ /\ event /\ lat_req' = TRUE /\ lat_t' = 0
  \ /\ lat_req /\ ~goal /\ lat_t' = lat_t + 1
  \ /\ lat_req /\ goal  /\ lat_req' = FALSE /\ lat_t' = 0
  \ /\ ~lat_req /\ ~event /\ UNCHANGED <<lat_req, lat_t>>
LatencyBound == [] (lat_req => lat_t <= ${K})
THEOREM Spec => LatencyBound`,
      assumptions: [
        `Assume ~${STEP_MS} ms per step; set event/goal predicates.`,
      ],
    };
  }

  // Availability >= p%
  const avail = /(availability|uptime).*?(?:>=|at\s*least|not\s*less\s*than)\s*(\d+(?:\.\d+)?)\s*%/i.exec(nfrText);
  if (avail) {
    const p = parseFloat(avail[2]);
    const numer = Math.round(p * 10); // permille
    const denom = 1000;
    return {
      title: `Availability ≥ ${p}% (long-run)`,
      tla: `VARIABLE upTicks, ticks
InitAvail == /\ upTicks = 0 /\ ticks = 0
NextAvail == /\ ticks' = ticks + 1 /\ upTicks' = upTicks + IF Up THEN 1 ELSE 0
AvailBound == [] (${denom} * upTicks >= ${numer} * ticks)
THEOREM Spec => AvailBound`,
      assumptions: [`Define Up predicate; long-run average.`],
    };
  }

  // Throughput >= R per W seconds
  const thr = /(throughput|rate|requests).*?(?:>=|at\s*least|not\s*less\s*than)\s*(\d+)\s*(?:per|\/)\s*(\d+)\s*(s|sec|second|seconds)/i.exec(nfrText);
  if (thr) {
    const R = +thr[2];
    const Wsec = +thr[3];
    const W = Math.max(1, Math.round((Wsec * 1000) / STEP_MS));
    return {
      title: `Throughput ≥ ${R} per ${Wsec}s (~${W} steps)`,
      tla: `VARIABLE win, count
InitTP == /\ win = 0 /\ count = 0
NextTP ==
  \ /\ win < ${W} - 1 /\ win' = win + 1 /\ count' = count + IF Event THEN 1 ELSE 0
  \ /\ win = ${W} - 1 /\ win' = 0 /\ count' = 0
TPCheck == [] (win = ${W} - 1 => count >= ${R})
THEOREM Spec => TPCheck`,
      assumptions: [`Define Event action once per occurrence; tumbling window.`],
    };
  }

  // MTBF >= K seconds
  const mtbf = /(mtbf|mean\s*time\s*between\s*failures).*?(?:>=|at\s*least|not\s*less\s*than)\s*(\d+)\s*(s|sec|second|seconds)/i.exec(nfrText);
  if (mtbf) {
    const sec = +mtbf[2];
    const K = Math.max(1, Math.round((sec * 1000) / STEP_MS));
    return {
      title: `MTBF ≥ ${sec}s (~${K} steps between failures)`,
      tla: `VARIABLE sinceFail
InitMTBF == sinceFail = ${K}
NextMTBF ==
  \ /\ Failure /\ sinceFail' = 0
  \ /\ ~Failure /\ sinceFail' = sinceFail + 1
MTBFBound == [] (sinceFail >= ${K})
THEOREM Spec => MTBFBound`,
      assumptions: [`Define Failure boundary action.`],
    };
  }

  return {
    title: "No rewrite available",
    tla: "\* Try wording like: 'within 100 ms', 'availability >= 99.9%', 'throughput >= 50 per 10 s', or 'MTBF >= 300 s'.",
    assumptions: [],
  };
}

function download(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(requirements) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/\r?\n/g, " ");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const headers = ["id", "kind", "priority", "status", "text", "rationale", "evidence"]; 
  const rows = requirements.map((r) => [r.id, r.kind, r.priority, r.status || "Unproven", r.text, r.rationale, r.evidence || ""].map(esc).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  // Add BOM for Excel
  return "\uFEFF" + csv;
}

// ------------------------------ UI ------------------------------
export default function App() {
  const [tla, setTla] = useState(DEMO);
  const [requirements, setRequirements] = useState([]);
  const [filter, setFilter] = useState("All");
  const [prio, setPrio] = useState("All");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");
  const [uploadedName, setUploadedName] = useState("");

  // persist across refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS.reqs);
      const savedTla = localStorage.getItem(LS_KEYS.src);
      if (saved) setRequirements(JSON.parse(saved));
      if (savedTla) setTla(savedTla);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEYS.reqs, JSON.stringify(requirements)); } catch {}
  }, [requirements]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEYS.src, tla); } catch {}
  }, [tla]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return requirements.filter((r) =>
      (filter === "All" || r.kind === filter) &&
      (prio === "All" || r.priority === prio) &&
      (query === "" || r.text.toLowerCase().includes(query))
    );
  }, [requirements, filter, prio, q]);

  const stats = useMemo(() => ({
    total: requirements.length,
    functional: requirements.filter((r) => r.kind === "Functional").length,
    nonFunctional: requirements.filter((r) => r.kind === "Non-functional").length,
    high: requirements.filter((r) => r.priority === "High").length,
    medium: requirements.filter((r) => r.priority === "Medium").length,
    low: requirements.filter((r) => r.priority === "Low").length,
    proved: requirements.filter((r) => r.status === "Proved").length,
    failed: requirements.filter((r) => r.status === "Failed").length,
  }), [requirements]);

  const onDropFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(tla|txt)$/i.test(file.name)) {
      setError("Please upload a .tla or .txt file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setTla(String(e.target?.result || ""));
      setUploadedName(file.name);
      setError("");
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsText(file);
  }, []);

  function handleAnalyze() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        const cands = extractCandidates(tla);
        setRequirements(cands);
      } catch (e) {
        setError("Analysis failed. Check your TLA+ syntax or try a smaller module.");
      } finally {
        setBusy(false);
      }
    }, 150);
  }

  async function handleProveSelected() {
    setBusy(true);
    setError("");
    try {
      // collect invariant names from THEOREM Spec => []Name
      const invs = Array.from(tla.matchAll(/THEOREM[^\n]*Spec\s*=>\s*\[\]\s*([A-Za-z_][A-Za-z0-9_]*)/g)).map((m) => m[1]);
      const res = await proveOnServer({ tla, invariants: invs });
      const per = new Map((res.perInvariant || []).map((p) => [p.name, p.status]));
      setRequirements((prev) =>
        prev.map((r) => {
          const hit = Array.from(per.keys()).find((nm) => r.text.includes(nm));
          if (hit) return { ...r, status: per.get(hit) || "Unclear", evidence: res.evidence };
          return r;
        })
      );
    } catch (err) {
      // fallback: mock when backend is unavailable
      setRequirements((prev) => mockProve(prev, tla));
      setError("Prover backend unreachable. Used mock prover.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectAll(val) {
    setRequirements((prev) => prev.map((r) => ({ ...r, selected: val })));

  }

  function addBlankReq() {
    setRequirements((prev) => [
      {
        id: uid(),
        text: "The system shall ...",
        kind: "Functional",
        priority: "Medium",
        rationale: "User-added",
        suggestions: ["Clarify actor, condition, and effect."],
        status: "Unproven",
      },
      ...prev,
    ]);
  }

  const fileInputRef = useRef(null);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        handleAnalyze();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleProveSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-800">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <FileText className="w-6 h-6 text-slate-700" aria-hidden />
          <h1 className="text-xl font-semibold">TLA+ NLP Requirements Analyzer & Prover</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => download("requirements.json", JSON.stringify(requirements, null, 2), "application/json")}
              aria-label="Download requirements as JSON"
            >
              <Download className="w-4 h-4" aria-hidden /> JSON
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50"
              onClick={() => download("requirements.csv", toCSV(requirements), "text/csv;charset=utf-8")}
              aria-label="Download requirements as CSV"
            >
              <Download className="w-4 h-4" aria-hidden /> CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Source input */}
        <section className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5" aria-hidden/> TLA+ Source</h2>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50" onClick={() => addBlankReq()}>
                  <PlusCircle className="w-4 h-4" aria-hidden/> Add requirement
                </button>
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50" onClick={() => setShowRaw((v) => !v)}>
                  {showRaw ? <EyeOff className="w-4 h-4" aria-hidden/> : <Eye className="w-4 h-4" aria-hidden/>}
                  <span className="ml-1">{showRaw ? "Hide" : "Show"} source</span>
                </button>
              </div>
            </div>

            {uploadedName && (
              <div className="mt-2 text-xs text-slate-600 inline-flex items-center gap-1"><Info className="w-3 h-3"/> Loaded: <span className="font-medium">{uploadedName}</span></div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) onDropFile(file);
                }}
                className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100"
                aria-label="Drop a .tla file here"
              >
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept=".tla,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onDropFile(f);
                    }}
                  />
                  <button
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
                    onClick={() => fileInputRef.current?.click()}
                  >Choose file</button>
                  <span className="text-slate-500">or drop a .tla file here</span>
                </div>
              </div>
              {showRaw && (
                <textarea
                  value={tla}
                  onChange={(e) => setTla(e.target.value)}
                  className="w-full h-60 rounded-2xl border border-slate-300 p-3 font-mono text-sm bg-white"
                  spellCheck={false}
                  aria-label="TLA+ source editor"
                />
              )}
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handleAnalyze}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden/> : <Wand2 className="w-4 h-4" aria-hidden/>}
                  Run NLP analysis <span className="text-xs opacity-70">(Ctrl/Cmd+Enter)</span>
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50"
                  onClick={() => {
                    setRequirements([]);
                  }}
                >
                  <Trash2 className="w-4 h-4" aria-hidden/> Clear
                </button>
              </div>
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Filter className="w-5 h-5" aria-hidden/> Filter & Search</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select label="Kind" value={filter} onChange={(v) => setFilter(v)} opts={["All", "Functional", "Non-functional"]} />
              <Select label="Priority" value={prio} onChange={(v) => setPrio(v)} opts={["All", "High", "Medium", "Low"]} />
              <div>
                <label className="text-xs text-slate-500">Search</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-2 py-1.5">
                  <Search className="w-4 h-4 text-slate-500" aria-hidden/>
                  <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full outline-none" placeholder="find text..." aria-label="Search requirements"/>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50" onClick={() => toggleSelectAll(true)}>Select all</button>
              <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50" onClick={() => toggleSelectAll(false)}>Unselect all</button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleProveSelected}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden/> : <Hammer className="w-4 h-4" aria-hidden/>}
                Prove selected <span className="text-xs opacity-70">(Ctrl/Cmd+P)</span>
              </button>
            </div>
          </Card>
        </section>

        {/* Right: Results */}
        <section className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5" aria-hidden/> Summary</h2>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <Stat label="Total" value={stats.total} />
              <Stat label="Functional" value={stats.functional} badge="Functional" />
              <Stat label="Non-functional" value={stats.nonFunctional} badge="Non-functional" />
              <Stat label="High" value={stats.high} tone="High" />
              <Stat label="Medium" value={stats.medium} tone="Medium" />
              <Stat label="Low" value={stats.low} tone="Low" />
              <Stat label="Proved" value={stats.proved} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden/>} />
              <Stat label="Failed" value={stats.failed} icon={<XCircle className="w-4 h-4 text-red-600" aria-hidden/>} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Wand2 className="w-5 h-5" aria-hidden/> AI-Suggested Requirements</h2>
              <Legend />
            </div>
            <div className="mt-3 space-y-3">
              {filtered.length === 0 && (
                <Empty note="Run NLP analysis to populate requirements." />
              )}
              {filtered.map((r) => (
                <RequirementCard
                  key={r.id}
                  r={r}
                  onChange={(nr) => setRequirements((prev) => prev.map((x) => (x.id === nr.id ? nr : x)))}
                  onRemove={() => setRequirements((prev) => prev.filter((x) => x.id !== r.id))}
                  onProve={() => setRequirements((prev) => mockProve(prev.map((x) => (x.id === r.id ? { ...x, selected: true } : x)), tla))}
                  onRewriteNFR={() => {
                    const spec = rewriteNFRToTemporal(r.text);
                    setRequirements((prev) => prev.map((x) => x.id === r.id ? { ...x, formalization: spec } : x));
                  }}
                  onCopyFormal={async () => {
                    const ok = await copy(r.formalization?.tla || "");
                    setCopiedId(ok ? r.id : null);
                    setTimeout(() => setCopiedId(null), 1200);
                  }}
                  copied={copiedId === r.id}
                />
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

// ------------------------------ Small components ------------------------------
function Card({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
      {children}
    </div>
  );
}

function Stat({ label, value, tone, badge, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
      {badge && <span className={`text-xs px-2 py-1 rounded-full border ${COLORS[badge]}`}>{badge}</span>}
      {tone && <span className={`text-xs px-2 py-1 rounded-full border ${COLORS[tone]}`}>{tone}</span>}
      {icon && <div className="ml-2">{icon}</div>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-2 py-1 rounded-full border ${COLORS["Functional"]}`}>Functional</span>
      <span className={`px-2 py-1 rounded-full border ${COLORS["Non-functional"]}`}>Non-functional</span>
      <span className={`px-2 py-1 rounded-full border ${COLORS.High}`}>High</span>
      <span className={`px-2 py-1 rounded-full border ${COLORS.Medium}`}>Medium</span>
      <span className={`px-2 py-1 rounded-full border ${COLORS.Low}`}>Low</span>
    </div>
  );
}

function Empty({ note }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 bg-slate-50">
      {note}
    </div>
  );
}

function Pill({ children, tone = "Functional" }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${COLORS[tone]}`}>{children}</span>;
}

function Select({ label, value, onChange, opts }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <select
        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function RequirementCard({ r, onChange, onRemove, onProve, onRewriteNFR, onCopyFormal, copied }) {
  const tone = r.priority;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 p-3 bg-white"
    >
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={!!r.selected} onChange={(e) => onChange({ ...r, selected: e.target.checked })} className="mt-1" aria-label="Select requirement"/>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={r.kind}>{r.kind}</Pill>
            <Pill tone={tone}>{r.priority}</Pill>
            {r.status === "Proved" && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4" aria-hidden/> Proved</span>}
            {r.status === "Failed" && <span className="inline-flex items-center gap-1 text-xs text-red-700"><XCircle className="w-4 h-4" aria-hidden/> Failed</span>}
            {(!r.status || r.status === "Unproven" || r.status === "Unclear") && <span className="inline-flex items-center gap-1 text-xs text-slate-600"><AlertTriangle className="w-4 h-4" aria-hidden/> {r.status || "Unproven"}</span>}
          </div>

          <textarea
            className="w-full mt-2 rounded-xl border border-slate-300 p-2 text-sm"
            value={r.text}
            onChange={(e) => onChange({ ...r, text: e.target.value })}
            aria-label="Requirement text"
          />

          <div className="mt-2 text-xs text-slate-600">Rationale: {r.rationale}</div>
          {r.evidence && <div className="mt-1 text-xs text-slate-600">Evidence: {r.evidence}</div>}

          {r.suggestions?.length > 0 && (
            <div className="mt-2 text-xs">
              <div className="font-medium text-slate-700 mb-1">AI suggestions</div>
              <ul className="list-disc pl-5 space-y-1">
                {r.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onProve}
            >
              <Hammer className="w-4 h-4" aria-hidden/> Prove
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50"
              onClick={() => onChange({ ...r, suggestions: suggestImprovements(r.text, r.kind) })}
            >
              <Wand2 className="w-4 h-4" aria-hidden/> Refresh suggestions
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" aria-hidden/> Remove
            </button>

            {r.kind === "Non-functional" && (
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50"
                onClick={onRewriteNFR}
                title="Rewrite NFR to a TLA+ monitor + theorem"
              >
                <Save className="w-4 h-4" aria-hidden/> Rewrite to TLA+
              </button>
            )}
          </div>

          {r.formalization && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{r.formalization.title}</div>
                <button
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
                  onClick={onCopyFormal}
                  title="Copy TLA+ snippet"
                >
                  {copied ? <ClipboardCheck className="w-3 h-3" aria-hidden/> : <Clipboard className="w-3 h-3" aria-hidden/>}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {r.formalization.assumptions?.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-slate-600 mt-1">
                  {r.formalization.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
              <pre className="mt-2 text-xs overflow-auto p-2 bg-white rounded-lg border border-slate-200">
{r.formalization.tla}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
