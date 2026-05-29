import Database from "better-sqlite3";
import path from "path";

// Initialize database
const db = new Database(path.join(process.cwd(), "intervai.db"));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Auto-seed admin account for hackathon demos (so it survives Render free-tier restarts)
import bcrypt from "bcryptjs";
try {
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin");
  if (!adminExists) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
      "admin_fixed",
      "admin",
      hash
    );
  }
} catch (e) {
  console.error("Failed to seed admin:", e);
}

export { db };
