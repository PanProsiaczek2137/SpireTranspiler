import AdmZip from "adm-zip";


export function readFileFromZip(
  filePath: string,
  fileName: string
): string | null {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries(); // Pobieranie wszystkich plików w archiwum

  // Szukamy pliku o konkretnej nazwie
  const targetFile = zipEntries.find((entry) => entry.entryName === fileName);

  if (!targetFile) {
    console.log(`Plik ${fileName} nie został znaleziony w archiwum.`);
    return null;
  }

  // Odczytujemy zawartość pliku (jeśli jest to plik tekstowy)
  const fileContent = targetFile.getData().toString("utf-8");
  return fileContent;
}



export function listModulesAndBlocks(zipPath: string): Record<string, string[]> {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const result: Record<string, string[]> = {};
  const moduleFolders = new Set<string>();

  for (const entry of entries) {
    const parts = entry.entryName.split("/");

    // Zbieramy unikalne foldery modułów
    if (parts.length >= 2 && parts[0] === "modules" && parts[1]) {
      moduleFolders.add(parts[1]);
    }

    // Jeśli plik XML w module
    if (
      parts.length === 3 &&
      parts[0] === "modules" &&
      parts[1] !== "" &&
      parts[2].endsWith(".xml")
    ) {
      const moduleName = parts[1];
      const blockName = parts[2].replace(".xml", "");

      if (!result[moduleName]) {
        result[moduleName] = [];
      }

      result[moduleName].push(blockName);
    }
  }

  // Upewniamy się, że każdy folder modułu istnieje w obiekcie (nawet pusty)
  for (const moduleName of moduleFolders) {
    if (!result[moduleName]) {
      result[moduleName] = [];
    }
  }

  return result;
}
