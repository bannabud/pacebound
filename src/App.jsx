import { useEffect, useMemo, useState } from 'react';
import './App.css';

const TYPES = {
  R: { label: 'Retenu', damage: 5, attack: 'HEAVY EDGE' },
  NR: { label: 'Non Retenu', damage: 5, attack: 'REFLECTED BOLT' },
  HL: { label: 'Hors Limite', damage: 1, attack: 'QUICK STRIKE' },
};

const duration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
};

function NumberField({ label, value, onChange, step = '1' }) {
  return <label className="number-field">{label}<input type="number" min="0.1" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Picker({ value, onChange }) {
  return <div className="categories" role="radiogroup" aria-label="Task category">
    {Object.entries(TYPES).map(([key, type]) => <button key={key} type="button" className={`${key.toLowerCase()} ${value === key ? 'selected' : ''}`} aria-checked={value === key} role="radio" onClick={() => onChange(key)}><b>{key}</b><small>{type.label}</small><i>{type.damage} ARMOR</i></button>)}
  </div>;
}

function Battle({ remaining, goal, damage, state, attack }) {
  const health = Math.max(0, Math.min(100, remaining / Math.max(1, goal) * 100));
  const armor = Math.max(0, Math.min(100, damage / Math.max(1, goal * 5) * 100));
  return <section className="battle">
    <div className="battle-top"><b>THE CITADEL WARDEN</b><span>{state}</span></div>
    <div className="meters"><Meter label={`BOSS TASK HEALTH · ${remaining}`} value={health} /><Meter label={`ARMOR DAMAGE · ${damage}`} value={armor} armor /></div>
    <div className="arena"><div className="hero">⚔</div><div className="boss">♛</div>{attack && <div className="hit">{attack === 'UNDO' ? 'TIME REVERSED' : `-1 TASK · +${TYPES[attack].damage} ARMOR`}<small>{attack !== 'UNDO' && TYPES[attack].attack}</small></div>}</div>
  </section>;
}
function Meter({ label, value, armor }) { return <div className="meter"><small>{label}</small><div><i className={armor ? 'armor' : ''} style={{ width: `${value}%` }} /></div></div>; }
function Stat({ label, value }) { return <div className="stat"><small>{label}</small><b>{value}</b></div>; }
function Line({ label, value }) { return <div className="summary-line"><span>{label}</span><b>{value}</b></div>; }

export default function App() {
  const [screen, setScreen] = useState('start');
  const [target, setTarget] = useState(15);
  const [hours, setHours] = useState(7);
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customGoal, setCustomGoal] = useState(105);
  const [category, setCategory] = useState('R');
  const [tasks, setTasks] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [pauseAt, setPauseAt] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [attack, setAttack] = useState(null);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  const calculatedGoal = Math.max(1, Math.round(Number(target) > 0 ? Number(target) * (Number(hours) > 0 ? Number(hours) : 7) : 105));
  const goal = customEnabled ? Math.max(1, Math.round(Number(customGoal) || calculatedGoal)) : calculatedGoal;
  const livePause = pauseAt ? now - pauseAt : 0;
  const activeMs = startedAt ? Math.max(0, (endedAt || now) - startedAt - pausedMs - livePause) : 0;
  const activeHours = activeMs / 3600000;
  const pace = activeHours ? tasks.length / activeHours : 0;
  const expected = Number(target || 15) * activeHours;
  const difference = tasks.length - expected;
  const remaining = Math.max(0, goal - tasks.length);
  const damage = tasks.reduce((sum, item) => sum + TYPES[item].damage, 0);
  const state = difference > 1 ? 'AHEAD' : difference < -1 ? 'BEHIND' : 'ON TARGET';
  const counts = useMemo(() => tasks.reduce((all, item) => ({ ...all, [item]: all[item] + 1 }), { R: 0, NR: 0, HL: 0 }), [tasks]);

  const flash = (value) => { setAttack(value); setTimeout(() => setAttack(null), 650); };
  const complete = () => { if (screen !== 'active') return; setTasks((items) => [...items, category]); flash(category); };
  const undo = () => { if (screen === 'active' && tasks.length) { setTasks((items) => items.slice(0, -1)); flash('UNDO'); } };
  const start = () => { setTasks([]); setPausedMs(0); setPauseAt(null); setEndedAt(null); setStartedAt(Date.now()); setScreen('active'); };
  const pause = () => { if (screen === 'active') { setPauseAt(Date.now()); setScreen('paused'); } };
  const resume = () => { if (screen === 'paused') { setPausedMs((value) => value + Date.now() - pauseAt); setPauseAt(null); setScreen('active'); } };
  const end = () => { setEndedAt(Date.now()); setScreen('summary'); };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName) || event.repeat) return;
      if (event.key === '1') setCategory('R'); if (event.key === '2') setCategory('NR'); if (event.key === '3') setCategory('HL');
      if (event.code === 'Space' && screen === 'active') { event.preventDefault(); complete(); }
      if (event.key.toLowerCase() === 'p') screen === 'paused' ? resume() : screen === 'active' && pause();
      if (event.key.toLowerCase() === 'u') undo();
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  });

  const header = <header><strong>PACEBOUND</strong><span>{screen === 'start' ? 'READY' : screen === 'paused' ? 'PAUSED' : screen === 'summary' ? 'RUN COMPLETE' : state}</span></header>;
  return <main className="app"><div className="frame">{header}
    {screen === 'start' && <div className="layout"><section className="panel"><small className="eyebrow">TODAY'S RUN</small><h1>ENTER THE CLOCKWORK CITADEL</h1><p>Set your pace, choose an attack class, and begin the daily encounter.</p><div className="form-grid"><NumberField label="Hourly task target" value={target} onChange={setTarget} /><NumberField label="Planned active hours" value={hours} onChange={setHours} step="0.5" /><div className="goal"><span>CALCULATED DAILY GOAL<small>Hourly target × planned hours</small></span><b>{calculatedGoal}</b></div><label className="checkbox"><input type="checkbox" checked={customEnabled} onChange={(event) => { setCustomEnabled(event.target.checked); if (event.target.checked) setCustomGoal(calculatedGoal); }} /> Use custom daily goal</label>{customEnabled && <NumberField label="Custom goal" value={customGoal} onChange={setCustomGoal} />}</div><Picker value={category} onChange={setCategory} /><button className="primary" onClick={start}>START DAY · GOAL {goal}</button></section><Battle remaining={goal} goal={goal} damage={0} state="ON TARGET" /></div>}
    {(screen === 'active' || screen === 'paused') && <div className="content"><Battle remaining={remaining} goal={goal} damage={damage} state={state} attack={attack} /><div className="dashboard"><div className="stats"><Stat label="Current pace" value={`${pace.toFixed(1)}/h`} /><Stat label="Target pace" value={`${Number(target).toFixed(1)}/h`} /><Stat label="Expected tasks" value={expected.toFixed(1)} /><Stat label={difference >= 0 ? 'Ahead' : 'Behind'} value={`${difference >= 0 ? '+' : ''}${difference.toFixed(1)}`} /><Stat label="Remaining" value={remaining} /><Stat label="Active time" value={duration(activeMs)} /></div><section className="panel controls"><div className="progress">{tasks.length} / {goal}</div><Picker value={category} onChange={setCategory} /><div className={`active-label ${category.toLowerCase()}`}>ACTIVE: {category} · {TYPES[category].label} · {TYPES[category].damage} ARMOR</div><button className="primary complete" onClick={complete}>TASK COMPLETE · {category} · {TYPES[category].label}</button><div className="buttons"><button onClick={screen === 'paused' ? resume : pause}>{screen === 'paused' ? 'RESUME' : 'PAUSE'}</button><button onClick={undo} disabled={!tasks.length}>UNDO LAST</button><button onClick={end}>END DAY</button></div><small className="shortcuts">1 R · 2 NR · 3 HL · Space Complete · P Pause · U Undo</small></section></div></div>}
    {screen === 'summary' && <div className="layout"><section className="panel"><small className="eyebrow">RUN SUMMARY</small><h1>{remaining === 0 ? 'WARDEN DEFEATED' : 'ENCOUNTER CLOSED'}</h1><div className="progress">{tasks.length} / {goal}</div><Line label="Average pace" value={`${pace.toFixed(1)} tasks/h`} /><Line label="Active time" value={duration(activeMs)} /><Line label="Paused time" value={duration(pausedMs)} />{Object.entries(TYPES).map(([key, type]) => <Line key={key} label={`${key} · ${type.label}`} value={counts[key]} />)}<Line label="Armor damage" value={damage} /><button className="primary" onClick={() => setScreen('start')}>NEW PROTOTYPE RUN</button></section><Battle remaining={remaining} goal={goal} damage={damage} state={state} /></div>}
  </div></main>;
}
