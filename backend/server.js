import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: true }));

const PORT = process.env.PORT || 8787;

// tiny utility: decide "Proved/Failed/Unclear" for an invariant name
function decideStatus(name, tla) {
  // If the TLA text contains a theorem "Spec => []<name>", call it Proved
  const theoremRe = new RegExp(`THEOREM[\\s\\S]*?Spec\\s*=>\\s*\\[\\]\\s*${name}\\b`);
  if (theoremRe.test(tla)) return "Proved";

  // If TLA has 'Next' and the text mentions 'never allow', mark as Failed (toy heuristic)
  if (/never\s+allow/i.test(tla) && /Next\s*==[\s\S]+/.test(tla)) return "Failed";

  return "Unclear";
}

app.post("/api/prove", async (req, res) => {
  const { tla = "", moduleName = "Module", invariants = [] } = req.body || {};

  // basic validation
  if (!tla || !Array.isArray(invariants)) {
    return res.status(400).json({ error: "Expected { tla, moduleName, invariants[] }" });
    }
  const timeoutMs = Number(process.env.PROVER_TIMEOUT_MS || 10000);
  let timedOut = false;

  const timer = setTimeout(() => { timedOut = true; }, timeoutMs);

  try {
    const perInvariant = invariants.map((name) => ({
      name,
      status: decideStatus(name, tla), // "Proved" | "Failed" | "Unclear"
    }));

    if (timedOut) {
      return res.status(504).json({ error: `Prover timed out after ${timeoutMs} ms` });
    }

    const evidence = `Backend examined ${moduleName} with ${invariants.length} invariant(s).`;
    return res.json({ perInvariant, evidence });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  } finally {
    clearTimeout(timer);
  }
});

app.listen(PORT, () => {
  console.log(`Prover API listening on http://localhost:${PORT}`);
});
