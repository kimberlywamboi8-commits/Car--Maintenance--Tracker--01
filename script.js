const STORAGE_KEY = "drivecare-garage";
const THEME_KEY = "drivecare-theme";

const serviceIcons = {
  "Oil change": "🛢️",
  "Tire service": "🛞",
  "Brake service": "🛑",
  "Routine inspection": "🧰",
  "Battery check": "🔋"
};

const pageButtons = Array.from(document.querySelectorAll(".nav-link"));
const pages = Array.from(document.querySelectorAll(".page"));

const elements = {
  themeToggle: document.getElementById("theme-toggle"),
  vehicleSwitcher: document.getElementById("vehicle-switcher"),
  activeVehicleName: document.getElementById("active-vehicle-name"),
  dashboardSubtitle: document.getElementById("dashboard-subtitle"),
  nextReminderHeadline: document.getElementById("next-reminder-headline"),
  nextReminderCopy: document.getElementById("next-reminder-copy"),
  statEconomy: document.getElementById("stat-economy"),
  statFuelCopy: document.getElementById("stat-fuel-copy"),
  statIssues: document.getElementById("stat-issues"),
  statIssuesCopy: document.getElementById("stat-issues-copy"),
  statService: document.getElementById("stat-service"),
  statServiceCopy: document.getElementById("stat-service-copy"),
  statVehicles: document.getElementById("stat-vehicles"),
  statVehiclesCopy: document.getElementById("stat-vehicles-copy"),
  dashboardServiceList: document.getElementById("dashboard-service-list"),
  dashboardIssueList: document.getElementById("dashboard-issue-list"),
  serviceForm: document.getElementById("service-form"),
  serviceType: document.getElementById("service-type"),
  serviceDate: document.getElementById("service-date"),
  serviceOdometer: document.getElementById("service-odometer"),
  serviceNotes: document.getElementById("service-notes"),
  issueForm: document.getElementById("issue-form"),
  issueName: document.getElementById("issue-name"),
  issueSeverity: document.getElementById("issue-severity"),
  issueDate: document.getElementById("issue-date"),
  issueNotes: document.getElementById("issue-notes"),
  fuelForm: document.getElementById("fuel-form"),
  fuelDate: document.getElementById("fuel-date"),
  fuelOdometer: document.getElementById("fuel-odometer"),
  fuelGallons: document.getElementById("fuel-gallons"),
  fuelCost: document.getElementById("fuel-cost"),
  fuelTableBody: document.getElementById("fuel-table-body"),
  vehicleForm: document.getElementById("vehicle-form"),
  vehicleName: document.getElementById("vehicle-name"),
  vehicleModel: document.getElementById("vehicle-model"),
  vehicleYear: document.getElementById("vehicle-year"),
  vehiclePlate: document.getElementById("vehicle-plate"),
  vehicleList: document.getElementById("vehicle-list"),
  reportFuelSpend: document.getElementById("report-fuel-spend"),
  reportServiceCount: document.getElementById("report-service-count"),
  reportIssueCount: document.getElementById("report-issue-count"),
  reportReminderCount: document.getElementById("report-reminder-count"),
  reportSummaryList: document.getElementById("report-summary-list")
};

function createVehicle(vehicle) {
  return {
    id: createId(),
    name: vehicle.name,
    model: vehicle.model,
    year: vehicle.year,
    plate: vehicle.plate,
    serviceEntries: [],
    issueEntries: [],
    fuelEntries: []
  };
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `vehicle-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  return {
    activeVehicleId: null,
    vehicles: []
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultState();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      activeVehicleId: parsed.activeVehicleId ?? null,
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : []
    };
  } catch (error) {
    return createDefaultState();
  }
}

const state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setTodayDefaults() {
  const today = new Date().toISOString().split("T")[0];
  elements.serviceDate.value = today;
  elements.issueDate.value = today;
  elements.fuelDate.value = today;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function getActiveVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === state.activeVehicleId) ?? null;
}

function getSortedByDate(entries) {
  return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function dayDiff(date) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target - start) / 86400000);
}

function buildReminders(vehicle) {
  if (!vehicle) {
    return [];
  }

  const serviceEntries = getSortedByDate(vehicle.serviceEntries);
  const latestOil = serviceEntries.find((entry) => entry.type === "Oil change");
  const latestTires = serviceEntries.find((entry) => entry.type === "Tire service");
  const latestBrakes = serviceEntries.find((entry) => entry.type === "Brake service");
  const reminders = [];

  if (latestOil) {
    reminders.push({
      title: "Oil change due",
      dueDate: addDays(latestOil.date, 90),
      text: "Plan the next oil service within roughly 90 days."
    });
  }

  if (latestTires) {
    reminders.push({
      title: "Tire service check",
      dueDate: addDays(latestTires.date, 120),
      text: "Check tire rotation and tread after the last tire service."
    });
  }

  if (latestBrakes) {
    reminders.push({
      title: "Brake inspection",
      dueDate: addDays(latestBrakes.date, 180),
      text: "Schedule a brake inspection based on your last brake service."
    });
  }

  return reminders
    .map((reminder) => {
      const diff = dayDiff(reminder.dueDate);
      let label = `${diff} days left`;
      if (diff < 0) {
        label = `${Math.abs(diff)} days overdue`;
      } else if (diff === 0) {
        label = "Due today";
      }

      return {
        ...reminder,
        diff,
        label
      };
    })
    .sort((a, b) => a.dueDate - b.dueDate);
}

function renderVehicleSwitcher() {
  if (!state.vehicles.length) {
    elements.vehicleSwitcher.innerHTML = '<option value="">No vehicles yet</option>';
    elements.vehicleSwitcher.disabled = true;
    return;
  }

  elements.vehicleSwitcher.disabled = false;
  elements.vehicleSwitcher.innerHTML = state.vehicles
    .map((vehicle) => `
      <option value="${vehicle.id}" ${vehicle.id === state.activeVehicleId ? "selected" : ""}>
        ${vehicle.name}
      </option>
    `)
    .join("");
}

function renderVehicleCards() {
  if (!state.vehicles.length) {
    elements.vehicleList.innerHTML = `
      <article class="empty-state">
        <p>No vehicles added yet. Start by adding your first car profile.</p>
      </article>
    `;
    return;
  }

  elements.vehicleList.innerHTML = state.vehicles
    .map((vehicle) => `
      <article class="vehicle-card ${vehicle.id === state.activeVehicleId ? "active" : ""}">
        <div class="stack-row">
          <strong>${vehicle.name}</strong>
          <span class="service-pill">${vehicle.year}</span>
        </div>
        <p class="vehicle-meta">${vehicle.model}</p>
        <p class="vehicle-meta">${vehicle.plate ? `Plate: ${vehicle.plate}` : "No plate added"}</p>
        <button type="button" data-vehicle-id="${vehicle.id}">Switch to this car</button>
      </article>
    `)
    .join("");

  Array.from(elements.vehicleList.querySelectorAll("button")).forEach((button) => {
    button.addEventListener("click", () => {
      state.activeVehicleId = button.dataset.vehicleId;
      saveState();
      renderApp();
    });
  });
}

function renderFuelTable(vehicle) {
  if (!vehicle || !vehicle.fuelEntries.length) {
    elements.fuelTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">No fuel logs for this vehicle yet.</td>
      </tr>
    `;
    return;
  }

  elements.fuelTableBody.innerHTML = getSortedByDate(vehicle.fuelEntries)
    .map((entry) => `
      <tr>
        <td>${formatDate(entry.date)}</td>
        <td>${Number(entry.odometer).toLocaleString()}</td>
        <td>${Number(entry.gallons).toFixed(1)}</td>
        <td>${formatCurrency(Number(entry.cost))}</td>
      </tr>
    `)
    .join("");
}

function renderDashboard(vehicle, reminders) {
  if (!vehicle) {
    elements.activeVehicleName.textContent = "No vehicle selected";
    elements.dashboardSubtitle.textContent = "Add a vehicle to start tracking maintenance and fuel usage.";
    elements.nextReminderHeadline.textContent = "No reminders yet";
    elements.nextReminderCopy.textContent = "Create a service record to generate maintenance alerts.";
    elements.dashboardServiceList.innerHTML = '<article class="empty-state"><p>No service history yet.</p></article>';
    elements.dashboardIssueList.innerHTML = '<article class="empty-state"><p>No issues logged yet.</p></article>';
    return;
  }

  elements.activeVehicleName.textContent = `${vehicle.name} · ${vehicle.model}`;
  elements.dashboardSubtitle.textContent = `${vehicle.year} ${vehicle.model}${vehicle.plate ? ` · Plate ${vehicle.plate}` : ""}`;

  if (reminders.length) {
    elements.nextReminderHeadline.textContent = reminders[0].title;
    elements.nextReminderCopy.textContent = `${reminders[0].label}. Due ${formatDate(reminders[0].dueDate)}.`;
  } else {
    elements.nextReminderHeadline.textContent = "No reminders yet";
    elements.nextReminderCopy.textContent = "Create a service record to generate maintenance alerts.";
  }

  const services = getSortedByDate(vehicle.serviceEntries).slice(0, 4);
  elements.dashboardServiceList.innerHTML = services.length
    ? services
        .map((entry) => `
          <article class="stack-item">
            <div class="stack-row">
              <strong>${serviceIcons[entry.type] ?? "🚗"} ${entry.type}</strong>
              <span class="service-pill">${formatDate(entry.date)}</span>
            </div>
            <p class="stack-meta">Odometer: ${Number(entry.odometer).toLocaleString()} miles</p>
            <p class="stack-meta">${entry.notes || "No notes added."}</p>
          </article>
        `)
        .join("")
    : '<article class="empty-state"><p>No service history yet.</p></article>';

  const issues = getSortedByDate(vehicle.issueEntries).slice(0, 4);
  elements.dashboardIssueList.innerHTML = issues.length
    ? issues
        .map((entry) => `
          <article class="stack-item">
            <div class="stack-row">
              <strong>${entry.name}</strong>
              <span class="severity-pill ${entry.severity.toLowerCase()}">${entry.severity}</span>
            </div>
            <p class="stack-meta">Noticed ${formatDate(entry.date)}</p>
            <p class="stack-meta">${entry.notes || "No extra details."}</p>
          </article>
        `)
        .join("")
    : '<article class="empty-state"><p>No issues logged yet.</p></article>';
}

function renderStats(vehicle, reminders) {
  elements.statVehicles.textContent = state.vehicles.length;
  elements.statVehiclesCopy.textContent = state.vehicles.length > 1 ? "You can switch between vehicles anytime" : "Add more than one car to compare records";

  if (!vehicle) {
    elements.statEconomy.textContent = "-- mpg";
    elements.statFuelCopy.textContent = "Need at least two fuel logs";
    elements.statIssues.textContent = "0";
    elements.statIssuesCopy.textContent = "No logged problems";
    elements.statService.textContent = "Not yet";
    elements.statServiceCopy.textContent = "No service history yet";
    return;
  }

  const sortedFuel = [...vehicle.fuelEntries].sort((a, b) => Number(a.odometer) - Number(b.odometer));
  if (sortedFuel.length >= 2) {
    const distance = Number(sortedFuel[sortedFuel.length - 1].odometer) - Number(sortedFuel[0].odometer);
    const gallons = sortedFuel.reduce((sum, entry) => sum + Number(entry.gallons), 0);
    const mpg = gallons ? distance / gallons : 0;
    const spend = sortedFuel.reduce((sum, entry) => sum + Number(entry.cost), 0);
    elements.statEconomy.textContent = `${mpg.toFixed(1)} mpg`;
    elements.statFuelCopy.textContent = `${sortedFuel.length} logs · ${formatCurrency(spend)} total fuel spend`;
  } else {
    elements.statEconomy.textContent = "-- mpg";
    elements.statFuelCopy.textContent = "Need at least two fuel logs";
  }

  elements.statIssues.textContent = vehicle.issueEntries.length;
  elements.statIssuesCopy.textContent = vehicle.issueEntries.length ? `${vehicle.issueEntries.filter((item) => item.severity === "High").length} high-priority issues` : "No logged problems";

  const latestService = getSortedByDate(vehicle.serviceEntries)[0];
  elements.statService.textContent = latestService ? latestService.type : "Not yet";
  elements.statServiceCopy.textContent = latestService ? `${formatDate(latestService.date)} · ${Number(latestService.odometer).toLocaleString()} miles` : "No service history yet";
}

function renderReports(vehicle, reminders) {
  if (!vehicle) {
    elements.reportFuelSpend.textContent = "$0.00";
    elements.reportServiceCount.textContent = "0";
    elements.reportIssueCount.textContent = "0";
    elements.reportReminderCount.textContent = "0";
    elements.reportSummaryList.innerHTML = '<article class="empty-state"><p>Add a vehicle to generate reports.</p></article>';
    return;
  }

  const totalFuelSpend = vehicle.fuelEntries.reduce((sum, entry) => sum + Number(entry.cost), 0);
  elements.reportFuelSpend.textContent = formatCurrency(totalFuelSpend);
  elements.reportServiceCount.textContent = vehicle.serviceEntries.length;
  elements.reportIssueCount.textContent = vehicle.issueEntries.length;
  elements.reportReminderCount.textContent = reminders.length;

  const summaryItems = [
    `${vehicle.name} has ${vehicle.serviceEntries.length} maintenance record(s).`,
    `${vehicle.name} has ${vehicle.fuelEntries.length} fuel log(s).`,
    `${vehicle.name} has ${vehicle.issueEntries.length} issue(s) reported.`,
    reminders.length ? `Closest reminder: ${reminders[0].title} on ${formatDate(reminders[0].dueDate)}.` : "No reminders created yet."
  ];

  elements.reportSummaryList.innerHTML = summaryItems
    .map((text) => `
      <article class="stack-item">
        <p class="stack-meta">${text}</p>
      </article>
    `)
    .join("");
}

function renderApp() {
  if (!state.activeVehicleId && state.vehicles.length) {
    state.activeVehicleId = state.vehicles[0].id;
  }

  const activeVehicle = getActiveVehicle();
  const reminders = buildReminders(activeVehicle);

  renderVehicleSwitcher();
  renderVehicleCards();
  renderFuelTable(activeVehicle);
  renderDashboard(activeVehicle, reminders);
  renderStats(activeVehicle, reminders);
  renderReports(activeVehicle, reminders);
}

function requireActiveVehicle() {
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    alert("Add a vehicle first, then log services, fuel, or problems.");
  }
  return vehicle;
}

function handleVehicleSubmit(event) {
  event.preventDefault();

  const newVehicle = createVehicle({
    name: elements.vehicleName.value.trim(),
    model: elements.vehicleModel.value.trim(),
    year: Number(elements.vehicleYear.value),
    plate: elements.vehiclePlate.value.trim()
  });

  state.vehicles.push(newVehicle);
  state.activeVehicleId = newVehicle.id;
  saveState();
  elements.vehicleForm.reset();
  renderApp();
}

function handleServiceSubmit(event) {
  event.preventDefault();
  const vehicle = requireActiveVehicle();
  if (!vehicle) return;

  vehicle.serviceEntries.push({
    type: elements.serviceType.value,
    date: elements.serviceDate.value,
    odometer: Number(elements.serviceOdometer.value),
    notes: elements.serviceNotes.value.trim()
  });

  saveState();
  elements.serviceForm.reset();
  setTodayDefaults();
  renderApp();
}

function handleIssueSubmit(event) {
  event.preventDefault();
  const vehicle = requireActiveVehicle();
  if (!vehicle) return;

  vehicle.issueEntries.push({
    name: elements.issueName.value,
    severity: elements.issueSeverity.value,
    date: elements.issueDate.value,
    notes: elements.issueNotes.value.trim()
  });

  saveState();
  elements.issueForm.reset();
  setTodayDefaults();
  renderApp();
}

function handleFuelSubmit(event) {
  event.preventDefault();
  const vehicle = requireActiveVehicle();
  if (!vehicle) return;

  vehicle.fuelEntries.push({
    date: elements.fuelDate.value,
    odometer: Number(elements.fuelOdometer.value),
    gallons: Number(elements.fuelGallons.value),
    cost: Number(elements.fuelCost.value)
  });

  saveState();
  elements.fuelForm.reset();
  setTodayDefaults();
  renderApp();
}

function setActivePage(pageName) {
  pageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  pages.forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageName}`);
  });
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  elements.themeToggle.textContent = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
}

function bindEvents() {
  pageButtons.forEach((button) => {
    button.addEventListener("click", () => setActivePage(button.dataset.page));
  });

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });

  elements.vehicleSwitcher.addEventListener("change", (event) => {
    state.activeVehicleId = event.target.value;
    saveState();
    renderApp();
  });

  elements.vehicleForm.addEventListener("submit", handleVehicleSubmit);
  elements.serviceForm.addEventListener("submit", handleServiceSubmit);
  elements.issueForm.addEventListener("submit", handleIssueSubmit);
  elements.fuelForm.addEventListener("submit", handleFuelSubmit);
}

function initializeApp() {
  initializeTheme();
  setTodayDefaults();
  setActivePage("dashboard");
  bindEvents();
  renderApp();
}

initializeApp();
