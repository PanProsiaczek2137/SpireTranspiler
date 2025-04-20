import { code, devMode, filePath, moduleFiles, configFile } from './index'

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
    fs.writeFileSync(path.join(projectPath, "src", "main.rs"), `fn main(){\n${code}\n}`)
    const entries:any = Object.entries(moduleFiles);
    for(let i = 0; i < entries.length; i++){
      const oldMain = fs.readFileSync(path.join(projectPath, "src", "main.rs"))
      fs.writeFileSync(path.join(projectPath, "src", "main.rs"), `mod ${entries[i][0]};\n${oldMain}`)
      fs.writeFileSync(`${path.join(projectPath, "src", entries[i][0]+".rs")}`, entries[i][1]);
    }

    // Piszemy Cargo.toml
    let fileContent = "[package]\n";
    const list = ["name", "version", "description", "authors", "license", "repository", "keywords", "readme", "homepage", "documentation"]
    for(let i = 0; i < list.length; i++){
      const configValue = JSON.parse(configFile)[list[i]];
      if(configValue == null || configValue == "" || configValue == undefined){continue}
      fileContent += `${list[i]} = ${JSON.stringify(configValue)}\n`
    }
    fileContent += 'edition = "2021"\n'
    fileContent += "\n[dependencies]\n"
    fs.writeFileSync(path.join(projectPath, "Cargo.toml"), fileContent);
    if(devMode) console.log("Projekt został zainicjalizowany, kompilujemy!");

    // Kompilujemy!
    await runCommand(`cargo build --manifest-path ${path.join(projectPath, "Cargo.toml")}`);
    console.log(`Ścirzka do skompilowanego projektu: ${path.join(projectPath, "target", "debug", "my-app.exe") }`)
  } catch (error) {
      console.error("Błąd podczas tworzenia projektu:", error);
      process.exit(1);
  }
}