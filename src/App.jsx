import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import backgroundUrl from '../pokemon_background.jpg';
import './App.css';

const assetUrl = (filename) => `${import.meta.env.BASE_URL}assets/pokemon/${encodeURIComponent(filename)}`;
const TYPES = {
  R: { label: 'Retenu', damage: 3, move: 'FLAME CHARGE', className: 'r' },
  NR: { label: 'Non Retenu', damage: 3, move: 'PSYBEAM', className: 'nr' },
  HL: { label: 'Hors Limite', damage: 3, move: 'QUICK ATTACK', className: 'hl' },
};
const STARTERS = {
  charmander: { name: 'CHARMANDER', front: 'pokesprites.com - charmander.png', forms: ['pokesprites.com - charmander-back.png', 'pokesprites.com - charmeleon-back.png', 'pokesprites.com - charizard-back.png'] },
  bulbasaur: { name: 'BULBASAUR', front: 'pokesprites.com - bulbasaur.png', forms: ['pokesprites.com - bulbasaur-back.png', 'pokesprites.com - ivysaur-back.png', 'pokesprites.com - venusaur-back.png'] },
  squirtle: { name: 'SQUIRTLE', front: 'pokesprites.com - squirtle.png', forms: ['pokesprites.com - squirtle-back.png', 'pokesprites.com - wartortle-back.png', 'pokesprites.com - blastoise-back.png'] },
};

const formatDuration = (milliseconds) => {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((value) => String(value).padStart(2, '0')).join(':');
};

function NumberField({ label, value, onChange, step = '1' }) { return <label className="number-field"><span>{label}</span><input type="number" min="1" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function CategoryPicker({ value, onChange }) {
  return <div className="categories" role="radiogroup" aria-label="Task category">{Object.entries(TYPES).map(([key, type]) => <button key={key} type="button" className={`${type.className} ${value === key ? 'selected' : ''}`} aria-checked={value === key} role="radio" onClick={() => onChange(key)}><strong>{key}</strong><span>{type.label}</span><small>{type.damage} DMG</small></button>)}</div>;
}

function Meter({ label, value }) { return <div className="meter"><div><span>{label}</span><b>{Math.round(value)}%</b></div><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>; }
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }

function Hardware({ screen, onPause, onResume }) {
  return <><div className="speakers speakers-left" aria-hidden="true"><i /><i /><i /><i /><i /></div><div className="speakers speakers-right" aria-hidden="true"><i /><i /><i /><i /><i /></div><div className={`power-led ${screen === 'active' ? 'active' : screen === 'paused' ? 'paused' : ''}`} title="Run status" /><div className="dpad" aria-label="Directional pad"><i /><i /><i /><i /><b /></div><div className="face-buttons" aria-label="Face buttons"><button type="button">X</button><button type="button">Y</button><button type="button" onClick={screen === 'paused' ? onResume : onPause}>A</button><button type="button">B</button></div></>;
}

function BattleScreen({ starter, tasks, goal, state, attack, evolution, revival }) {
  const roundTasks = tasks % goal;
  const health = tasks > 0 && roundTasks === 0 ? 0 : goal - roundTasks;
  const pokemon = STARTERS[starter] || STARTERS.charmander;
  const form = tasks >= 65 ? 2 : tasks >= 35 ? 1 : 0;
  const isHit = attack && TYPES[attack];
  return <section className={`top-screen battle-screen ${isHit ? `attack-${attack.toLowerCase()}` : ''} ${evolution ? 'evolution-active' : ''}`} style={{ backgroundImage: `url("${backgroundUrl}"), linear-gradient(155deg,#7eb2a7,#c9d6b2 48%,#77959b)`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}><div className="battle-hud"><div><span>MEWTWO // ROUND {Math.floor(tasks / goal) + 1}</span><Meter label={`HP ${health} / ${goal}`} value={health / goal * 100} /></div></div><div className="battlefield">{evolution && <div className="evolution-flash" aria-hidden="true"><i /><i /><i /><b /></div>}<div className="pokemon-stage"><div className="trainer-shadow" />{isHit && <div className="attack-effect" aria-hidden="true"><i /><i /><i /></div>}<img className="starter-sprite" src={assetUrl(pokemon.forms[form])} alt={`${pokemon.name} battle form`} /><img className="mewtwo-sprite" src={assetUrl('pokesprites.com - mewtwo.png')} alt="Mewtwo" />{isHit && <strong className="hit">-{TYPES[attack].damage}</strong>}</div>{revival && <div className="event-banner revival-banner">MEWTWO REVIVAL // NEW ROUND</div>}</div></section>;
}

export default function App() {
  const [screen, setScreen] = useState('start');
  const [starter, setStarter] = useState('charmander');
  const [goal, setGoal] = useState(105);
  const [hours, setHours] = useState(8);
  const [customHours, setCustomHours] = useState(false);
  const [category, setCategory] = useState('R');
  const [events, setEvents] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [pauseAt, setPauseAt] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [attack, setAttack] = useState(null);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  const target = Math.max(1, Number(goal) || 1);
  const plannedHours = customHours ? Math.max(1, Number(hours) || 8) : 8;
  const livePause = pauseAt ? now - pauseAt : 0;
  const activeMs = startedAt ? Math.max(0, (endedAt || now) - startedAt - pausedMs - livePause) : 0;
  const activeHours = activeMs / 3600000;
  const pace = activeHours ? events.length / activeHours : 0;
  const requiredRate = target / plannedHours;
  const difference = events.length - requiredRate * activeHours;
  const state = difference > 1 ? 'AHEAD' : difference < -1 ? 'BEHIND' : 'ON TARGET';
  const taskCount = events.length;
  const roundTasks = taskCount % target;
  const evolution = taskCount === 35 || taskCount === 65;
  const revival = taskCount > target && roundTasks === 1;
  const counts = useMemo(() => events.reduce((all, event) => ({ ...all, [event.category]: all[event.category] + 1 }), { R: 0, NR: 0, HL: 0 }), [events]);

  const flash = (value) => { setAttack(value); window.setTimeout(() => setAttack(null), 720); };
  const playRetroAttackSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !TYPES[type]) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type === 'R' ? 'sawtooth' : type === 'NR' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(type === 'R' ? 150 : 400, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(type === 'R' ? 600 : 100, context.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener('ended', () => context.close(), { once: true });
  };
  const playStarterChime = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(392.00, context.currentTime);
    oscillator.frequency.setValueAtTime(440.00, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.24);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.24);
    oscillator.addEventListener('ended', () => context.close(), { once: true });
  };
  const start = () => { setEvents([]); setPausedMs(0); setPauseAt(null); setEndedAt(null); setStartedAt(Date.now()); setScreen('active'); flash('START'); };
  const complete = () => { if (screen !== 'active') return; setEvents((items) => [...items, { id: `${Date.now()}-${items.length}`, timestamp: new Date().toISOString(), category }]); playRetroAttackSound(category); flash(category); };
  const undo = () => { if (screen === 'active' && events.length) { setEvents((items) => items.slice(0, -1)); flash('UNDO'); } };
  const pause = () => { if (screen === 'active') { setPauseAt(Date.now()); setScreen('paused'); } };
  const resume = () => { if (screen === 'paused') { setPausedMs((value) => value + Date.now() - pauseAt); setPauseAt(null); setScreen('active'); } };
  const end = () => { const ended = Date.now(); if (pauseAt) { setPausedMs((value) => value + ended - pauseAt); setPauseAt(null); } setEndedAt(ended); setScreen('summary'); };

  const exportWorkbook = () => {
    const summary = [{ metric: 'Daily goal', value: target }, { metric: 'Completed tasks', value: taskCount }, { metric: 'Active time', value: formatDuration(activeMs) }, { metric: 'Paused time', value: formatDuration(pausedMs + livePause) }, { metric: 'Average pace', value: `${pace.toFixed(2)} tasks/hour` }, { metric: 'Starter', value: STARTERS[starter].name }];
    const log = events.map((event, index) => ({ task: index + 1, timestamp: event.timestamp, category: event.category, label: TYPES[event.category].label }));
    const categorySummary = Object.entries(TYPES).map(([category, type]) => ({ category, label: type.label, tasks: counts[category], percentage: taskCount ? `${((counts[category] / taskCount) * 100).toFixed(1)}%` : '0%' }));
    const hourly = events.reduce((rows, event) => {
      const date = event.timestamp.slice(0, 10);
      const hour = `${event.timestamp.slice(0, 13)}:00`;
      const row = rows.find((item) => item.date === date && item.hour === hour);
      if (row) row[event.category] += 1;
      else rows.push({ date, hour, R: event.category === 'R' ? 1 : 0, NR: event.category === 'NR' ? 1 : 0, HL: event.category === 'HL' ? 1 : 0, total: 1 });
      if (row) row.total += 1;
      return rows;
    }, []);
    const workbook = XLSX.utils.book_new();
    const taskSheet = XLSX.utils.json_to_sheet(log);
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    const categorySheet = XLSX.utils.json_to_sheet(categorySummary);
    const hourlySheet = XLSX.utils.json_to_sheet(hourly);
    taskSheet['!cols'] = [{ wch: 9 }, { wch: 25 }, { wch: 12 }, { wch: 18 }];
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 24 }];
    categorySheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
    hourlySheet['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, taskSheet, 'Task Log');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Daily Summary');
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Summary');
    XLSX.utils.book_append_sheet(workbook, hourlySheet, 'Hourly Summary');
    XLSX.writeFile(workbook, `pacebound-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => { const onKeyDown = (event) => { if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName) || event.repeat) return; if (event.key === '1') setCategory('R'); if (event.key === '2') setCategory('NR'); if (event.key === '3') setCategory('HL'); if (event.code === 'Space' && screen === 'active') { event.preventDefault(); complete(); } if (event.key.toLowerCase() === 'p') screen === 'paused' ? resume() : screen === 'active' && pause(); if (event.key.toLowerCase() === 'u') undo(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); });

  return <main className="app"><div className="ds-shell"><Hardware screen={screen} onPause={pause} onResume={resume} /><div className="top-bezel"><BattleScreen starter={starter} tasks={taskCount} goal={target} state={screen === 'start' ? 'READY' : screen === 'paused' ? 'PAUSED' : screen === 'summary' ? 'COMPLETE' : state} attack={attack} evolution={evolution} revival={revival} /></div><div className="bottom-bezel"><section className="bottom-screen"><div className="screen-bar"><span>TOUCH SCREEN // {screen.toUpperCase()}</span><b>{screen === 'active' ? `${taskCount} TASKS` : 'MENU'}</b></div>
    {screen === 'start' && <div className="setup-screen"><p className="greeting">HELLO TRAVELER! IT'S DANGEROUS OUT HERE IN THE OFFICE, TAKE ONE OF THESE POKEMON TO HELP YOU!</p><div className="briefcase"><div className="case-latch" /><div className="starter-grid">{Object.entries(STARTERS).map(([key, pokemon]) => <button key={key} type="button" className={`starter-card ${starter === key ? 'chosen' : ''}`} onClick={() => { setStarter(key); playStarterChime(); }}><span className="pokeball"><i /></span><img src={assetUrl(pokemon.front)} alt={pokemon.name} /><strong>{pokemon.name}</strong><small>{starter === key ? 'READY' : 'OPEN'}</small></button>)}</div></div><div className="setup-controls"><NumberField label="DAILY GOAL // TASKS" value={goal} onChange={setGoal} /><div className="rate-readout"><span>REQUIRED RATE // {plannedHours}H DAY</span><strong>{requiredRate.toFixed(1)} / HR</strong></div><label className="toggle"><input type="checkbox" checked={customHours} onChange={(event) => setCustomHours(event.target.checked)} /><span>Custom workday hours</span></label>{customHours && <NumberField label="WORKDAY HOURS" value={hours} onChange={setHours} step="0.5" />}</div><button className="touch-button primary" onClick={start}>THROW OUT {STARTERS[starter].name}</button></div>}
    {(screen === 'active' || screen === 'paused') && <div className="run-screen"><div className="progress-line"><span>RUN PROGRESS</span><strong>{taskCount} / {target}</strong><i><b style={{ width: `${Math.min(100, taskCount / target * 100)}%` }} /></i></div><button className="touch-button complete-button" onClick={complete} disabled={screen === 'paused'}>LINE COMPLETE // {category}</button><CategoryPicker value={category} onChange={setCategory} /><div className={`armed ${TYPES[category].className}`}>ARMED: {category} // {TYPES[category].move} // {TYPES[category].damage} DAMAGE</div><div className="action-row"><button className="touch-button" onClick={screen === 'paused' ? resume : pause}>{screen === 'paused' ? 'RESUME' : 'PAUSE'}</button><button className="touch-button" onClick={undo} disabled={!events.length}>UNDO</button><button className="touch-button danger" onClick={end}>END DAY</button></div><small className="shortcut-note">1/2/3 SELECT ATTACK · SPACE COMPLETE · P PAUSE · U UNDO</small><div className="metric-grid"><Metric label="SPEED" value={`${pace.toFixed(1)}/H`} /><Metric label="TARGET" value={`${requiredRate.toFixed(1)}/H`} /><Metric label="STATUS" value={state} /><Metric label="ACTIVE TIME" value={formatDuration(activeMs)} /></div></div>}
    {screen === 'summary' && <div className="summary-screen"><span className="quest-label">RUN COMPLETE // DATA READY</span><h1>{taskCount >= target ? 'MEWTWO DEFEATED' : 'ENCOUNTER CLOSED'}</h1><div className="summary-list"><Metric label="TASKS LOGGED" value={taskCount} /><Metric label="AVERAGE SPEED" value={`${pace.toFixed(1)}/H`} /><Metric label="ACTIVE TIME" value={formatDuration(activeMs)} /><Metric label="PAUSED TIME" value={formatDuration(pausedMs)} /><Metric label="R / NR / HL" value={`${counts.R} / ${counts.NR} / ${counts.HL}`} /></div><div className="summary-actions"><button className="touch-button primary" onClick={exportWorkbook}>EXPORT .XLSX</button><button className="touch-button" onClick={() => setScreen('start')}>NEW RUN</button></div></div>}
  </section></div><div className="select-start"><button type="button">SELECT</button><button type="button">START</button></div></div></main>;
}