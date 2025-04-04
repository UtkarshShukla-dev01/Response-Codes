import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config(); // Load environment variables from a .env file

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware Setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecret", // Move session secret to env
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      maxAge: 3600000, // 1 hour expiration
    },
  })
);

// PostgreSQL Database Connection
const db = new pg.Client({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "utkarsh200", // Consider moving this to .env
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "world", // Move database details to .env
  port: process.env.DB_PORT || 5432,
});

db.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => {
    console.error("❌ PostgreSQL Connection Error:", err);
    process.exit(1);
  });

// Middleware to store the original URL
function storeOriginalUrl(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl || req.url;
  }
  next();
}

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Routes

// Home Route
app.get("/", (req, res) => res.render("index"));
// Search Route
app.get("/search", ensureAuthenticated, (req, res) => {
  res.render("search");
});


// Login Route
app.get("/login", (req, res) => res.render("login"));
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "⚠️ Email and password are required!" });
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "❌ Invalid email or password!" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "❌ Invalid email or password!" });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    // Redirect to the search page after successful login
    res.json({
      success: true,
      message: "✅ Login successful!",
      redirect: "/search",
    });
  } catch (err) {
    console.error("❌ Error during login:", err);
    res.status(500).json({ error: "⚠️ Login failed! Please try again later." });
  }
});
// Fix the signup route
app.get("/signup", (req, res) => {
  res.render("signup"); // renders the signup.ejs file
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Debugging: Log the form data
  console.log(req.body);

  if (!username || !email || !password) {
    return res.status(400).json({ error: "⚠️ All fields are required!" });
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      return res.status(400).json({ error: "❌ User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );

    res.json({
      message: "✅ Signup successful! Please log in."});
  } catch (err) {
    console.error("❌ Error during signup:", err);
    res
      .status(500)
      .json({ error: "⚠️ Signup failed! Please try again later." });
  }
});


// Save the list to the backend
// Save the list to the backend
app.post("/save-list", ensureAuthenticated, async (req, res) => {
  const { listName, filteredCodes } = req.body;

  if (!listName || !filteredCodes || filteredCodes.length === 0) {
    return res.status(400).json({ error: "⚠️ Invalid data to save." });
  }

  const userId = req.session.user.id; // Get logged-in user id
  const createdAt = new Date().toISOString();

  try {
    // Step 1: Insert the list name and timestamp into the 'lists' table
    const listResult = await db.query(
      "INSERT INTO lists (user_id, name, created_at) VALUES ($1, $2, $3) RETURNING id",
      [userId, listName, createdAt]
    );

    const listId = listResult.rows[0].id; // Get the list ID after insertion

    // Step 2: Insert the response codes and their respective image URLs into the 'list_items' table
    const responseCodePromises = filteredCodes.map((code) =>
      db.query(
        "INSERT INTO list_items (list_id, response_code, image_url) VALUES ($1, $2, $3)",
        [listId, code.response_code, code.image_url]
      )
    );

    // Wait for all insert queries to complete
    await Promise.all(responseCodePromises);

    res.json({
      success: true,
      message: "✅ List and items saved successfully!",
      listId, // Optionally, return the list ID for further use
    });
  } catch (error) {
    console.error("❌ Error saving list and items:", error);
    res
      .status(500)
      .json({ error: `⚠️ Error saving the list: ${error.message}` });
  }
});



// Get Saved Lists (for authenticated users)
app.get("/saved-lists", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id; // Get logged-in user id

    // Fetch saved lists for the logged-in user
    const result = await db.query("SELECT * FROM lists WHERE user_id = $1", [
      userId,
    ]);

    // Return the saved lists
    res.json({ savedLists: result.rows });
  } catch (error) {
    console.error("❌ Error fetching saved lists:", error);
    res.status(500).json({ error: "⚠️ Error fetching saved lists." });
  }
});
app.get("/lists", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id; // Get logged-in user id

    // Fetch saved lists for the logged-in user
    const result = await db.query("SELECT * FROM lists WHERE user_id = $1", [
      userId,
    ]);

    res.render("lists", { savedLists: result.rows }); // Render the 'lists' page with saved lists
  } catch (error) {
    console.error("❌ Error fetching saved lists:", error);
    res.status(500).json({ error: "⚠️ Error fetching saved lists." });
  }
});
app.get("/saved-lists/:id", ensureAuthenticated, async (req, res) => {
  const listId = req.params.id;
  try {
    const result = await db.query(
      "SELECT * FROM list_items WHERE list_id = $1",
      [listId]
    );
    res.render("view-list", { listItems: result.rows });
  } catch (error) {
    console.error("❌ Error fetching list items:", error);
    res.status(500).json({ error: "⚠️ Error fetching list items." });
  }
});
// View the saved list and its items
app.get("/saved-lists/:id", ensureAuthenticated, async (req, res) => {
    const listId = req.params.id;
    try {
        const listResult = await db.query("SELECT * FROM lists WHERE id = $1", [listId]);
        const listItemsResult = await db.query("SELECT * FROM list_items WHERE list_id = $1", [listId]);
        res.render("view-list", {
            listItems: listItemsResult.rows,
            listName: listResult.rows[0].name,
        });
    } catch (error) {
        console.error("❌ Error fetching list for viewing:", error);
        res.status(500).json({ error: "⚠️ Error fetching list." });
    }
});
// Edit list page
app.get("/edit-list/:id", ensureAuthenticated, async (req, res) => {
    const listId = req.params.id;
    try {
        const listResult = await db.query("SELECT * FROM lists WHERE id = $1", [listId]);
        res.render("edit-list", { list: listResult.rows[0] });
    } catch (error) {
        console.error("❌ Error fetching list for editing:", error);
        res.status(500).json({ error: "⚠️ Error fetching list." });
    }
});

// Handle editing the list
app.post("/edit-list/:id", ensureAuthenticated, async (req, res) => {
    const listId = req.params.id;
    const newName = req.body.name; // Assuming the list name is in the 'name' field of the form
    try {
        await db.query("UPDATE lists SET name = $1 WHERE id = $2", [newName, listId]);
        res.redirect("/lists"); // Redirect back to the lists page after editing
    } catch (error) {
        console.error("❌ Error updating list:", error);
        res.status(500).json({ error: "⚠️ Error updating list." });
    }
});


// Handle deleting a list
app.delete("/delete-list/:id", ensureAuthenticated, async (req, res) => {
    const listId = req.params.id;
    try {
        // First, delete the list items related to this list
        await db.query("DELETE FROM list_items WHERE list_id = $1", [listId]);
        // Then, delete the list itself
        await db.query("DELETE FROM lists WHERE id = $1", [listId]);

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting list:", error);
        res.status(500).json({ error: "⚠️ Error deleting the list." });
    }
});


// Sample route where you render the 'view-list.ejs' page
// Sample route where you render the 'view-list.ejs' page


// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(() =>
    res.json({ message: "✅ Logged out successfully!", redirect: "/login" })
  );
});

// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
