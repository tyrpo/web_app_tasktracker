const tg = window.Telegram?.WebApp;

if (tg) {
  tg.expand();
  tg.setBackgroundColor("#000000");
  tg.setHeaderColor("#000000");
}

function getInitData() {
  return tg?.initData || "";
}

function apiBaseUrl() {
  const cfg = window.__APP_CONFIG__ || {};
  const base = (cfg.API_BASE_URL || "").trim();
  return base ? base.replace(/\/+$/, "") : "";
}

async function api(path, options = {}) {
  const url = apiBaseUrl() ? apiBaseUrl() + path : path;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = "Ошибка";
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return await res.json();
}

const teamsList = document.getElementById("teams-list");
const tasksList = document.getElementById("tasks-list");
const tasksEmpty = document.getElementById("tasks-empty");
const currentTeamName = document.getElementById("current-team-name");

const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalTitleInput = document.getElementById("modal-title-input");
const assigneeGroup = document.getElementById("assignee-group");
const modalAssigneeSelect = document.getElementById("modal-assignee-select");
const modalDeadlineInput = document.getElementById("modal-deadline-input");
const modalCancel = document.getElementById("modal-cancel");
const modalForm = document.getElementById("modal-form");

const addTaskBtn = document.getElementById("add-task-btn");
const addTeamBtn = document.getElementById("add-team-btn");
const teamKeyBtn = document.getElementById("team-key-btn");
const teamMembersBtn = document.getElementById("team-members-btn");

const teamModalBackdrop = document.getElementById("team-modal-backdrop");
const teamModalTitle = document.getElementById("team-modal-title");
const teamModalBody = document.getElementById("team-modal-body");
const teamModalClose = document.getElementById("team-modal-close");

let state = {
  teams: [],
  activeTeamId: null,
  mode: null, // 'task' | 'team'
};

function openModal(mode) {
  state.mode = mode;
  modalTitle.textContent = mode === "task" ? "Новая задача" : "Новая команда";
  modalTitleInput.value = "";
  modalDeadlineInput.value = "";
  modalDeadlineInput.parentElement.style.display =
    mode === "task" ? "flex" : "none";
  assigneeGroup.style.display = mode === "task" ? "flex" : "none";
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

function openTeamModal(title, html) {
  teamModalTitle.textContent = title;
  teamModalBody.innerHTML = html;
  teamModalBackdrop.classList.remove("hidden");
}

function closeTeamModal() {
  teamModalBackdrop.classList.add("hidden");
}

modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

teamModalClose.addEventListener("click", closeTeamModal);
teamModalBackdrop.addEventListener("click", (e) => {
  if (e.target === teamModalBackdrop) closeTeamModal();
});

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = modalTitleInput.value.trim();
  const deadline = modalDeadlineInput.value;
  if (!title) return;

  (async () => {
    try {
      if (state.mode === "team") {
        const created = await api("/api/teams", {
          method: "POST",
          body: JSON.stringify({ team_name: title }),
        });
        await refreshTeams(created.team_id);
      } else if (state.mode === "task" && state.activeTeamId) {
        const assignee = modalAssigneeSelect.value
          ? Number(modalAssigneeSelect.value)
          : null;
        await api("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            team_id: state.activeTeamId,
            description: title,
            deadline_at: deadline ? new Date(deadline).toISOString() : null,
            user_id: assignee,
          }),
        });
        await refreshTasks(state.activeTeamId);
      }
      closeModal();
    } catch (e) {
      alert(e.message || String(e));
    }
  })();
});

addTaskBtn.addEventListener("click", () => {
  if (!state.activeTeamId) {
    openModal("team");
  } else {
    refreshAssignees()
      .catch(() => {})
      .finally(() => openModal("task"));
  }
});

addTeamBtn.addEventListener("click", () => openModal("team"));

function setActiveTeam(id) {
  state.activeTeamId = id;
  renderTeams();
  refreshTasks(id).catch((e) => alert(e.message || String(e)));
}

function renderTeams() {
  teamsList.innerHTML = "";
  state.teams.forEach((team) => {
    const li = document.createElement("li");
    li.className =
      "team-item" + (team.team_id === state.activeTeamId ? " active" : "");
    li.textContent = team.name;
    li.addEventListener("click", () => setActiveTeam(team.team_id));
    teamsList.appendChild(li);
  });

  const active = state.teams.find((t) => t.team_id === state.activeTeamId);
  currentTeamName.textContent = active ? active.name : "Мои задачи";
}

function renderTasks(tasks) {
  tasksList.innerHTML = "";

  if (!tasks.length) {
    tasksEmpty.style.display = "block";
    return;
  }

  tasksEmpty.style.display = "none";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.description;
    main.appendChild(title);

    if (task.deadline_at) {
      const deadline = document.createElement("div");
      deadline.className = "task-deadline";
      const d = new Date(task.deadline_at);
      deadline.textContent =
        "Дедлайн: " +
        d.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      main.appendChild(deadline);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const doneBtn = document.createElement("button");
    doneBtn.className = "btn";
    doneBtn.textContent = "Готово";
    doneBtn.addEventListener("click", () => {
      api("/api/tasks/complete", {
        method: "POST",
        body: JSON.stringify({ task_id: task.id }),
      })
        .then(() => refreshTasks(state.activeTeamId))
        .catch((e) => alert(e.message || String(e)));
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn chip chip-danger";
    delBtn.textContent = "Удалить";
    delBtn.addEventListener("click", () => {
      api(`/api/tasks/${task.id}`, { method: "DELETE" })
        .then(() => refreshTasks(state.activeTeamId))
        .catch((e) => alert(e.message || String(e)));
    });

    actions.appendChild(doneBtn);
    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(actions);
    tasksList.appendChild(li);
  });
}

async function refreshTeams(selectTeamId = null) {
  const teams = await api("/api/teams");
  state.teams = teams.map((t) => ({
    team_id: t.team_id,
    name: t.team_name,
    is_admin: t.is_admin,
  }));
  if (selectTeamId) {
    state.activeTeamId = selectTeamId;
  } else if (!state.activeTeamId && state.teams.length) {
    state.activeTeamId = state.teams[0].team_id;
  }
  renderTeams();
  if (state.activeTeamId) {
    await refreshTasks(state.activeTeamId);
  } else {
    renderTasks([]);
  }
}

async function refreshTasks(teamId) {
  const tasks = await api(`/api/teams/${teamId}/tasks`);
  renderTasks(tasks.filter((t) => !t.completed));
}

async function refreshAssignees() {
  if (!state.activeTeamId) return;
  const team = state.teams.find((t) => t.team_id === state.activeTeamId);
  const isAdmin = !!team?.is_admin;
  if (!isAdmin) {
    modalAssigneeSelect.innerHTML = `<option value="">Я</option>`;
    return;
  }
  const members = await api(`/api/teams/${state.activeTeamId}/members`);
  modalAssigneeSelect.innerHTML = members
    .map((m) => `<option value="${m.user_id}">${m.user_name}</option>`)
    .join("");
}

refreshTeams().catch((e) => alert(e.message || String(e)));

document.getElementById("add-team-btn").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const key = prompt("Вставьте ключ для входа в команду:");
  if (!key) return;
  api("/api/teams/join", { method: "POST", body: JSON.stringify({ join_key: key }) })
    .then((t) => refreshTeams(t.team_id))
    .catch((e) => alert(e.message || String(e)));
});

async function showJoinKey() {
  if (!state.activeTeamId) return;
  const j = await api(`/api/teams/${state.activeTeamId}/join_key`);
  const key = j.join_key;
  const shareText = `Ключ для входа в команду "${j.team_name}": ${key}`;

  openTeamModal(
    "Ключ приглашения",
    `
      <div class="empty-state" style="margin-top:0">
        Отправьте этот ключ участнику:
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <input readonly value="${key}" style="flex:1" />
          <button class="btn btn-primary" id="copy-key-btn">Копировать</button>
        </div>
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button class="btn" id="share-key-btn">Поделиться</button>
        </div>
      </div>
    `
  );

  document.getElementById("copy-key-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(key);
      if (tg) tg.showAlert("Скопировано");
    } catch (_) {
      alert(key);
    }
  });

  document.getElementById("share-key-btn").addEventListener("click", () => {
    if (tg?.openTelegramLink) {
      // упрощённо: открываем share через tg://msg?text=... не всегда работает одинаково
      tg.openTelegramLink(`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`);
    } else {
      alert(shareText);
    }
  });
}

async function showMembers() {
  if (!state.activeTeamId) return;
  const members = await api(`/api/teams/${state.activeTeamId}/members`);
  const me = await api("/api/me");
  const team = state.teams.find((t) => t.team_id === state.activeTeamId);
  const isAdmin = !!team?.is_admin;

  const rows = members
    .map((m) => {
      const tags = [
        m.is_admin ? `<span class="chip">админ</span>` : "",
        m.user_id === me.user_id ? `<span class="chip">вы</span>` : "",
      ].filter(Boolean).join(" ");
      const kickBtn =
        isAdmin && !m.is_admin && m.user_id !== me.user_id
          ? `<button class="btn chip chip-danger" data-kick="${m.user_id}">Кик</button>`
          : "";
      return `
        <div class="task-item" style="gap:12px">
          <div class="task-main">
            <div class="task-title">${m.user_name}</div>
            <div class="chip" style="display:inline-flex; width:max-content">id ${m.user_id}</div>
          </div>
          <div class="task-actions">${tags} ${kickBtn}</div>
        </div>
      `;
    })
    .join("");

  openTeamModal(
    "Участники",
    `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${rows || `<div class="empty-state" style="margin-top:0">Нет участников</div>`}
        <div class="empty-state">
          Назначение задачи участнику: создайте задачу и (если вы админ) позже добавим выбор исполнителя прямо в форме.
        </div>
      </div>
    `
  );

  teamModalBody.querySelectorAll("[data-kick]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.getAttribute("data-kick");
      if (!confirm("Удалить участника из команды?")) return;
      try {
        await api(`/api/teams/${state.activeTeamId}/members/kick`, {
          method: "POST",
          body: JSON.stringify({ user_id: Number(uid) }),
        });
        await showMembers();
      } catch (e) {
        alert(e.message || String(e));
      }
    });
  });
}

teamKeyBtn.addEventListener("click", () => {
  showJoinKey().catch((e) => alert(e.message || String(e)));
});
teamMembersBtn.addEventListener("click", () => {
  showMembers().catch((e) => alert(e.message || String(e)));
});

