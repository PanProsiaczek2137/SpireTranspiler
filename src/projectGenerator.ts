import { code, devMode, filePath } from './index'

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from "child_process";

const localAppData = process.env.LOCALAPPDATA;
const projectPath: string = localAppData ? path.join(localAppData, "SpireLite", "compiledProject") : process.exit(1);

async function runCommand(command: string) {
    return new Promise<void>((resolve, reject) => {
      exec(command, (error, stderr) => {
        if (error) {
          console.error(`Błąd: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        resolve();
      });
    });
}

export async function createProject(){
    if(devMode) console.log("Tworzymy projekt kodu w ścierzce: "+projectPath);
    try {
        if (fs.existsSync(projectPath)) {
            fs.rmSync(projectPath, { recursive: true, force: true });
        }
        fs.mkdirSync(projectPath, { recursive: true });
        await runCommand(`cargo init ${projectPath}`);
        if(devMode) console.log("Projekt został zainicjalizowany");
        // TODO: zrobić aby teraz dodwał kod do pliku src/main.rs
        // TODO: rodzieleić aby skrypty moduły były w różnych plikach bądź i folderach
        // TODO: zrobić aby nie było to tylko dla rusta, ale też można było zrobić aby innej języki działały!
    } catch (error) {
        console.error("Błąd podczas tworzenia projektu:", error);
        process.exit(1);
    }

}