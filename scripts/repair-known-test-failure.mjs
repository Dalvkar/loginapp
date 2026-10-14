import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("../backend/src/app.ts", import.meta.url));
const broken = 'message: "Datos invalidos"';
const repaired = 'message: "Datos inválidos"';
const source = await readFile(appPath, "utf8");

if (source.includes(broken)) {
  await writeFile(appPath, source.replace(broken, repaired), "utf8");
  console.log("repair: se restauro el mensaje esperado para datos invalidos.");
} else if (source.includes(repaired)) {
  console.log("repair: el mensaje ya estaba corregido; no hubo cambios.");
} else {
  console.error("repair: la falla no coincide con una reparacion segura conocida.");
  process.exitCode = 1;
}
