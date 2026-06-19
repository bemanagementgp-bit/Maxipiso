const https = require("https");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq === -1) continue;
    const k = l.slice(0, eq).trim();
    let v = l.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[k] = v;
  }
}

loadEnv();
const key = process.env.GOOGLE_DRIVE_API_KEY;
const folder = "1mA4LfLp6whxNVm9ZSjgyYtY3MLOUXqHz";

console.log("API Key (primeros 10 chars):", key ? key.slice(0, 10) + "..." : "❌ NO ENCONTRADA");

const url = `https://www.googleapis.com/drive/v3/files?q=%27${folder}%27+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType)&pageSize=10`;

console.log("URL:", url.replace(key, "***KEY***"));

https.get(url, (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    const parsed = JSON.parse(d);
    console.log("\nRespuesta de Drive API:");
    console.log(JSON.stringify(parsed, null, 2));
  });
}).on("error", (e) => console.error("Error de red:", e));
