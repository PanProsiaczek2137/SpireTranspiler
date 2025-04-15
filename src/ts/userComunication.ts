import * as readlineSync from "readline-sync";
import * as fs from "fs";

export function askForFileLocation(): string {
  const filePath = readlineSync.question("Podaj pelna sciezke do pliku .srl: ");

  // Sprawdzenie, czy plik istnieje
  if (!fs.existsSync(filePath)) {
    console.log("Błąd: Plik nie istnieje!");
    process.exit(1);
  }

  return filePath;
}