const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/expenseDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const expenseSchema = new mongoose.Schema({
  title: String,
  amount: Number,
  category: String,
  createdAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model("Expense", expenseSchema);

app.get("/api/expenses", async (req, res) => {
  const expenses = await Expense.find();
  res.json(expenses);
});

app.post("/api/expenses", async (req, res) => {
  const { title, amount, category } = req.body;
  const newExpense = new Expense({ title, amount, category });
  await newExpense.save();
  res.json(newExpense);
});

app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  await Expense.findByIdAndDelete(id);
  res.json({ message: "Deleted" });
});

// ✅ NEW: PUT route to update expense
app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  const { title, amount, category } = req.body;

  try {
    const updated = await Expense.findByIdAndUpdate(
      id,
      { title, amount, category },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
