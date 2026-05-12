const { execSync, spawn } = require("child_process");
const path = require("path");

// Install dependencies for both workspaces if node_modules are missing
function installIfNeeded(dir) {
  const fs = require("fs");
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    console.log(`Installing dependencies in ${dir}...`);
    execSync("npm install", { cwd: dir, stdio: "inherit" });
  }
}

installIfNeeded(path.join(__dirname, "backend"));
installIfNeeded(path.join(__dirname, "frontend"));

// Build the Next.js frontend if .next directory is missing
const fs = require("fs");
if (!fs.existsSync(path.join(__dirname, "frontend", ".next"))) {
  console.log("Building Next.js frontend...");
  execSync("npm run build", {
    cwd: path.join(__dirname, "frontend"),
    stdio: "inherit",
  });
}

// Start backend on port 5000
const backend = spawn("node", ["server.js"], {
  cwd: path.join(__dirname, "backend"),
  env: { ...process.env, PORT: "5000" },
  stdio: "inherit",
});

// Start Next.js frontend on port 3000
const frontend = spawn("node_modules/.bin/next", ["start", "-p", "3000"], {
  cwd: path.join(__dirname, "frontend"),
  env: { ...process.env, PORT: "3000" },
  stdio: "inherit",
});

backend.on("error", (err) => {
  console.error("Backend failed to start:", err);
  process.exit(1);
});

frontend.on("error", (err) => {
  console.error("Frontend failed to start:", err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  backend.kill(signal);
  frontend.kill(signal);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

backend.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Backend exited with code ${code}`);
    frontend.kill();
    process.exit(code);
  }
});

frontend.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Frontend exited with code ${code}`);
    backend.kill();
    process.exit(code);
  }
});
