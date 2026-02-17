const fs = require("fs");
const path = require("path");

// Copy debug adapter
const debugAdapterSrc = "../debug-adapter/dist";
const dist = "./dist";

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

fs.copyFileSync(path.join(debugAdapterSrc, "debugAdapter.js"), path.join(dist, "debugAdapter.js"));

console.log("Debug adapter copied successfully");

// Copy language server
const languageServerSrc = "../language-server/dist";
if (fs.existsSync(path.join(languageServerSrc, "server.js"))) {
  fs.copyFileSync(path.join(languageServerSrc, "server.js"), path.join(dist, "languageServer.js"));
  console.log("Language server copied successfully");
} else {
  console.warn("WARNING: Language server not found at " + languageServerSrc);
}

// Copy LICENSE from root
const licenseSrc = "../../LICENSE";
const licenseDest = "./LICENSE";

if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, licenseDest);
  console.log("LICENSE copied successfully");
} else {
  console.warn("WARNING: LICENSE file not found at root");
}
