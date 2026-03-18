// Простейшее клиентское состояние, чтобы WebApp был интерактивным.
// В реальном проекте здесь должны быть запросы к backend API.

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.expand();
  tg.setBackgroundColor("#000000");
  tg.setHeaderColor("#000000");
}

const teamsList = document.getElementById("teams-list");
const tasksList = document.getElementById("tasks-list");
const tasksEmpty = document.getElementById("tasks-empty");
const currentTeamName = document.getElementById("current-team-name");

const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalTitleInput = document.getElementById("modal-title-input");
const modalDeadlineInput = document.getElementById("modal-deadline-input");
const modalCancel = document.getElementById("modal-cancel");
const modalForm = document.getElementById("modal-form");

const addTaskBtn = document.getElementById("add-task-btn");
const addTeamBtn = document.getElementById("add-team-btn");

let state = {
  teams: [],
  tasks: {},
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
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = modalTitleInput.value.trim();
  const deadline = modalDeadlineInput.value;
  if (!title) return;

  if (state.mode === "team") {
    const id = Date.now().toString();
    state.teams.push({ id, name: title });
    if (!state.activeTeamId) {
      state.activeTeamId = id;
    }
    renderTeams();
  } else if (state.mode === "task" && state.activeTeamId) {
    const id = Date.now().toString();
    if (!state.tasks[state.activeTeamId]) {
      state.tasks[state.activeTeamId] = [];
    }
    state.tasks[state.activeTeamId].push({
      id,
      title,
      deadline,
    });
    renderTasks();
  }

  closeModal();
});

addTaskBtn.addEventListener("click", () => {
  if (!state.activeTeamId) {
    openModal("team");
  } else {
    openModal("task");
  }
});

addTeamBtn.addEventListener("click", () => openModal("team"));

function setActiveTeam(id) {
  state.activeTeamId = id;
  renderTeams();
  renderTasks();
}

function renderTeams() {
  teamsList.innerHTML = "";
  state.teams.forEach((team) => {
    const li = document.createElement("li");
    li.className =
      "team-item" + (team.id === state.activeTeamId ? " active" : "");
    li.textContent = team.name;
    li.addEventListener("click", () => setActiveTeam(team.id));
    teamsList.appendChild(li);
  });

  const active = state.teams.find((t) => t.id === state.activeTeamId);
  currentTeamName.textContent = active ? active.name : "Мои задачи";
}

function renderTasks() {
  tasksList.innerHTML = "";
  const teamTasks = state.tasks[state.activeTeamId] || [];

  if (!teamTasks.length) {
    tasksEmpty.style.display = "block";
    return;
  }

  tasksEmpty.style.display = "none";

  teamTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    main.appendChild(title);

    if (task.deadline) {
      const deadline = document.createElement("div");
      deadline.className = "task-deadline";
      const d = new Date(task.deadline);
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
      state.tasks[state.activeTeamId] = teamTasks.filter(
        (t) => t.id !== task.id
      );
      renderTasks();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn chip chip-danger";
    delBtn.textContent = "Удалить";
    delBtn.addEventListener("click", () => {
      state.tasks[state.activeTeamId] = teamTasks.filter(
        (t) => t.id !== task.id
      );
      renderTasks();
    });

    actions.appendChild(doneBtn);
    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(actions);
    tasksList.appendChild(li);
  });
}

renderTeams();
renderTasks();

