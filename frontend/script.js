// DOM elements
const expenseNameInput = document.getElementById("expenseName");
const expenseAmountInput = document.getElementById("expenseAmount");
const expenseCategorySelect = document.getElementById("expenseCategory");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseList = document.getElementById("expenseList");
const totalAmountDisplay = document.getElementById("totalAmount");
const filterCategory = document.getElementById("filterCategory");
const toggleDarkModeBtn = document.getElementById("toggleDarkMode");
const budgetMessage = document.getElementById("budgetMessage");
const dailySummary = document.getElementById("dailySummary");
const weeklySummary = document.getElementById("weeklySummary");
const monthlySummary = document.getElementById("monthlySummary");
const searchInput = document.getElementById("searchInput");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const unnecessaryMessage = document.getElementById("unnecessaryMessage");



let expenses = [];
let editingId = null;
const DAILY_BUDGET = 200;
let chart = null;

// Dark Mode
toggleDarkModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Add New Category
addCategoryBtn.addEventListener("click", () => {
  const newCategory = newCategoryInput.value.trim();
  if (newCategory) {
    const option1 = document.createElement("option");
    option1.value = newCategory;
    option1.textContent = newCategory;
    expenseCategorySelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = newCategory;
    option2.textContent = newCategory;
    filterCategory.appendChild(option2);

    newCategoryInput.value = "";
  }
});

// Fetch from backend
async function fetchExpenses() {
  try {
    const res = await fetch("http://localhost:4001/api/expenses");
    const data = await res.json();
    expenses = data;
    displayExpenses();
    updateChart();
    updateCalendar();
    detectUnnecessaryExpenses();
  } catch (err) {
    console.error("Failed to fetch expenses:", err);
  }
}

// Add/Edit Expense
addExpenseBtn.addEventListener("click", async () => {
  const name = expenseNameInput.value.trim();
  const amount = parseFloat(expenseAmountInput.value);
  const category = expenseCategorySelect.value;

  if (!name || isNaN(amount)) {
    alert("Please enter valid name and amount.");
    return;
  }

  const data = { title: name, amount, category };

  try {
    if (editingId) {
      const res = await fetch(`http://localhost:4001/api/expenses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      const index = expenses.findIndex((e) => e._id === editingId);
      expenses[index] = updated;
      editingId = null;
      addExpenseBtn.textContent = "Add Expense";
    } else {
      const res = await fetch("http://localhost:4001/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const newExp = await res.json();
      expenses.push(newExp);
    }

    expenseNameInput.value = "";
    expenseAmountInput.value = "";
    expenseCategorySelect.value = "Food";
    displayExpenses();
    updateChart();
    updateCalendar();
    detectUnnecessaryExpenses();
  } catch (err) {
    console.error("Add/Update failed:", err);
  }
});

// Display Expenses
function displayExpenses() {
  const selectedCategory = filterCategory.value.toLowerCase();
  const searchQuery = searchInput.value.toLowerCase().trim();

  expenseList.innerHTML = "";
  let total = 0;
  const today = new Date();
  let daily = 0, weekly = 0, monthly = 0;

  expenses.forEach((exp) => {
    const date = new Date(exp.createdAt);
    const isToday = date.toDateString() === today.toDateString();
    const isWeek = date > new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const isMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

    if (isToday) daily += exp.amount;
    if (isWeek) weekly += exp.amount;
    if (isMonth) monthly += exp.amount;

    const matchesCategory = selectedCategory === "all" || exp.category.toLowerCase() === selectedCategory;
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery);

    if (!matchesCategory || !matchesSearch) return;

    total += exp.amount;

    const div = document.createElement("div");
    div.className = "expense-item";
    div.innerHTML = `
      <strong>${exp.title}</strong> - ₹${exp.amount.toFixed(2)}
      <em>(${exp.category})</em>
      <button class="edit-btn" data-id="${exp._id}">✏️</button>
      <button class="delete-btn" data-id="${exp._id}">❌</button>
    `;
    expenseList.appendChild(div);
  });

  totalAmountDisplay.textContent = total.toFixed(2);

  if (total > 1000) alert("⚠️ Warning: Total expenses crossed ₹1000!");

  if (daily <= DAILY_BUDGET) {
    budgetMessage.textContent = `✅ Savings: ₹${(DAILY_BUDGET - daily).toFixed(2)}`;
    budgetMessage.style.color = "green";
  } else {
    budgetMessage.textContent = `⚠️ Over Budget by ₹${(daily - DAILY_BUDGET).toFixed(2)}`;
    budgetMessage.style.color = "red";
  }

  dailySummary.textContent = `📅 Today: ₹${daily.toFixed(2)}`;
  weeklySummary.textContent = `📆 This Week: ₹${weekly.toFixed(2)}`;
  monthlySummary.textContent = `🗓️ This Month: ₹${monthly.toFixed(2)}`;
}

// Delete / Edit Expense
expenseList.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    await fetch(`http://localhost:4001/api/expenses/${id}`, { method: "DELETE" });
    expenses = expenses.filter((exp) => exp._id !== id);
    displayExpenses();
    updateChart();
    updateCalendar();
    detectUnnecessaryExpenses();
  }

  if (e.target.classList.contains("edit-btn")) {
    const id = e.target.dataset.id;
    const exp = expenses.find((e) => e._id === id);
    if (exp) {
      expenseNameInput.value = exp.title;
      expenseAmountInput.value = exp.amount;
      expenseCategorySelect.value = exp.category;
      editingId = id;
      addExpenseBtn.textContent = "Update Expense";
    }
  }
});

// Chart.js
function updateChart() {
  const monthlyData = Array(12).fill(0);
  expenses.forEach((exp) => {
    const m = new Date(exp.createdAt).getMonth();
    monthlyData[m] += exp.amount;
  });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{
        label: "Monthly Expenses",
        data: monthlyData,
        backgroundColor: "#4bc0c0",
        borderColor: "#36a2eb",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Calendar View
function updateCalendar() {
  const events = expenses.map((exp) => ({
    title: exp.title,
    start: new Date(exp.createdAt).toISOString(),
    backgroundColor: exp.amount > 500 ? "red" : "green",
    textColor: "white"
  }));

  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    events: events
  });
  calendar.render();
}

// Detect Unnecessary Expenses
function detectUnnecessaryExpenses() {
  const today = new Date().toISOString().slice(0, 10);
  const unnecessary = ["snacks", "shopping", "entertainment", "auto", "dining"];
  const mobileRecharge = {};

  const todayUnnecessary = expenses.filter(exp => {
    const expDate = new Date(exp.createdAt).toISOString().slice(0, 10);
    if (exp.category.toLowerCase() === "mobile recharge") {
      mobileRecharge[expDate] = (mobileRecharge[expDate] || 0) + 1;
    }
    return expDate === today && unnecessary.includes(exp.category.toLowerCase());
  });

  const todayRechargeRepeated = mobileRecharge[today] && mobileRecharge[today] > 1;

  if (todayUnnecessary.length > 0 || todayRechargeRepeated) {
    unnecessaryMessage.textContent = `⚠️ Unnecessary spending detected today. Try to avoid repeat expenses like snacks, shopping, dining.`;
  } else {
    unnecessaryMessage.textContent = "";
  }
}

// Live Search Trigger
searchInput.addEventListener("input", displayExpenses);
filterCategory.addEventListener("change", displayExpenses);


// Init
fetchExpenses();


