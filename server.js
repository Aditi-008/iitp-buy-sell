const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iitp-buy-sell";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));
  
// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

const itemSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  image: String,
  sellerEmail: String,
  contactNo: String,
  college: String,
  sold: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);
const Item = mongoose.model("Item", itemSchema);

// Middleware to verify JWT
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
}

// Routes

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).send("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed });
  res.send("User registered");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).send("Incorrect password");

  const token = jwt.sign({ email: user.email }, JWT_SECRET);
  res.json({ token });
});

app.post("/post", auth, async (req, res) => {
  const item = req.body;
  if (
    !item.title ||
    !item.description ||
    !item.price ||
    !item.image ||
    !item.sellerEmail ||
    !item.contactNo ||
    !item.college
  ) {
    return res.status(400).send("Missing item details");
  }
  await Item.create(item);
  res.send("Item posted");
});

app.get("/list", auth, async (req, res) => {
  const { college } = req.query;
  if (!college) return res.status(400).send("College required");
  const items = await Item.find({ college });
  res.json(items);
});

app.post("/mark-sold/:id", auth, async (req, res) => {
  const { id } = req.params;
  await Item.findByIdAndUpdate(id, { sold: true });
  res.send("Marked as sold");
});

app.post("/mark-unsold/:id", auth, async (req, res) => {
  const { id } = req.params;
  await Item.findByIdAndUpdate(id, { sold: false });
  res.send("Marked as available");
});

// Start server
app.listen(PORT, () => {
  console.log("Server running on port PORT:", PORT);
});
