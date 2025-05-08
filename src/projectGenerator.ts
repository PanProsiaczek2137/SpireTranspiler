import { code, devMode, filePath, moduleFiles, configFile, platform, cratesToAdd, lang } from './index'
import { langGlobal } from './ts/userComunication'

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
      if(fs.existsSync(path.join(projectPath, "Cargo.toml")) && lang == "rust"){
        build(false);
      }else{
        // dodać konwersje do innych języków
        process.exit(1);
        build(true);
      }
    }else{
      fs.mkdirSync(projectPath, { recursive: true });
      build(true);
    }


  } catch (error) {
      console.error("Błąd podczas tworzenia projektu:", error);
      process.exit(1);
  }
}

async function build(fromScratch: boolean){
  if(langGlobal == "rust"){
    if(fromScratch){
      await runCommand(`cargo init ${projectPath}`);
    }
    const mainFile = path.join(projectPath, "src", "main.rs")
    fs.writeFileSync(mainFile, "");
    const entries:any = Object.entries(moduleFiles);
    for(let i = 0; i < entries.length; i++){
      const file = fs.readFileSync(mainFile, 'utf-8');
      fs.writeFileSync(mainFile, file + `mod ${entries[i][0]};\n`);
    }

    let file = fs.readFileSync(mainFile, 'utf-8');
    fs.writeFileSync(mainFile, file + `
#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
async fn main() {`)

    for(let i = 0; i < code.length; i++){
      file = fs.readFileSync(mainFile, 'utf-8');
      fs.writeFileSync(mainFile, file + `
  let handle${i} = tokio::spawn(core${i}());`);
    }
    for(let i = 0; i < code.length; i++){
      file = fs.readFileSync(mainFile, 'utf-8');
      fs.writeFileSync(mainFile, file + `
  handle${i}.await.unwrap();`);
    }
    file = fs.readFileSync(mainFile, 'utf-8');
    fs.writeFileSync(mainFile, file + `\n}\n\n`);

    for(let i = 0; i < code.length; i++){
      file = fs.readFileSync(mainFile, 'utf-8');
      fs.writeFileSync(mainFile, file + `async fn core${i}() {\n\t${code[i]}\n}\n\n`);
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

    for(let i = 0; i < cratesToAdd.length; i++){
      await runCommand(`cd ${projectPath} && cargo add ${cratesToAdd[i]}`);
    }

    await runCommand(`cd ${projectPath} && cargo add tokio --features full`);

    // Kompilujemy!
    if(devMode) console.log("Projekt został zainicjalizowany, kompilujemy!");
    await runCommand(`cargo build --manifest-path ${path.join(projectPath, "Cargo.toml")}`);
    console.log(`Ścirzka do skompilowanego projektu: ${path.join(projectPath, "target", "debug", "my-app.exe") }`)
  }
}