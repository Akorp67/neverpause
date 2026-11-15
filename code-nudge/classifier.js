// Decides if a prompt is better suited to Claude Code (an agent that works
// on your files and runs things) or to normal chat. Runs fully locally.
//
// Returns { verdict: "code" | "maybe" | "chat", score, reasons: [...], tip }

(function (root) {
  // Each rule adds or removes points. "why" is shown to the user.
  const CODE_RULES = [
    {
      id: "repo",
      weight: 3,
      why: "It's about a codebase, repo or project folder",
      tip: "Claude Code can read your whole project, not just what you paste.",
      patterns: [
        /\b(repo|repository|codebase|code base|project folder)\b/i,
        /\b(git|github|gitlab|pull request|merge request|commit|branch)\b/i,
        /\bacross (all |the |multiple |several )?(files|modules|components|pages)\b/i,
        /\brefactor\b/i,
      ],
    },
    {
      id: "run",
      weight: 3,
      why: "It needs something run, tested or installed",
      tip: "Claude Code can run the commands itself and see what happens.",
      patterns: [
        /\b(run|rerun|execute) (the |my |all )?(tests?|script|build|app|server|command|code)\b/i,
        /\b(failing|broken) (tests?|build|deploy|pipeline|ci)\b/i,
        /\b(tests?|build|deploy|pipeline) (are|is|keeps?) (failing|broken|crashing)\b/i,
        /\b(npm|pnpm|yarn|pip|brew|cargo|docker|kubectl|terraform|make)\b/i,
        /\b(install|set ?up|configure|deploy) (the |a |my )?\w*/i,
        /\b(localhost|terminal|command line|cli)\b/i,
      ],
    },
    {
      id: "error",
      weight: 3,
      why: "There's an error or stack trace to chase down",
      tip: "Claude Code can open the files in the error, fix them and rerun to check.",
      patterns: [
        /Traceback \(most recent call last\)/,
        /^\s+at .+\(.+:\d+:\d+\)/m,
        /\b\w*(Error|Exception):\s/,
        /\b(segfault|stack trace|exit code \d+|command not found|module not found)\b/i,
      ],
    },
    {
      id: "build",
      weight: 2,
      why: "You want something built, not just explained",
      tip: "Claude Code can create the files, wire them up and test them.",
      patterns: [
        /\b(build|make|create|code|develop|ship) (me |us )?(a|an|the|my)? ?([\w-]+ ){0,3}(app|website|site|web ?page|landing page|extension|plugin|bot|tool|script|api|dashboard|game|backend|frontend|cli)\b/i,
        /\b(write|create) (a |me a )?(script|program|function|scraper)\b/i,
        /\bautomate\b/i,
        /\bscrape\b/i,
      ],
    },
    {
      id: "bulk",
      weight: 3,
      why: "It's the same job over lots of files or data",
      tip: "Claude Code can open, change and save many files in one go.",
      patterns: [
        /\b(all|every|each|these|those|\d{2,}) (of (my|the) )?(the )?(files|pdfs|images|photos|csvs?|spreadsheets|documents|docs|rows|folders|invoices|receipts)\b/i,
        /\b(rename|convert|resize|merge|split|clean up|organi[sz]e|sort) (all|every|my|these|the) /i,
      ],
    },
    {
      id: "files",
      weight: 2,
      why: "It touches files on your computer",
      tip: "Claude Code works right in your folders, no copy and paste.",
      patterns: [
        /\b(folder|directory|desktop|downloads|hard drive)\b/i,
        /\b\w+\.(csv|json|xlsx|py|js|ts|tsx|jsx|html|css|sql|yaml|yml|md)\b/i,
        /\binto a (csv|spreadsheet|json|file)\b/i,
      ],
    },
    {
      id: "steps",
      weight: 1,
      why: "It's a multi-step job, not a single answer",
      tip: "Claude Code works through steps on its own and checks its work.",
      patterns: [
        /\b(step by step|then|after that|and then|first .+ then)\b/i,
        /\b(every (day|week|morning|hour)|on a schedule|recurring)\b/i,
        /\b(end to end|from scratch|whole thing)\b/i,
      ],
    },
  ];

  const CHAT_RULES = [
    {
      weight: -3,
      patterns: [
        /^\s*(what|why|who|when|where) (is|are|was|were|does|do|did)\b/i,
        /^\s*(explain|tell me about|what's the difference|compare)\b/i,
        /^\s*how does .+ work\??\s*$/i,
      ],
    },
    {
      weight: -3,
      patterns: [
        /\b(write|draft|rewrite|reword|proofread|polish) (me )?(an? |my |this )?(email|message|post|caption|bio|letter|essay|tweet|reply|text|paragraph|story|poem|speech)\b/i,
        /\b(summari[sz]e|brainstorm|give me ideas|ideas for|translate)\b/i,
      ],
    },
  ];

  function countCodeLines(text) {
    const lines = text.split("\n");
    let n = 0;
    for (const l of lines) {
      if (/[;{}()=<>]\s*$/.test(l) || /^\s*(def|class|function|import|from|const|let|var|return|if|for|while)\b/.test(l)) n++;
    }
    return n;
  }

  function classify(text) {
    const t = (text || "").trim();
    const result = { verdict: "chat", score: 0, reasons: [], tip: "" };
    if (t.length < 12) return result;

    let score = 0;
    let bestTip = "";
    let bestWeight = 0;

    for (const rule of CODE_RULES) {
      if (rule.patterns.some((p) => p.test(t))) {
        score += rule.weight;
        result.reasons.push(rule.why);
        if (rule.weight > bestWeight) {
          bestWeight = rule.weight;
          bestTip = rule.tip;
        }
      }
    }

    // A big pasted chunk of code usually means "go fix this in my project".
    const codeLines = countCodeLines(t);
    if (/```/.test(t) || codeLines >= 6) {
      score += 2;
      result.reasons.push("You're pasting a big chunk of code");
      if (!bestTip) bestTip = "Claude Code can work on that code where it lives, in your files.";
    }

    for (const rule of CHAT_RULES) {
      if (rule.patterns.some((p) => p.test(t))) score += rule.weight;
    }

    result.score = score;
    result.tip = bestTip;
    if (score >= 5) result.verdict = "code";
    else if (score >= 3) result.verdict = "maybe";
    return result;
  }

  const api = { classify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CodeNudge = api;
})(typeof self !== "undefined" ? self : this);
