const CATS = {
  cours:  { label: "Cours",  color: "var(--cat-cours)",  bg: "var(--cat-cours-bg)",  text: "var(--cat-cours-text)"  },
  projet: { label: "Projet", color: "var(--cat-projet)", bg: "var(--cat-projet-bg)", text: "var(--cat-projet-text)" },
  sport:  { label: "Sport",  color: "var(--cat-sport)",  bg: "var(--cat-sport-bg)",  text: "var(--cat-sport-text)"  },
  social: { label: "Social", color: "var(--cat-social)", bg: "var(--cat-social-bg)", text: "var(--cat-social-text)" },
  autre:  { label: "Autre",  color: "var(--cat-autre)",  bg: "var(--cat-autre-bg)",  text: "var(--cat-autre-text)"  },
};

const PRIOS = {
  important: { label: "Important",      icon: "ti-flag-filled",   color: "#D4537E", bg: "rgba(212,83,126,0.13)", text: "#ED93B1", order: 0 },
  afaire:    { label: "À faire",        icon: "ti-circle-dot",    color: "#378ADD", bg: "rgba(55,138,221,0.13)", text: "#85B7EB", order: 1 },
  sitemps:   { label: "Si j'ai le temps", icon: "ti-clock-pause", color: "#888780", bg: "rgba(136,135,128,0.13)", text: "#B4B2A9", order: 2 },
};

const DAY_FR   = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_FULL = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTH_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function fmt(d) { return d.toISOString().slice(0, 10); }
function todayStr() { return fmt(new Date()); }

let state = {
  view: "day",
  sel: todayStr(),
  modal: false,
  editCat:  "cours",
  editPrio: "afaire",
  tasks: {},
  nextId: 1,
};

function load() {
  try {
    const s = localStorage.getItem("agenda_v2");
    if (s) {
      const p = JSON.parse(s);
      Object.assign(state, { tasks: p.tasks || {}, nextId: p.nextId || 1 });
    }
  } catch (e) {}
}

function save() {
  localStorage.setItem("agenda_v2", JSON.stringify({ tasks: state.tasks, nextId: state.nextId }));
}

load();

function setView(v) {
  state.view = v;
  document.getElementById("btn-day").className  = v === "day"  ? "active" : "";
  document.getElementById("btn-week").className = v === "week" ? "active" : "";
  render();
}

function selDate(str) { state.sel = str; render(); }

function getWeekDates(str) {
  const d   = new Date(str + "T12:00:00");
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return fmt(x);
  });
}

function navigate(dir) {
  const d = new Date(state.sel + "T12:00:00");
  if (state.view === "day") d.setDate(d.getDate() + dir);
  else d.setDate(d.getDate() + dir * 7);
  state.sel = fmt(d);
  render();
}

function toggleTask(id) {
  const tasks = state.tasks[state.sel] || [];
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}

function deleteTask(id) {
  state.tasks[state.sel] = (state.tasks[state.sel] || []).filter(t => t.id !== id);
  save();
  render();
}

function addTask(name, cat, prio) {
  if (!name.trim()) return;
  if (!state.tasks[state.sel]) state.tasks[state.sel] = [];
  state.tasks[state.sel].push({ id: state.nextId++, name: name.trim(), cat, prio, done: false });
  // Trier par ordre de priorité après ajout
  sortTasks(state.sel);
  save();
  render();
}

function sortTasks(dateStr) {
  if (!state.tasks[dateStr]) return;
  state.tasks[dateStr].sort((a, b) => {
    const pa = PRIOS[a.prio]?.order ?? 1;
    const pb = PRIOS[b.prio]?.order ?? 1;
    return pa - pb;
  });
}

function openModal()  { state.modal = true; state.editCat = "cours"; state.editPrio = "afaire"; render(); }
function closeModal() { state.modal = false; render(); }

function selectCat(cat) {
  state.editCat = cat;
  document.querySelectorAll(".cat-option").forEach(el => {
    const k = el.id.replace("cat-", "");
    const c = CATS[k];
    if (k === cat) {
      el.className = "cat-option sel";
      el.style.borderColor = c.color; el.style.background = c.bg; el.style.color = c.text;
    } else {
      el.className = "cat-option";
      el.style.borderColor = ""; el.style.background = ""; el.style.color = "";
    }
  });
}

function selectPrio(prio) {
  state.editPrio = prio;
  document.querySelectorAll(".prio-option").forEach(el => {
    const k = el.id.replace("prio-", "");
    const p = PRIOS[k];
    if (k === prio) {
      el.className = "prio-option sel";
      el.style.borderColor = p.color; el.style.background = p.bg; el.style.color = p.text;
    } else {
      el.className = "prio-option";
      el.style.borderColor = ""; el.style.background = ""; el.style.color = "";
    }
  });
}

function submitTask() {
  const inp = document.getElementById("task-input");
  if (inp && inp.value.trim()) {
    state.modal = false;
    addTask(inp.value, state.editCat, state.editPrio);
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render() {
  const main  = document.getElementById("main");
  const today = todayStr();
  const selD  = new Date(state.sel + "T12:00:00");
  const tasks = state.tasks[state.sel] || [];
  const done  = tasks.filter(t => t.done).length;
  const pct   = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  let html = "";

  // ── DATE NAV ──────────────────────────────────────────────────────────────
  const dateMainStr = state.view === "day"
      ? `${DAY_FULL[selD.getDay()]} ${selD.getDate()} ${MONTH_FR[selD.getMonth()]} ${selD.getFullYear()}`
      : (() => {
        const wd = getWeekDates(state.sel);
        const f  = new Date(wd[0] + "T12:00:00");
        const l  = new Date(wd[6] + "T12:00:00");
        return `${f.getDate()} – ${l.getDate()} ${MONTH_FR[l.getMonth()]} ${l.getFullYear()}`;
      })();

  const todayD  = new Date(today + "T12:00:00");
  const dateSub = state.sel !== today
      ? `<div class="date-sub">Aujourd'hui : ${todayD.getDate()} ${MONTH_FR[todayD.getMonth()]}</div>`
      : `<div class="date-sub">Aujourd'hui</div>`;

  html += `
  <div class="date-nav">
    <div class="nav-arrows">
      <button onclick="navigate(-1)" aria-label="Précédent"><i class="ti ti-chevron-left"></i></button>
      <button onclick="navigate(1)"  aria-label="Suivant"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="date-display">
      <div class="date-main">${dateMainStr}</div>
      ${dateSub}
    </div>
    <button class="today-btn" onclick="selDate('${today}')">Aujourd'hui</button>
  </div>`;

  // ── WEEK GRID ─────────────────────────────────────────────────────────────
  if (state.view === "week") {
    const wd = getWeekDates(state.sel);
    html += `<div class="week-grid">`;
    wd.forEach(ds => {
      const d        = new Date(ds + "T12:00:00");
      const dayTasks = state.tasks[ds] || [];
      const cats     = [...new Set(dayTasks.filter(t => !t.done).map(t => t.cat))].slice(0, 3);
      const dotHtml  = cats.map(c => `<div class="wc-dot" style="background:${CATS[c].color}"></div>`).join("");
      html += `
      <div class="week-cell${ds === today ? " today" : ""}${ds === state.sel ? " selected" : ""}" onclick="selDate('${ds}')">
        <div class="wc-name">${DAY_FR[d.getDay()]}</div>
        <div class="wc-num">${d.getDate()}</div>
        <div class="wc-dots">${dotHtml}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  const allWeek  = getWeekDates(state.sel).flatMap(ds => state.tasks[ds] || []);
  const weekDone = allWeek.filter(t => t.done).length;

  html += `
  <div class="stats-row">
    <div class="stat-card"><div class="stat-label">Tâches</div><div class="stat-val">${tasks.length}</div></div>
    <div class="stat-card"><div class="stat-label">Faites</div><div class="stat-val">${done}</div></div>
  </div>`;

  // ── DAY SECTION ───────────────────────────────────────────────────────────
  const taskLabel = tasks.length === 0
      ? "Aucune tâche"
      : `${tasks.length} tâche${tasks.length > 1 ? "s" : ""} · ${done} faite${done > 1 ? "s" : ""}`;

  html += `
  <div class="day-section-header">
    <span class="section-title">${taskLabel}</span>
    <button class="add-btn" onclick="openModal()">
      <i class="ti ti-plus" aria-hidden="true"></i> Ajouter
    </button>
  </div>
  <div class="task-list">`;

  if (tasks.length === 0) {
    html += `<div class="empty-state"><i class="ti ti-calendar-off"></i><p>Aucune tâche pour ce jour.<br>Lance-toi !</p></div>`;
  } else {
    tasks.forEach(t => {
      const c = CATS[t.cat];
      const p = PRIOS[t.prio] || PRIOS.afaire;
      html += `
      <div class="task-item${t.done ? " done" : ""}" style="border-left-color:${c.color}">
        <div class="task-check${t.done ? " checked" : ""}" onclick="toggleTask(${t.id})" role="checkbox" aria-checked="${t.done}">
          ${t.done ? `<i class="ti ti-check"></i>` : ""}
        </div>
        <span class="task-name">${escapeHtml(t.name)}</span>
        <span class="prio-badge" style="background:${p.bg};color:${p.text}">
          <i class="ti ${p.icon}"></i> ${p.label}
        </span>
        <span class="cat-badge" style="background:${c.bg};color:${c.text}">${c.label}</span>
        <button class="delete-btn" onclick="deleteTask(${t.id})" aria-label="Supprimer">
          <i class="ti ti-trash"></i>
        </button>
      </div>`;
    });
  }

  html += `</div>`;

  // ── PROGRESS ──────────────────────────────────────────────────────────────
  if (tasks.length > 0) {
    html += `
    <div class="progress-wrap">
      <div class="progress-row"><span>Progression du jour</span><span>${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  main.innerHTML = html;

  // ── MODAL ─────────────────────────────────────────────────────────────────
  const existing = document.getElementById("modal-root");
  if (existing) existing.remove();

  if (state.modal) {
    const el = document.createElement("div");
    el.id = "modal-root";

    const catOptions = Object.entries(CATS).map(([k, v]) => {
      const isSel = state.editCat === k;
      const style = isSel ? `border-color:${v.color};background:${v.bg};color:${v.text}` : "";
      return `<div class="cat-option${isSel ? " sel" : ""}" id="cat-${k}" style="${style}" onclick="selectCat('${k}')">${v.label}</div>`;
    }).join("");

    const prioOptions = Object.entries(PRIOS).map(([k, p]) => {
      const isSel = state.editPrio === k;
      const style = isSel ? `border-color:${p.color};background:${p.bg};color:${p.text}` : "";
      return `<div class="prio-option${isSel ? " sel" : ""}" id="prio-${k}" style="${style}" onclick="selectPrio('${k}')">
        <i class="ti ${p.icon}"></i><span>${p.label}</span>
      </div>`;
    }).join("");

    el.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" id="modal-inner">
        <div class="modal-handle"></div>
        <h3>Nouvelle tâche</h3>
        <div class="modal-field">
          <label class="modal-label">Nom</label>
          <input type="text" id="task-input" placeholder="Nom de la tâche" autocomplete="off">
        </div>
        <div class="modal-field">
          <label class="modal-label">Priorité</label>
          <div class="prio-grid">${prioOptions}</div>
        </div>
        <div class="modal-field">
          <label class="modal-label">Catégorie</label>
          <div class="cat-grid">${catOptions}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeModal()">Annuler</button>
          <button class="btn-confirm" onclick="submitTask()">Ajouter</button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(el);

    document.getElementById("modal-backdrop").addEventListener("click", e => {
      if (e.target.id === "modal-backdrop") closeModal();
    });

    setTimeout(() => {
      const inp = document.getElementById("task-input");
      if (inp) {
        inp.focus();
        inp.addEventListener("keydown", e => { if (e.key === "Enter") submitTask(); });
      }
    }, 50);
  }
}

render();