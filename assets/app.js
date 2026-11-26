/* GRPS MTSS Field Manual — behavior */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mtss:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mtss:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem("mtss:" + k); } catch (e) { /* */ } }
  };
  const AREA_LABEL = { Academic: "Academic", Attendance: "Attendance", Behavior: "Behavior / PBIS", SEL: "SEL / Mental health", "Cross-domain": "Several areas" };

  /* ---------------- Data: one list of supports ---------------- */
  const range = g => {
    const m = String(g).replace("PK", "0").replace("K", "0").match(/(\d+)\s*-\s*(\d+)/);
    return m ? [+m[1], +m[2]] : [0, 12];
  };
  const tiers = t => /all/i.test(t) ? [1, 2, 3] : (String(t).match(/\d/g) || []).map(Number);
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const SUPPORTS = [];
  (window.MTSS_ACADEMIC || []).forEach(a => SUPPORTS.push({
    id: slug(`${a.content}-${a.grade}-${a.tier}-${a.name}`), name: a.name, area: "Academic", content: a.content,
    grade: a.grade, range: range(a.grade), tierLabel: a.tier, tiers: tiers(a.tier), kind: a.kind,
    use: a.use, dose: a.dose, monitor: a.monitor, owner: "",
    rows: [["Use for", a.use], ["Dosage", a.dose], ["Monitor", a.monitor], ["GRPS note", a.note]], guard: "", link: null
  }));
  (window.MTSS_SUPPORTS || []).forEach(l => SUPPORTS.push({
    id: slug(`${l.area}-${l.name}`), name: l.name, area: l.area, content: "", grade: l.grade, range: range(l.grade),
    tierLabel: l.tier, tiers: tiers(l.tier), kind: l.focus, grps: l.grps,
    use: l.when, dose: "", monitor: l.monitor, owner: l.owner,
    rows: [["Use when", l.when], ["What it involves", l.how], ["Owner", l.owner], ["Monitor", l.monitor]], guard: l.guard, link: l.link
  }));
  const byName = n => SUPPORTS.find(s => s.name === n && s.area !== "Academic");
  const overlaps = (r, band) => { const b = range(band); return r[0] <= b[1] && r[1] >= b[0]; };
  const SCHOOLS = window.MTSS_SCHOOLS || [];

  /* ---------------- Router ---------------- */
  const PARENT = { concern: "start", pattern: "start", review: "start" };
  let current = "";
  function go(h) {
    if (window.MTSS_NOHASH) { current = h; route(); } else location.hash = h;
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#/"]');
    if (a && window.MTSS_NOHASH) { e.preventDefault(); go(a.getAttribute("href")); }
  });
  function route() {
    let h = (window.MTSS_NOHASH ? current : location.hash).replace(/^#\/?/, "");
    let [path, qs] = h.split("?");
    let [view, sub] = (path || "start").split("/");
    if (!$(`.view[data-view="${view}"]`)) { view = "start"; sub = ""; }
    const params = new URLSearchParams(qs || "");
    $$(".view").forEach(v => v.classList.toggle("on", v.dataset.view === view));
    $$(".nav a").forEach(a => { if (a.dataset.nav === (PARENT[view] || view)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const title = $(`.view[data-view="${view}"] h1`);
    document.title = (view === "start" ? "" : (title ? title.textContent + " · " : "")) + "MTSS Field Manual · GRPS";
    if (view === "supports") Supports.apply(params);
    if (view === "plan") Plan.onShow();
    if (view === "meeting") Meeting.onShow(params);
    if (view === "guide" && sub) {
      const t = document.getElementById("g-" + sub);
      if (t) {
        const go = () => t.scrollIntoView({ behavior: "instant", block: "start" });
        setTimeout(go, 30);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(go, 60));
        return;
      }
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ---------------- Shared: support row ---------------- */
  function tierPill(s) {
    const t = s.tiers.length === 1 ? s.tiers[0] : 0;
    return `<span class="tierpill ${t ? "t" + t : ""}">${esc(s.tierLabel)}</span>`;
  }
  function supportRow(s, open) {
    const meta = [AREA_LABEL[s.area] + (s.content ? " · " + s.content : ""), "Grades " + s.grade.replace("-", "–"), s.kind].filter(Boolean);
    return `<li class="srow a-${s.area}${open ? " open" : ""}" id="s-${s.id}">
      <button type="button" aria-expanded="${open ? "true" : "false"}">
        <span><h3><span class="dot"></span>${esc(s.name)}</h3><span class="meta">${meta.map(m => `<span>${esc(m)}</span>`).join("")}</span></span>
        <span style="display:flex;gap:10px;align-items:center">${tierPill(s)}<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
      <div class="sdetail">
        <dl class="kv">${s.rows.filter(r => r[1]).map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
        ${s.guard ? `<p class="guard"><b>Watch for:</b> ${esc(s.guard)}</p>` : ""}
        <div class="btns"><button type="button" class="btn small" data-addplan="${s.id}">Add to plan</button>
        ${s.link ? `<a class="btn small ghost" href="${esc(s.link[0])}" target="_blank" rel="noopener">${esc(s.link[1])} ↗</a>` : ""}</div>
      </div></li>`;
  }
  document.addEventListener("click", e => {
    const head = e.target.closest(".srow > button");
    if (head) { const row = head.parentElement; const o = row.classList.toggle("open"); head.setAttribute("aria-expanded", o); return; }
    const add = e.target.closest("[data-addplan]");
    if (add) { Plan.addSupport(add.dataset.addplan); go("#/plan"); }
  });

  /* ---------------- Guided step helper ---------------- */
  function bindOpts(container, onPick) {
    container.addEventListener("click", e => {
      const b = e.target.closest(".opt"); if (!b) return;
      const group = b.closest(".opts");
      $$(".opt", group).forEach(o => o.setAttribute("aria-pressed", o === b ? "true" : "false"));
      onPick(group.dataset.q, b.dataset.v, b);
    });
  }
  function reveal(el) { if (el.hidden) { el.hidden = false; setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 40); } }
  function markDone(stepEl) { stepEl.classList.add("done"); }

  /* ---------------- Concern flow ---------------- */
  const BARRIERS = {
    Attendance: [
      ["transportation", "Transportation, getting to school", ["Transportation Barrier Plan", "KSSN Community School Coordination", "Personalized Attendance Outreach"]],
      ["family", "Family logistics, caregiving, housing, or basic needs", ["Housing / Basic Needs Coordination", "KSSN Community School Coordination", "GRPS Parent University Connection", "Personalized Attendance Outreach"]],
      ["health", "Physical or behavioral health", ["Health Access Coordination", "School-Based Mental Health Coordination", "KSSN Community School Coordination"]],
      ["belonging", "Belonging, connection to peers or adults", ["Success Mentor / Caring Adult", "Universal SEL / Belonging Practices", "Positive Conditions for Learning"]],
      ["avoidance", "Avoidance, anxiety, or school refusal", ["School-Based Mental Health Coordination", "Personalized Attendance Outreach", "Success Mentor / Caring Adult"]],
      ["course", "A course, schedule, or school-experience barrier", ["Secondary Course Support", "EWIMS Early Warning Response", "Restorative / Re-Engagement Support"]],
      ["unknown", "Not clear yet", ["Personalized Attendance Outreach", "Success Mentor / Caring Adult", "Positive Conditions for Learning"]]
    ],
    Behavior: [
      ["routine", "Routines, expectations, or the environment", ["Classroom PBIS Foundations", "Check-In / Check-Out"]],
      ["regulation", "Self-regulation or coping", ["Targeted Social Skills / SEL Group", "Check-In / Check-Out", "GRPS SEL Family & Scholar Resources"]],
      ["relationship", "Conflict with peers or adults", ["GRPS Restorative Practices", "Restorative / Re-Engagement Support", "Targeted Social Skills / SEL Group"]],
      ["function", "A repeated behavior with a likely trigger or function", ["Check-In / Check-Out", "Classroom PBIS Foundations", "Integrated Intensive Plan"]],
      ["reentry", "Re-entry or repair after harm or exclusion", ["Restorative / Re-Engagement Support", "GRPS Restorative Practices"]],
      ["unknown", "Not clear yet", ["Classroom PBIS Foundations", "Check-In / Check-Out"]]
    ],
    SEL: [
      ["belonging", "Belonging or connection", ["Universal SEL / Belonging Practices", "Success Mentor / Caring Adult", "GRPS Caring School Community", "GRPS Second Step Middle School", "GRPS Wayfinder High School Pilot"]],
      ["coping", "Coping or emotional regulation", ["Targeted Social Skills / SEL Group", "GRPS SEL Family & Scholar Resources", "School-Based Mental Health Coordination"]],
      ["relationship", "Relationships or conflict", ["GRPS Restorative Practices", "Targeted Social Skills / SEL Group"]],
      ["mental", "A mental-health concern affecting school", ["School-Based Mental Health Coordination", "Integrated Intensive Plan"]],
      ["grief", "Grief, stress, or a significant life event", ["School-Based Mental Health Coordination", "GRPS SEL Family & Scholar Resources", "KSSN Community School Coordination"]],
      ["unknown", "Not clear yet", ["Universal SEL / Belonging Practices", "Targeted Social Skills / SEL Group"]]
    ],
    "Cross-domain": [
      ["att-acad", "Attendance and academics", ["EWIMS Early Warning Response", "Secondary Course Support", "Personalized Attendance Outreach", "Skill-Specific Small Group"]],
      ["beh-acad", "Behavior and academics", ["Skill-Specific Small Group", "Check-In / Check-Out", "Classroom PBIS Foundations"]],
      ["sel-att", "SEL / mental health and attendance", ["School-Based Mental Health Coordination", "Success Mentor / Caring Adult", "Personalized Attendance Outreach"]],
      ["family", "A family or community barrier affecting several areas", ["KSSN Community School Coordination", "Housing / Basic Needs Coordination", "GRPS Parent University Connection"]],
      ["multiple", "Several needs, primary driver unclear", ["Integrated Intensive Plan", "EWIMS Early Warning Response", "KSSN Community School Coordination"]]
    ]
  };
  const TIER1 = {
    Attendance: ["Positive Conditions for Learning"], Behavior: ["Classroom PBIS Foundations", "GRPS Restorative Practices"],
    SEL: ["Universal SEL / Belonging Practices", "GRPS Caring School Community", "GRPS Second Step Middle School", "GRPS Wayfinder High School Pilot"],
    "Cross-domain": ["EWIMS Early Warning Response", "Positive Conditions for Learning"]
  };
  const PATHS = {
    Academic: { first: "Name the specific skill, standard, or access concern. Check whether the pattern is really a Tier 1 issue before building an individual plan.", roles: ["principal", "ssc", "counselor"], note: "Bring in FSS or KSSN only when an attendance, family, or community barrier is part of the academic need." },
    Attendance: { first: "Find out why the scholar is missing school before choosing a support. A call or letter is an action; the intervention is what removes the barrier.", roles: ["principal", "fss", "kssn", "ssc", "counselor"], note: "FSS is the primary family-facing attendance support. Add KSSN where community or cross-system coordination is needed." },
    Behavior: { first: "Describe the observable behavior, when and where it happens, how often, and its impact. Check Tier 1 routines first, then match support to the likely function.", roles: ["principal", "behavior_specialist", "ssc", "social_worker", "psychologist"], note: "Consequence history alone isn't a problem definition." },
    SEL: { first: "Clarify the concern, the scholar's strengths, the setting, and the impact on learning. Match the response to the level of need and involve qualified mental-health staff when appropriate.", roles: ["principal", "counselor", "mental_health", "social_worker", "psychologist", "kssn"], note: "For an immediate safety concern, use the district's crisis and safety procedures, not this planning pathway." },
    "Cross-domain": { first: "Don't pick a tier or a referral yet. Describe what's happening across academics, attendance, behavior, and experience, and aim for one coordinated plan rather than several parallel referrals.", roles: ["principal", "fss", "ssc", "counselor", "kssn"], note: "One problem definition, one plan, one owner." }
  };
  const ROLE_LABEL = { principal: "Principal / school lead", fss: "Family Support Specialist", kssn: "KSSN Coordinator", counselor: "School counselor", ssc: "Scholar Success Coordinator", mental_health: "Mental health clinician", social_worker: "School social worker", psychologist: "School psychologist", behavior_specialist: "Behavior specialist" };

  const Concern = (() => {
    const st = { area: "", grade: "", barrier: "", scope: "" };
    const view = $('[data-view="concern"]');
    function barrierStep() {
      const opts = $("#c3-opts");
      if (st.area === "Academic") {
        $("#c3-title").textContent = "Which content area?";
        $("#c3-hint").textContent = "Start with the clearest instructional need.";
        const contents = [...new Set(SUPPORTS.filter(s => s.area === "Academic" && overlaps(s.range, st.grade)).map(s => s.content))];
        opts.classList.remove("stack");
        opts.innerHTML = contents.map(c => `<button class="opt" data-v="${esc(c)}">${esc(c)}</button>`).join("");
      } else {
        $("#c3-title").textContent = "What seems to be getting in the way?";
        $("#c3-hint").textContent = "This isn't a diagnosis. It points the team toward a support that fits.";
        opts.classList.add("stack");
        opts.innerHTML = BARRIERS[st.area].map(b => `<button class="opt" data-v="${b[0]}">${esc(b[1])}</button>`).join("");
      }
    }
    function matches() {
      const fits = s => overlaps(s.range, st.grade);
      if (st.area === "Academic") {
        const pool = SUPPORTS.filter(s => s.area === "Academic" && s.content === st.barrier && fits(s));
        if (st.scope === "many") return pool.filter(s => s.tiers.includes(1));
        return [...pool.filter(s => s.tierLabel === "Tier 2"), ...pool.filter(s => s.tierLabel === "Tier 3"), ...pool.filter(s => s.tierLabel === "All tiers")];
      }
      const names = st.scope === "many" ? TIER1[st.area] : (BARRIERS[st.area].find(b => b[0] === st.barrier) || [, , []])[2];
      return names.map(byName).filter(s => s && fits(s));
    }
    function people(school) {
      const d = SCHOOLS.find(s => s.name === school);
      if (!d) return `<p class="muted small">Choose your school to see the people most likely to help.</p>`;
      const list = PATHS[st.area].roles.map(r => {
        if (r === "kssn") {
          if (d.kssn_status === "vacant") return [ROLE_LABEL.kssn, "Partner school; position currently vacant"];
          if (d.kssn_status !== "partner" || !d.kssn) return null;
        }
        return d[r] ? [ROLE_LABEL[r], d[r]] : null;
      }).filter(Boolean);
      return list.length ? `<div class="people">${list.map(p => `<div class="person"><small>${esc(p[0])}</small><b>${esc(p[1])}</b></div>`).join("")}</div>`
        : `<p class="muted small">No listed staff for these roles. Use the building SST to name an owner.</p>`;
    }
    function render() {
      const out = $("#c-result");
      const p = PATHS[st.area];
      const school = store.get("school", "");
      const list = matches();
      const many = st.scope === "many";
      const first = many ? "This looks like a Tier 1 pattern. Before writing individual plans, check whether core instruction, routines, access, or conditions need strengthening." : p.first;
      const label = st.area === "Academic" ? `${st.barrier} · grades ${st.grade.replace("-", "–")}` : AREA_LABEL[st.area];
      out.innerHTML = `
        <div class="first-move"><span class="eyebrow">Your first move</span><p>${esc(first)}</p></div>
        ${many ? `<div class="btns"><a class="btn" href="#/pattern">Run the Tier 1 check</a></div>` : ""}
        <p class="callout">${esc(p.note)}</p>
        <div class="block"><h3>Who can help</h3>
          <div class="fgroup" style="max-width:420px"><label class="l sr" for="c-school">Your school</label>
          <select id="c-school"><option value="">Choose your school…</option>${SCHOOLS.map(s => `<option${s.name === school ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
          <div id="c-people">${people(school)}</div></div>
        <div class="block"><h3>${many ? "Tier 1 supports" : "Supports that match"} <span class="muted small" style="font-family:var(--sans);font-weight:400">· ${esc(label)}</span></h3>
          ${list.length ? `<ul class="slist">${list.map((s, i) => supportRow(s, i === 0)).join("")}</ul>` : `<p class="muted">No exact match. <a href="#/supports?area=${encodeURIComponent(st.area)}">Browse all ${esc(AREA_LABEL[st.area])} supports</a>.</p>`}
          ${!many && st.area === "Academic" ? `<p class="small muted" style="margin-top:12px">Tier 3 options are for needs that haven't responded to well-implemented Tier 2. Use the <a href="#/review">review check</a> before intensifying.</p>` : ""}
        </div>
        <div class="btns"><button type="button" class="btn" id="c-plan">Start a plan</button><a class="btn ghost" href="#/supports?area=${encodeURIComponent(st.area)}">See all ${esc(AREA_LABEL[st.area])} supports</a></div>`;
      $("#c-school").addEventListener("change", e => { store.set("school", e.target.value); $("#c-people").innerHTML = people(e.target.value); });
      $("#c-plan").addEventListener("click", () => {
        Plan.prefill({ area: AREA_LABEL[st.area], school: store.get("school", ""), who: st.scope === "group" ? "Small group, grades " + st.grade.replace("-", "–") : "" });
        go("#/plan");
      });
      reveal(out);
    }
    bindOpts(view, (q, v) => {
      st[q] = v;
      if (q === "area") { st.barrier = ""; markDone($("#c1")); reveal($("#c2")); if (st.grade) { barrierStep(); $("#c3").hidden = false; } }
      if (q === "grade") { markDone($("#c2")); barrierStep(); st.barrier = ""; reveal($("#c3")); }
      if (q === "barrier") { markDone($("#c3")); reveal($("#c4")); }
      if (q === "scope") markDone($("#c4"));
      if (st.area && st.grade && st.barrier && st.scope) render(); else $("#c-result").hidden = true;
    });
  })();

  /* ---------------- Yes/no flows (pattern, review) ---------------- */
  function yesNoFlow(rootSel, resultSel, questions, decide) {
    const root = $(rootSel), ans = {};
    root.innerHTML = questions.map((q, i) => `
      <div class="step" id="${rootSel.slice(1)}-${i}" ${i ? "hidden" : ""}>
        <div class="step-q"><span class="k">${i + 1}</span><h2>${esc(q.q)}</h2></div>
        ${q.hint ? `<p class="hint">${esc(q.hint)}</p>` : ""}
        <div class="opts" data-q="${q.id}">${q.opts.map(o => `<button class="opt" data-v="${o[0]}">${esc(o[1])}</button>`).join("")}</div>
      </div>`).join("");
    bindOpts(root, (id, v) => {
      ans[id] = v;
      const i = questions.findIndex(q => q.id === id);
      markDone($(`${rootSel}-${i}`));
      const next = $(`${rootSel}-${i + 1}`);
      if (next) reveal(next);
      if (questions.every(q => ans[q.id])) { const out = $(resultSel); out.innerHTML = decide(ans); reveal(out); }
    });
  }

  yesNoFlow("#pattern-steps", "#p-result", [
    { id: "out", q: "Are most scholars meeting the expected outcome?", hint: "Use the district's adopted benchmark or decision rule.", opts: [["yes", "Yes"], ["no", "No, substantially below"]] },
    { id: "impl", q: "Is Tier 1 being implemented consistently?", hint: "Core curriculum, routines, universal supports, pacing.", opts: [["yes", "Yes"], ["no", "No or not sure"]] },
    { id: "conc", q: "Is the pattern concentrated somewhere?", hint: "A classroom, grade, course, subgroup, time of day, or setting.", opts: [["yes", "Yes"], ["no", "No clear concentration"]] },
    { id: "exp", q: "Do scholar or family experience data point to a condition?", hint: "Belonging, safety, schedule, opportunity to learn, access.", opts: [["yes", "Yes"], ["no", "No or unknown"]] }
  ], a => {
    const moves = [];
    if (a.impl === "no") moves.push(["Repair Tier 1 implementation first", "Verify the core curriculum, routines, and universal supports are actually happening as designed. Outcome data can't be interpreted until they are."]);
    if (a.out === "no" && a.impl === "yes") moves.push(["Strengthen the core itself", "Implementation is in place but outcomes aren't. Look at the instructional sequence, prerequisite demands, opportunities to respond, and feedback."]);
    if (a.conc === "yes") moves.push(["Focus where it's concentrated", "Disaggregate by classroom, course, subgroup, time, and setting. Target the change to where the pattern lives."]);
    if (a.exp === "yes") moves.push(["Change the condition", "Address the belonging, access, schedule, or climate condition the experience data point to, and measure whether it changes."]);
    const healthy = !moves.length;
    return `
      <div class="first-move"><span class="eyebrow">${healthy ? "Tier 1 looks healthy" : "This is a system response"}</span>
      <p>${healthy ? "Core conditions look sound. Move to scholar or small-group problem solving for those who still need more." : "Take the smallest system change likely to help, then monitor both implementation and outcomes before identifying who still needs supplemental support."}</p></div>
      ${moves.length ? `<table class="tbl" style="margin-top:22px"><tbody>${moves.map(m => `<tr><td>${esc(m[0])}</td><td>${esc(m[1])}</td></tr>`).join("")}</tbody></table>` : ""}
      <p class="callout calm"><b>Owner:</b> the Building MTSS Leadership Team, working with the grade or content team that controls the condition.</p>
      <div class="btns">${healthy ? `<a class="btn" href="#/concern">Look at individual needs</a>` : `<a class="btn" href="#/meeting?decision=${encodeURIComponent("Take a Tier 1 / system action")}&level=2">Record a system decision</a>`}
      <a class="btn ghost" href="#/guide/academic">Tier 1 essential ingredients</a></div>`;
  });

  yesNoFlow("#review-steps", "#r-result", [
    { id: "data", q: "Is there enough progress data to see a trend?", opts: [["yes", "Yes"], ["no", "No"]] },
    { id: "fid", q: "Was the support delivered with acceptable fidelity?", hint: "Sessions happened, at the planned dosage, with the critical components.", opts: [["yes", "Yes"], ["no", "No or not sure"]] },
    { id: "acc", q: "Did the scholar have adequate access to it?", hint: "Attendance, schedule, transportation, or behavior didn't block participation.", opts: [["yes", "Yes"], ["no", "No"]] },
    { id: "resp", q: "Is progress on track toward the goal?", opts: [["yes", "Yes, on track"], ["no", "No, inadequate"]] }
  ], a => {
    let d;
    if (a.data === "no") d = ["Continue and collect evidence", "Keep the current plan long enough to get interpretable data.", "Next data point and review date.", "Continue current plan"];
    else if (a.fid === "no") d = ["Repair implementation", "Fix scheduling, staffing, training, or dosage before concluding the support is ineffective.", "The fidelity gap, the coaching or support provided, and a follow-up check.", "Repair implementation fidelity"];
    else if (a.acc === "no") d = ["Remove the access barrier", "Low exposure isn't intervention failure. Address what kept the scholar from receiving the support.", "The barrier, the barrier-removal plan, and an exposure target.", "Address an access barrier"];
    else if (a.resp === "no") d = ["Intensify deliberately", "Use diagnostic information to change one or two things: more time or frequency, a smaller group, more explicit instruction, more opportunities to respond and feedback. Keep the same target.", "The change and why, a phase line or start date, a new fidelity check, and a review date.", "Adjust / intensify"];
    else d = ["Continue, fade, or exit", "Follow the decision rule set at the start. If the goal is met and stable, reduce support while Tier 1 continues.", "Response evidence and a maintenance or transition plan.", "Continue current plan"];
    return `
      <div class="first-move"><span class="eyebrow">Decision</span><p><b>${esc(d[0])}.</b> ${esc(d[1])}</p></div>
      <p class="callout calm"><b>Document:</b> ${esc(d[2])}</p>
      <div class="btns"><a class="btn" href="#/meeting?decision=${encodeURIComponent(d[3])}">Record this decision</a><a class="btn ghost" href="#/plan">Update the plan</a></div>`;
  });

  /* ---------------- Meeting ---------------- */
  const LEVELS = [
    ["Start here when the need can be handled through core instruction, routines, early support, or a decision the immediate team controls.", "the scholar needs extra attention or the first strategy didn't work."],
    ["Start here when an individual need is defined and needs coordinated supports, several roles, monitoring, or a decision beyond one classroom.", "a referral form was completed. SST is a problem-solving team, not a referral destination."],
    ["Start here when many scholars share the pattern or Tier 1, schedules, staffing, or intervention capacity are involved.", "there are several individual cases. Look for the shared pattern first."],
    ["Start here when the issue recurs across schools or needs district policy, resources, data, or cross-department coordination.", "the building wants more help. Name the specific barrier that can't be solved locally."]
  ];
  const Meeting = (() => {
    const form = $("#decision");
    const ids = ["who", "date", "area", "decision", "problem", "hyp", "voice", "evidence", "plan", "owner", "review", "rule"];
    const read = () => Object.fromEntries(ids.map(k => [k, $("#d-" + k).value]));
    const write = o => ids.forEach(k => { $("#d-" + k).value = o[k] || ""; });
    write(store.get("decision", {}));
    form.addEventListener("input", () => store.set("decision", read()));
    bindOpts($("#m-level").parentElement, (q, v) => {
      const L = LEVELS[+v];
      $("#m-level-out").innerHTML = `<p class="callout calm">${esc(L[0])}<br><b>Don't escalate just because</b> ${esc(L[1])}</p>`;
    });
    $("#d-print").addEventListener("click", () => {
      const r = read();
      printDoc("MTSS Decision Record", [r.who, r.area, r.date && "Meeting " + fmtDate(r.date)].filter(Boolean).join(" · "), [
        ["Problem statement", r.problem], ["Root cause / need hypothesis", r.hyp], ["Scholar & family perspective", r.voice], ["Evidence considered", r.evidence],
        ["Decision", r.decision], ["Intervention / action", r.plan], ["Owner & partners", r.owner], ["Progress measure & decision rule", r.rule], ["Next review", fmtDate(r.review)]]);
    });
    $("#d-clear").addEventListener("click", () => { write({}); store.del("decision"); });
    $("#d-toplan").addEventListener("click", () => {
      const r = read();
      Plan.prefill({ who: r.who, area: r.area, need: r.problem, cause: r.hyp, voice: r.voice, support: r.plan, owner: r.owner, review: r.review, rule: r.rule });
      go("#/plan");
    });
    return {
      onShow(params) {
        if (params.get("decision")) { $("#d-decision").value = params.get("decision"); store.set("decision", read()); }
        if (params.get("level")) { const b = $(`#m-level .opt[data-v="${params.get("level")}"]`); if (b) b.click(); }
        if (!$("#d-date").value) $("#d-date").value = new Date().toISOString().slice(0, 10);
      }
    };
  })();

  /* ---------------- Supports library ---------------- */
  const Supports = (() => {
    const f = { area: "All", content: "All", grade: "All", tier: "All", q: "" };
    const opts = {
      area: [["All", "All"], ["Academic", "Academic"], ["Attendance", "Attendance"], ["Behavior", "Behavior / PBIS"], ["SEL", "SEL / Mental health"], ["Cross-domain", "Cross-domain"]],
      content: [["All", "All"], ...[...new Set(SUPPORTS.filter(s => s.content).map(s => s.content))].map(c => [c, c])],
      grade: [["All", "All"], ["K-5", "PK–5"], ["6-8", "6–8"], ["9-12", "9–12"]],
      tier: [["All", "All"], ["1", "Tier 1"], ["2", "Tier 2"], ["3", "Tier 3"]]
    };
    function chips() {
      Object.keys(opts).forEach(k => {
        $(`[data-f="${k}"]`).innerHTML = opts[k].map(o => `<button type="button" class="chip${k === "area" && o[0] !== "All" ? " a-" + o[0] : ""}" data-v="${esc(o[0])}" aria-pressed="${f[k] === o[0]}">${k === "area" && o[0] !== "All" ? '<span class="dot"></span>' : ""}${esc(o[1])}</button>`).join("");
      });
      $("#f-content-grp").hidden = f.area !== "Academic";
    }
    function render(openId) {
      const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
      const list = SUPPORTS.filter(s =>
        (f.area === "All" || s.area === f.area) &&
        (f.area !== "Academic" || f.content === "All" || s.content === f.content) &&
        (f.grade === "All" || overlaps(s.range, f.grade)) &&
        (f.tier === "All" || s.tiers.includes(+f.tier)) &&
        (!words.length || words.every(w => (s.name + " " + s.content + " " + s.kind + " " + s.rows.map(r => r[1]).join(" ") + " " + s.guard).toLowerCase().includes(w))));
      $("#s-count").textContent = `${list.length} support${list.length === 1 ? "" : "s"}`;
      $("#s-list").innerHTML = list.length ? list.map(s => supportRow(s, s.id === openId)).join("") : `<li class="muted" style="padding:20px 0">Nothing matches. Try a broader word or clear a filter.</li>`;
      if (openId) { const el = document.getElementById("s-" + openId); if (el) setTimeout(() => el.scrollIntoView({ block: "center" }), 40); }
    }
    $("#s-filters").addEventListener("click", e => {
      const c = e.target.closest(".chip"); if (!c) return;
      const k = c.parentElement.dataset.f; f[k] = c.dataset.v;
      if (k === "area") f.content = "All";
      chips(); render();
    });
    $("#s-q").addEventListener("input", e => { f.q = e.target.value; render(); });
    chips();
    return {
      apply(p) {
        if ([...p.keys()].length) {
          Object.assign(f, { area: "All", content: "All", grade: "All", tier: "All", q: "" });
          ["area", "content", "grade", "tier", "q"].forEach(k => { if (p.get(k)) f[k] = p.get(k); });
          $("#s-q").value = f.q;
        }
        chips(); render(p.get("open"));
      }
    };
  })();

  /* ---------------- Plan ---------------- */
  const Plan = (() => {
    const F = ["who", "school", "area", "need", "cause", "voice", "goal", "support", "why", "owner", "partners", "freq", "setting", "duration", "start", "measure", "often", "base", "target", "fidelity", "review", "rule"];
    const REQ = [["need", "Defined need"], ["goal", "Measurable goal"], ["support", "Matched intervention"], ["freq", "Dosage"], ["owner", "Lead owner"], ["measure", "Progress measure"], ["fidelity", "Fidelity check"], ["review", "Review date"], ["rule", "Decision rule"]];
    const el = k => $("#p-" + k);
    $("#p-school").innerHTML += SCHOOLS.map(s => `<option>${esc(s.name)}</option>`).join("");
    const read = () => Object.fromEntries(F.map(k => [k, el(k).value]));
    const write = o => F.forEach(k => { el(k).value = o[k] || ""; });
    let note = "";
    function update(save = true) {
      const v = read();
      const done = REQ.filter(([k]) => v[k].trim().length > 2);
      $("#p-score").textContent = `${done.length} of ${REQ.length} elements`;
      $("#p-bar").style.width = (done.length / REQ.length * 100) + "%";
      $("#p-checks").innerHTML = REQ.map(([k, l]) => `<li class="${v[k].trim().length > 2 ? "ok" : ""}">${l}</li>`).join("");
      $("#p-action-warn").classList.toggle("show", /\b(call(s|ing)?|phone|letters?|refer(ral|red)?|meetings?|email|conference|notif(y|ied))\b/i.test(v.support));
      if (save) { store.set("plan", v); $("#p-saved").textContent = "Saved in this browser only."; }
    }
    write(store.get("plan", {}));
    $("#plan").addEventListener("input", () => update());
    $("#plan").addEventListener("change", () => update());
    $("#plan").addEventListener("click", e => {
      const b = e.target.closest("[data-ex]"); if (!b) return;
      el(b.dataset.ex.slice(2)).value = b.dataset.t; update();
    });
    $("#p-draftrule").addEventListener("click", () => {
      const v = read();
      el("rule").value = `At the ${v.review ? fmtDate(v.review) + " " : ""}review: if ${v.measure || "the progress measure"} shows adequate progress toward ${v.goal || v.target || "the goal"} and the support was delivered as planned, continue (and begin fading once the goal is met and stable). If ${v.fidelity || "the fidelity check"} shows weak delivery or access, repair implementation before changing the support. If it was delivered as planned and progress is inadequate, intensify one or two elements (time, group size, explicitness) and set a new review date.`;
      update();
    });
    $("#p-new").addEventListener("click", () => {
      const btn = $("#p-new");
      if (btn.dataset.armed) { write({}); store.del("plan"); update(false); btn.textContent = "Start a new plan"; delete btn.dataset.armed; window.scrollTo(0, 0); return; }
      btn.dataset.armed = "1"; btn.textContent = "Tap again to clear this plan";
      setTimeout(() => { if (btn.dataset.armed) { btn.textContent = "Start a new plan"; delete btn.dataset.armed; } }, 4000);
    });
    $("#p-print").addEventListener("click", () => {
      const v = read();
      printDoc("Intervention Plan", [v.who, v.school, v.area].filter(Boolean).join(" · "), [
        ["Defined need", v.need], ["Root cause hypothesis", v.cause], ["Scholar & family voice", v.voice], ["Goal", v.goal],
        ["Intervention", v.support], ["Why it matches", v.why], ["Lead owner", v.owner], ["Partners", v.partners],
        ["Dosage", [v.freq, v.setting, v.duration].filter(Boolean).join(" · ")], ["Start date", fmtDate(v.start)],
        ["Progress measure", [v.measure, v.often].filter(Boolean).join(" · ")], ["Baseline → target", [v.base, v.target].filter(Boolean).join(" → ")],
        ["Fidelity & access check", v.fidelity], ["Review date", fmtDate(v.review)], ["Decision rule", v.rule]]);
    });
    function fillEmpty(o) {
      const cur = read(); let kept = 0;
      Object.entries(o).forEach(([k, val]) => { if (!val) return; if (cur[k] && cur[k].trim()) { kept++; return; } el(k).value = val; });
      return kept;
    }
    return {
      onShow() { update(false); if (note) { $("#p-saved").textContent = note; note = ""; } },
      prefill(o) { fillEmpty(o); update(); },
      addSupport(id) {
        const s = SUPPORTS.find(x => x.id === id); if (!s) return;
        const cur = read();
        if (cur.support && cur.support.trim() && cur.support !== s.name) { el("support").value = cur.support + "; " + s.name; }
        const kept = fillEmpty({ support: s.name, area: AREA_LABEL[s.area] === "Several areas" ? "Several areas" : AREA_LABEL[s.area], why: s.use, freq: s.dose, measure: s.monitor, partners: s.owner });
        update();
        note = `Added “${s.name}”.` + (kept ? " Your existing entries were kept." : "");
      }
    };
  })();

  /* ---------------- Print ---------------- */
  function fmtDate(d) { if (!d) return ""; const t = new Date(d + "T12:00:00"); return isNaN(t) ? d : t.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  function printDoc(title, meta, rows) {
    $("#printout").innerHTML = `<h1>${esc(title)}</h1><div class="pmeta">Grand Rapids Public Schools · MTSS${meta ? " · " + esc(meta) : ""} · Printed ${fmtDate(new Date().toISOString().slice(0, 10))}</div>
      <dl>${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1]) || "—"}</dd>`).join("")}</dl>
      <div class="sign"><div>Lead owner</div><div>Date reviewed</div></div>`;
    document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(done, 1500);
  }

  /* ---------------- Guide TOC ---------------- */
  (function () {
    const secs = $$(".gsec");
    $("#toc").innerHTML = secs.map(s => `<li><a href="#/guide/${s.id.slice(2)}" data-sec="${s.id}">${esc(s.dataset.title)}</a></li>`).join("");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) $$("#toc a").forEach(a => a.classList.toggle("here", a.dataset.sec === e.target.id));
      }), { rootMargin: "-20% 0px -70% 0px" });
      secs.forEach(s => io.observe(s));
    }
  })();

  /* ---------------- Home search ---------------- */
  (function () {
    const idx = [
      ...SUPPORTS.map(s => ({ t: s.name, sub: `${AREA_LABEL[s.area]}${s.content ? " · " + s.content : ""} · grades ${s.grade.replace("-", "–")} · ${s.tierLabel}`,
        href: `#/supports?area=${encodeURIComponent(s.area)}${s.content ? "&content=" + encodeURIComponent(s.content) : ""}&open=${s.id}`, hay: (s.name + " " + s.content + " " + s.kind + " " + s.area + " " + s.rows.map(r => r[1]).join(" ")).toLowerCase(), w: 1 })),
      ...$$(".gsec").map(s => ({ t: s.dataset.title, sub: "Guide", href: `#/guide/${s.id.slice(2)}`, hay: (s.dataset.title + " " + s.textContent).toLowerCase(), w: 0 })),
      { t: "Intervention plan builder", sub: "Tool", href: "#/plan", hay: "plan builder intervention plan dosage owner goal progress monitoring planner", w: 2 },
      { t: "Decision record", sub: "Tool", href: "#/meeting", hay: "meeting sst decision record agenda", w: 2 },
      { t: "Tier 1 health check", sub: "Tool", href: "#/pattern", hay: "tier 1 health check schoolwide pattern system core", w: 2 },
      { t: "Should we intensify?", sub: "Tool", href: "#/review", hay: "intensify intensification fidelity review progress working", w: 2 }
    ];
    const box = $("#q-home"), out = $("#hits-home");
    box.addEventListener("input", () => {
      const words = box.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length) { out.innerHTML = ""; return; }
      const hits = idx.map(x => ({ x, score: words.every(w => x.hay.includes(w)) ? (words.every(w => x.t.toLowerCase().includes(w)) ? 10 : 0) + x.w + 1 : 0 }))
        .filter(h => h.score).sort((a, b) => b.score - a.score).slice(0, 7);
      out.innerHTML = hits.length ? hits.map(h => `<a class="hit" href="${h.x.href}">${esc(h.x.t)}<small>${esc(h.x.sub)}</small></a>`).join("") : `<p class="muted small" style="padding:8px 12px">No results. Try a program name, a skill, or a barrier.</p>`;
    });
  })();

  route();
})();
