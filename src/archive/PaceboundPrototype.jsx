import React, { useEffect, useMemo, useRef, useState } from "react";

const DAMAGE = { R: 5, NR: 5, HL: 1 };
const LABELS = { R: "Retenu", NR: "Non Retenu", HL: "Hors Limite" };
const ATTACK = { R: "HEAVY EDGE", NR: "REFLECTED BOLT", HL: "QUICK STRIKE" };

const validNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};
const formatDuration = (milliseconds) => {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};
export default function PaceboundPrototype() {
  const [screen, setScreen] = useState("start");
  const [hourlyTarget, setHourlyTarget] = useState(15);
  const [plannedHours, setPlannedHours] = useState(7);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideGoal, setOverrideGoal] = useState(105);
  const [category, setCategory] = useState("R");
  const [events, setEvents] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [pauses, setPauses] = useState([]);
  const [pauseStartedAt, setPauseStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [attack, setAttack] = useState(null);
  const [showEnd, setShowEnd] = useState(false);
  const attackTimer = useRef(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(attackTimer.current);
  }, []);

  const target = validNumber(hourlyTarget, 15);
  const hours = validNumber(plannedHours, 7);
  const calculatedGoal = Math.max(1, Math.round(target * hours));
  const dailyGoal = overrideEnabled
    ? Math.max(1, Math.round(validNumber(overrideGoal, calculatedGoal)))
    : calculatedGoal;
  const closedPausedMs = useMemo(
    () => pauses.reduce((sum, pause) => sum + Math.max(0, pause.end - pause.start), 0),
    [pauses]
  );


  const livePauseMs = pauseStartedAt ? Math.max(0, now - pauseStartedAt) : 0;
  const totalPausedMs = closedPausedMs + livePauseMs;
  const effectiveNow = endedAt || now;
  const activeMs = startedAt ? Math.max(0, effectiveNow - startedAt - totalPausedMs) : 0;
  const activeHours = activeMs / 3600000;
  const rawTasks = events.length;
  const currentPace = activeHours > 0 ? rawTasks / activeHours : 0;
  const expectedTasks = target * activeHours;
  const paceDifference = rawTasks - expectedTasks;
  const remainingTasks = Math.max(0, dailyGoal - rawTasks);
  const armorDamage = events.reduce((sum, event) => sum + DAMAGE[event.category], 0);
  const canProject = rawTasks >= 3 && activeMs >= 600000 && currentPace > 0;
  const projectedCompletion = canProject
    ? new Date(now + (remainingTasks / currentPace) * 3600000)
    : null;
  const paceState = paceDifference > 1 ? "AHEAD" : paceDifference < -1 ? "BEHIND" : "ON TARGET";


  const categoryCounts = useMemo(() => {
    return events.reduce(
      (counts, event) => ({ ...counts, [event.category]: counts[event.category] + 1 }),
      { R: 0, NR: 0, HL: 0 }
    );
  }, [events]);


  const beginDay = () => {
    setEvents([]);
    setPauses([]);
    setPauseStartedAt(null);
    setEndedAt(null);
    setStartedAt(Date.now());
    setAttack(null);
    setScreen("active");
  };


  const completeTask = () => {
    if (screen !== "active" || !startedAt) return;
    const timestamp = Date.now();
    setEvents((current) => [
      ...current,
      { id: `${timestamp}-${current.length}`, timestamp, category }
    ]);
    window.clearTimeout(attackTimer.current);
    setAttack({ type: category, id: timestamp });
    attackTimer.current = window.setTimeout(() => setAttack(null), 620);
  };


  const pauseDay = () => {
    if (screen !== "active") return;
    setPauseStartedAt(Date.now());
    setScreen("paused");
  };


  const resumeDay = () => {
    if (screen !== "paused" || !pauseStartedAt) return;
    const end = Date.now();
    setPauses((current) => [...current, { start: pauseStartedAt, end }]);
    setPauseStartedAt(null);
    setScreen("active");
  };


  const undoLast = () => {
    if (screen !== "active" || events.length === 0) return;
    setEvents((current) => current.slice(0, -1));
    window.clearTimeout(attackTimer.current);
    setAttack({ type: "UNDO", id: Date.now() });
    attackTimer.current = window.setTimeout(() => setAttack(null), 500);
  };


  const endDay = () => {
    const end = Date.now();
    if (pauseStartedAt) {
      setPauses((current) => [...current, { start: pauseStartedAt, end }]);
      setPauseStartedAt(null);
    }
    setEndedAt(end);
    setShowEnd(false);
    setScreen("summary");
  };


  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target && event.target.tagName
        ? event.target.tagName.toLowerCase()
        : "";
      if (tag === "input" || tag === "textarea" || event.repeat) return;
      if (event.key === "1") setCategory("R");
      if (event.key === "2") setCategory("NR");
      if (event.key === "3") setCategory("HL");
      if (event.code === "Space" && screen === "active") {
        event.preventDefault();
        completeTask();
      }
      if (event.key.toLowerCase() === "p") {
        if (screen === "paused") resumeDay();
        else if (screen === "active") pauseDay();
      }
      if (event.key.toLowerCase() === "u") undoLast();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });


  return (
    <div className="app">
      <style>{styles}</style>
      <div className="scanlines" />
      <main className="frame">
        <header className="topbar">
          <strong>PACEBOUND</strong>
          <span>{screen === "start" ? "READY" : screen === "paused" ? "PAUSED" : screen === "summary" ? "RUN COMPLETE" : paceState}</span>
        </header>


        {screen === "start" && (
          <section className="screen start-grid">
            <div className="panel">
              <div className="eyebrow">TODAY'S RUN</div>
              <h1>ENTER THE CLOCKWORK CITADEL</h1>
              <p>Set your pace, lock an attack class, and begin the daily encounter.</p>
              <div className="form-grid">
                <NumberField label="Hourly task target" value={hourlyTarget} setValue={setHourlyTarget} />
                <NumberField label="Planned active hours" value={plannedHours} setValue={setPlannedHours} step="0.5" />
                <div className="goal-box">
                  <span>CALCULATED DAILY GOAL<small>Hourly target × planned hours</small></span>
                  <b>{calculatedGoal}</b>
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={overrideEnabled} onChange={(event) => {
                    setOverrideEnabled(event.target.checked);
                    if (event.target.checked) setOverrideGoal(calculatedGoal);
                  }} />
                  Use custom daily goal
                </label>
                {overrideEnabled && <NumberField label="Custom goal" value={overrideGoal} setValue={setOverrideGoal} />}
              </div>
              <CategoryPicker category={category} setCategory={setCategory} />
              <button className="primary" onClick={beginDay}>START DAY · GOAL {dailyGoal}</button>
            </div>
            <Battle attack={null} paceState="ON TARGET" remaining={dailyGoal} goal={dailyGoal} armorDamage={0} />
          </section>
        )}


        {(screen === "active" || screen === "paused") && (
          <section className="screen">
            <Battle attack={attack} paceState={paceState} remaining={remainingTasks} goal={dailyGoal} armorDamage={armorDamage} />
            <div className="dashboard">
              <div className="stats">
                <Stat label="Current pace" value={`${currentPace.toFixed(1)}/h`} />
                <Stat label="Target pace" value={`${target.toFixed(1)}/h`} />
                <Stat label="Expected tasks" value={expectedTasks.toFixed(1)} />
                <Stat label={paceDifference >= 0 ? "Ahead" : "Behind"} value={`${paceDifference >= 0 ? "+" : ""}${paceDifference.toFixed(1)}`} tone={paceDifference >= 0 ? "good" : "bad"} />
                <Stat label="Remaining tasks" value={remainingTasks} />
                <Stat label="Projected completion" value={projectedCompletion ? projectedCompletion.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not enough data"} />
                <Stat label="Raw tasks" value={rawTasks} />
                <Stat label="Active time" value={formatDuration(activeMs)} />
                <Stat label="Armor damage" value={armorDamage} />
              </div>
              <div className="panel controls">
                <div className="progress">{rawTasks} / {dailyGoal}</div>
                <CategoryPicker category={category} setCategory={setCategory} />
                <div className={`active-label ${category.toLowerCase()}`}>ACTIVE: {category} · {LABELS[category]} · {DAMAGE[category]} ARMOR</div>
                <button className={`primary complete complete-${category.toLowerCase()}`} onClick={completeTask}>
                  TASK COMPLETE · {category} · {LABELS[category]}
                </button>
                <div className="subcontrols">
                  <button onClick={pauseDay}>PAUSE</button>
                  <button onClick={undoLast} disabled={events.length === 0}>UNDO LAST</button>
                  <button className="danger" onClick={() => setShowEnd(true)}>END DAY</button>
                </div>
                <small className="shortcuts">1 R · 2 NR · 3 HL · Space Complete · P Pause · U Undo</small>
              </div>
            </div>


            {screen === "paused" && (
              <div className="overlay pause-overlay">
                <div className="pause-card">
                  <div className="eyebrow">TRACKING FROZEN</div>
                  <h2>PAUSED</h2>
                  <b>{formatDuration(livePauseMs)}</b>
                  <p>Active {formatDuration(activeMs)} · Tasks {rawTasks}</p>
                  <button className="primary" onClick={resumeDay}>RESUME</button>
                </div>
              </div>
            )}


            {showEnd && (
              <div className="overlay">
                <div className="panel confirm-card">
                  <h2>SEAL TODAY'S RECORD?</h2>
                  <p>{rawTasks} of {dailyGoal} tasks complete.</p>
                  <div className="subcontrols two">
                    <button onClick={() => setShowEnd(false)}>CONTINUE</button>
                    <button className="danger" onClick={endDay}>CONFIRM END</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}


        {screen === "summary" && (
          <section className="screen summary-grid">
            <div className="panel">
              <div className="eyebrow">RUN SUMMARY</div>
              <h1>{remainingTasks === 0 ? "WARDEN DEFEATED" : "ENCOUNTER CLOSED"}</h1>
              <div className="progress">{rawTasks} / {dailyGoal}</div>
              <SummaryLine label="Average pace" value={`${currentPace.toFixed(1)} tasks/h`} />
              <SummaryLine label="Active time" value={formatDuration(activeMs)} />
              <SummaryLine label="Paused time" value={formatDuration(totalPausedMs)} />
              <SummaryLine label="R · Retenu" value={categoryCounts.R} />
              <SummaryLine label="NR · Non Retenu" value={categoryCounts.NR} />
              <SummaryLine label="HL · Hors Limite" value={categoryCounts.HL} />
              <SummaryLine label="Armor damage" value={armorDamage} />
              <button className="primary restart" onClick={() => setScreen("start")}>NEW PROTOTYPE RUN</button>
            </div>
            <Battle attack={null} paceState={paceState} remaining={remainingTasks} goal={dailyGoal} armorDamage={armorDamage} />
          </section>
        )}
      </main>
    </div>
  );
}

function NumberField({ label, value, setValue, step = "1" }) {
  return (
    <label className="number-field">
      {label}
      <input type="number" min="0.1" step={step} value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  );
}
function CategoryPicker({ category, setCategory }) {
  return (
    <div className="categories" role="radiogroup" aria-label="Persistent task category">
      {Object.keys(LABELS).map((key) => {
        const selected = category === key;
        return (
          <button key={key} type="button" role="radio" aria-checked={selected} className={`${key.toLowerCase()} ${selected ? "selected" : ""}`} onClick={() => setCategory(key)}>
            <span>{selected ? "◆ ACTIVE ◆" : "SELECT"}</span>
            <b>{key}</b>
            <small>{LABELS[key]}</small>
            <i>{DAMAGE[key]} ARMOR</i>
          </button>
        );
      })}
    </div>
  );
}

function Battle({ attack, paceState, remaining, goal, armorDamage }) {
  const safeGoal = Math.max(1, goal);
  const healthPercent = Math.max(0, Math.min(100, (remaining / safeGoal) * 100));
  const armorPercent = Math.max(0, Math.min(100, (armorDamage / (safeGoal * 5)) * 100));
  const positionClass = paceState.toLowerCase().replace(/\s+/g, "-");
  const attackClass = attack ? `attack-${attack.type.toLowerCase()}` : "";
  return (
    <div className={`battle position-${positionClass} ${attack ? "attacking" : ""} ${attackClass}`}>
      <div className="battle-top"><b>THE CITADEL WARDEN</b><span>{paceState}</span></div>
      <div className="meters">
        <Meter label={`BOSS TASK HEALTH · ${remaining}`} value={healthPercent} />
        <Meter label={`ARMOR DAMAGE · ${armorDamage}`} value={armorPercent} armor />
      </div>
      <div className="arena">
        <div className="hero"><span className="hero-helm" /><span className="hero-body" /><span className="hero-blade" /></div>
        <div className="boss"><span className="boss-horn left" /><span className="boss-horn right" /><span className="boss-face" /><span className="boss-core" /></div>
        {attack && attack.type !== "UNDO" && (
          <>
            <span className={`attack-effect effect-${attack.type.toLowerCase()}`} />
            <div className="hit-text">-1 TASK · +{DAMAGE[attack.type]} ARMOR<small>{ATTACK[attack.type]}</small></div>
          </>
        )}
        {attack && attack.type === "UNDO" && <div className="hit-text">TIME REVERSED</div>}
      </div>
    </div>
  );
}

function Meter({ label, value, armor = false }) {
  return <div className="meter"><span>{label}</span><div className="meter-track"><div className={armor ? "meter-fill armor" : "meter-fill"} style={{ width: `${value}%` }} /></div></div>;
}

function Stat({ label, value, tone = "" }) {
  return <div className="stat"><small>{label}</small><b className={tone}>{value}</b></div>;
}

function SummaryLine({ label, value }) {
  return <div className="summary-line"><span>{label}</span><b>{value}</b></div>;
}

const styles = `
*{box-sizing:border-box}:root{--gold:#f9c74f;--cyan:#22d3ee;--violet:#a78bfa;--orange:#f97316;--green:#4ade80;--red:#fb7185}.app{min-height:100vh;padding:24px;color:#f8fafc;background:radial-gradient(circle at 50% 0,#26345a,#0b1020 46%,#05070d);font-family:Inter,Arial,sans-serif}.scanlines{position:fixed;inset:0;pointer-events:none;opacity:.1;background:repeating-linear-gradient(0deg,transparent 0 3px,#000 3px 4px)}button,input{font:inherit}button{cursor:pointer}.frame{width:min(1120px,100%);min-height:720px;margin:auto;position:relative;overflow:hidden;background:#0b1020;border:4px solid #080b14;box-shadow:0 0 0 2px #64748b,0 20px 80px #000}.topbar{display:flex;justify-content:space-between;padding:18px 22px;background:#111827;border-bottom:2px solid #334155;font-family:monospace;font-weight:800;letter-spacing:.12em}.topbar strong{font-size:20px;color:var(--gold);text-shadow:3px 3px #7c2d12}.screen{padding:24px}.start-grid,.summary-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:20px}.panel,.battle{background:linear-gradient(#172033,#0f172a);border:2px solid #475569;box-shadow:inset 0 0 0 2px #0b1020;padding:22px}.eyebrow{color:var(--cyan);font-family:monospace;font-weight:800;letter-spacing:.15em}.panel h1,.panel h2{font-family:monospace;letter-spacing:.08em;color:#fff4c7}.panel h1{font-size:28px;line-height:1.4}.panel p{color:#94a3b8}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.number-field{display:grid;gap:8px;font-size:13px;font-weight:700}.number-field input{padding:13px;background:#070b14;border:2px solid #475569;color:white;font-size:19px;font-weight:800}.goal-box{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:16px;background:#070b14}.goal-box span{font-weight:800}.goal-box small{display:block;color:#94a3b8;margin-top:6px}.goal-box b,.progress{font:800 28px monospace;color:var(--gold)}.checkbox-row{grid-column:1/-1;display:flex;align-items:center;gap:10px}.checkbox-row input{width:20px;height:20px}.categories{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.categories button{min-height:92px;display:grid;place-items:center;padding:7px;color:#cbd5e1;background:#111827;border:2px solid #475569;font-weight:800;transition:.15s}.categories button span{font:800 9px monospace;opacity:.7}.categories button b{font-size:21px}.categories button i{font-size:9px;font-style:normal}.categories button.selected{color:#071018;border:4px solid #fff;box-shadow:0 0 0 3px #020617,0 0 20px currentColor;transform:translateY(-3px)}.categories .r.selected{background:var(--orange)}.categories .nr.selected{background:var(--violet)}.categories .hl.selected{background:var(--cyan)}.primary{width:100%;min-height:72px;border:3px solid #fde68a;background:linear-gradient(#fde047,#f59e0b);color:#1c1202;font:800 15px monospace;letter-spacing:.08em;box-shadow:0 7px #92400e}.battle{height:270px;position:relative;overflow:hidden;background:linear-gradient(#192445 0 61%,#344664 61% 65%,#172033 65%)}.battle:before{content:"";position:absolute;width:90px;height:90px;border-radius:50%;background:#f7e8aa;left:50%;top:42px;transform:translateX(-50%);box-shadow:0 0 35px #f7e8aa55}.battle-top{position:relative;z-index:3;display:flex;justify-content:space-between;font:800 10px monospace}.meters{position:absolute;z-index:3;top:42px;left:25%;right:25%;display:grid;gap:7px}.meter span{font-size:9px;font-weight:800}.meter-track{height:15px;margin-top:3px;padding:2px;background:#05070d;border:2px solid #94a3b8}.meter-fill{height:100%;background:var(--red);transition:width .2s}.meter-fill.armor{background:var(--cyan)}.arena{position:absolute;inset:88px 0 0}.hero,.boss{position:absolute;bottom:25px;transition:left .35s,right .35s;filter:drop-shadow(7px 8px #0008)}.hero{left:9%;width:80px;height:115px}.boss{right:9%;width:125px;height:135px}.position-ahead .hero{left:15%}.position-ahead .boss{right:5%}.position-behind .hero{left:5%}.position-behind .boss{right:15%}.hero-helm{position:absolute;left:24px;top:0;width:38px;height:34px;background:#67e8f9;clip-path:polygon(20% 0,80% 0,100% 70%,70% 100%,25% 88%,0 55%)}.hero-body{position:absolute;left:14px;top:30px;width:55px;height:72px;background:var(--gold);clip-path:polygon(15% 0,85% 0,100% 55%,75% 100%,50% 75%,25% 100%,0 55%)}.hero-blade{position:absolute;left:62px;top:35px;width:9px;height:78px;background:#e2e8f0;transform:rotate(-22deg);box-shadow:0 0 8px #fff}.boss-face{position:absolute;inset:18px 15px 10px;background:#6d28d9;clip-path:polygon(10% 10%,40% 20%,50% 0,60% 20%,90% 10%,100% 55%,76% 100%,24% 100%,0 55%)}.boss-horn{position:absolute;top:0;width:35px;height:45px;background:#c4b5fd}.boss-horn.left{left:12px;clip-path:polygon(0 100%,100% 100%,20% 0)}.boss-horn.right{right:12px;clip-path:polygon(0 100%,100% 100%,80% 0)}.boss-core{position:absolute;width:30px;height:36px;left:48px;top:65px;background:#f472b6;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 15px #f472b6}.attack-effect{position:absolute;z-index:5;pointer-events:none}.effect-r{left:19%;bottom:38px;width:54%;height:22px;background:linear-gradient(90deg,transparent,#fff,#f97316,transparent);transform:rotate(-14deg);clip-path:polygon(0 35%,86% 0,100% 50%,86% 100%,0 65%);animation:melee .62s both}.effect-nr{left:23%;bottom:88px;width:34px;height:34px;border-radius:50%;background:#e9d5ff;box-shadow:0 0 0 8px #8b5cf688,0 0 28px #c4b5fd;animation:bolt .62s both}.effect-hl{left:21%;bottom:64px;width:50%;height:7px;background:#67e8f9;box-shadow:0 0 12px #22d3ee;animation:quick .48s both}.attack-r .hero{animation:hero-heavy .62s}.attack-nr .hero{animation:hero-cast .62s}.attack-hl .hero{animation:hero-quick .48s}.attacking .boss{animation:boss-hit .62s}.hit-text{position:absolute;z-index:7;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;color:#fff;font:800 14px monospace;text-shadow:3px 3px #000;animation:hit .62s both}.hit-text small{display:block;color:var(--gold);margin-top:4px}@keyframes melee{0%{opacity:0;transform:translateX(-80px) rotate(-14deg) scaleX(.2)}35%{opacity:1}100%{opacity:0;transform:translateX(80px) rotate(-14deg)}}@keyframes bolt{0%{opacity:0;transform:translateX(0) scale(.4)}20%{opacity:1;transform:translateX(160px) scale(1.2)}55%{transform:translateX(260px) scale(.8)}100%{opacity:0;transform:translateX(190px) scale(1.5)}}@keyframes quick{0%{opacity:0;transform:translateX(-30px) scaleX(.2)}35%{opacity:1;transform:translateX(100px) scaleX(1)}100%{opacity:0;transform:translateX(230px) scaleX(.4)}}@keyframes hero-heavy{45%{transform:translateX(54px) rotate(5deg)}}@keyframes hero-cast{30%{transform:translateY(-7px) rotate(-5deg)}}@keyframes hero-quick{45%{transform:translateX(75px) scaleX(1.08)}}@keyframes boss-hit{55%{filter:brightness(2) drop-shadow(7px 8px #0008);transform:translateX(10px)}}@keyframes hit{0%,100%{opacity:0}25%,72%{opacity:1}}.dashboard{display:grid;grid-template-columns:1fr 1.15fr;gap:16px;margin-top:16px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.stat{min-height:84px;padding:13px;background:#111827;border:1px solid #334155}.stat small{display:block;color:#94a3b8;text-transform:uppercase;font-size:10px;font-weight:800}.stat b{display:block;margin-top:9px;font-size:20px}.good{color:var(--green)}.bad{color:var(--red)}.controls{display:flex;flex-direction:column}.active-label{text-align:center;padding:9px;border:2px solid #fff;font:800 10px monospace;color:#071018}.active-label.r{background:var(--orange)}.active-label.nr{background:var(--violet)}.active-label.hl{background:var(--cyan)}.complete{min-height:112px;margin-top:12px}.complete-r{background:linear-gradient(#fb923c,#f97316)}.complete-nr{background:linear-gradient(#c4b5fd,#8b5cf6)}.complete-hl{background:linear-gradient(#67e8f9,#06b6d4)}.subcontrols{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:15px}.subcontrols.two{grid-template-columns:1fr 1fr}.subcontrols button{min-height:47px;color:#e2e8f0;background:#172033;border:2px solid #475569;font-weight:800}.subcontrols .danger{color:#fecdd3;border-color:#9f1239}.shortcuts{margin-top:12px;text-align:center;color:#64748b}.overlay{position:absolute;z-index:10;inset:0;display:grid;place-items:center;padding:24px;background:#090909df;backdrop-filter:blur(2px)}.pause-overlay{backdrop-filter:grayscale(1) blur(2px)}.pause-card{width:min(620px,100%);padding:34px;text-align:center;background:#191919;border:4px double #d4d4d4;filter:grayscale(1)}.pause-card h2{font:800 30px monospace}.pause-card>b{display:block;margin:24px;font:800 26px monospace}.confirm-card{width:min(520px,100%)}.summary-line{display:flex;justify-content:space-between;padding:13px;background:#111827;border-bottom:1px solid #334155}.restart{margin-top:20px}.summary-grid .battle{height:auto;min-height:430px}@media(max-width:800px){.app{padding:8px}.screen{padding:13px}.start-grid,.summary-grid,.dashboard{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.battle{height:245px}.meters{left:28%;right:28%}.topbar strong{font-size:15px}}
`;
