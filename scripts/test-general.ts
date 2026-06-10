import {
  sanitizeSvg,
  extractGauge,
  stripGauge,
  stripGaugeStreaming,
  parseJsonObject,
} from "../lib/challenges/general-pure";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? "  → " + detail : ""}`);
  }
}

console.log("=== Défi A — sanitizeSvg (rendu sûr du SVG) ===");
const messySvg = `Voici le pictogramme demandé :
\`\`\`svg
<svg viewBox="0 0 100 100" onload="alert(1)"><script>steal()</script><circle cx="50" cy="50" r="40" onclick="evil()"/><path d="M30 50 l15 15 l25 -30"/></svg>
\`\`\`
J'espère que cela convient !`;
const clean = sanitizeSvg(messySvg);
check("commence par <svg", clean.startsWith("<svg"), clean.slice(0, 20));
check("termine par </svg>", clean.endsWith("</svg>"));
check("pas de <script>", !/<script/i.test(clean));
check("pas de onload=", !/onload\s*=/i.test(clean));
check("pas de onclick=", !/onclick\s*=/i.test(clean));
check("pas de ``` résiduel", !clean.includes("```"));
check("conserve le contenu utile (circle/path)", clean.includes("<circle") && clean.includes("<path"));
check("texte autour retiré", !clean.includes("J'espère"));

console.log("\n=== Défi B — extractGauge / strip (jauge cachée) ===");
check("JAUGE: 35", extractGauge("Je comprends vos craintes.\nJAUGE: 35") === 35);
check("JAUGE : 80 (espace)", extractGauge("Intéressant.\nJAUGE : 80") === 80);
check("minuscules jauge: 5", extractGauge("jauge: 5") === 5);
check("clamp >100 -> 100", extractGauge("JAUGE: 250") === 100);
check("absente -> null", extractGauge("Pas de marqueur ici.") === null);

const finalReply = "Vous avez raison de souligner l'humain.\nJAUGE: 42";
check(
  "stripGauge retire la ligne",
  stripGauge(finalReply) === "Vous avez raison de souligner l'humain.",
  JSON.stringify(stripGauge(finalReply))
);
check(
  "stripGaugeStreaming masque le marqueur partiel",
  stripGaugeStreaming("Je vous écoute.\nJAUGE: 3") === "Je vous écoute.",
  JSON.stringify(stripGaugeStreaming("Je vous écoute.\nJAUGE: 3"))
);
check(
  "stripGaugeStreaming sans marqueur = inchangé",
  stripGaugeStreaming("Je réfléchis encore") === "Je réfléchis encore"
);

console.log("\n=== Évaluateurs — parseJsonObject (verdicts) ===");
check(
  "JSON entouré de texte",
  JSON.stringify(
    parseJsonObject('Voici: {"total":17,"details":[]} merci')
  ) === '{"total":17,"details":[]}'
);
check(
  "JSON en bloc ```",
  (parseJsonObject<{ total: number }>('```json\n{"total":12}\n```')?.total ?? 0) === 12
);
check("non-JSON -> null", parseJsonObject("aucun json") === null);

console.log(`\n=== Résultat : ${pass} OK, ${fail} KO ===`);
if (fail > 0) process.exit(1);
