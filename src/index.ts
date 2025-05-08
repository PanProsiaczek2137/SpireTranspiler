// TODO:
// * Wprowadzenie zasady DRY (Don't Repeat Yourself).
// * init git i dodanie na githuba (póki co jako prowatny).
// * ogarnąć console.log()
// * Jeśli niema inputu a jest require to zwraca błąd. Lub jak nie jest require i go nie ma to ustawia na wartość domyślną.
// * Obsługa bloków w bloku czyli np że ma wypisać na konsoli coś co zwraca X blok, a nie text / REMONT!
// ? dodanie obsługi wielu typów w inpucie i ustalenie wreście raz na zwarsze jakie typy będzie miał spireTranspiler! czyli: string, boolean, number, block, any
// * dodać funkcję specjalną która sprawdza czy w inpucie jest blok 
// * Wykrywa czy język to ten który jest wybrany i czy każdy modół wspiera wybrany język. No i przy tłumaczeniu tłumaczy na ten wybrany.
// * dodanie bloków typu: if, pętla, itp. czyli jeden (bądź więcej) input będzie typ block
// ! przeprować więcej testów na aktualnych blokach szukając błędów. Tworzą np: kalkulator czy zgadywanie liczby
// ~ więcej wartości do inputów. Np, że jest niezbędna wartość bezpośrenia. Czyli nie może być z zmiennej bądź z innego bloku zwracającego (return block)
// ! dodać więcej modółów
// * zrobić że jak wygeneruje już kod to tworzy plik i sam go kompiluje na wykonywalny
// ! przyśpieszyć program aby za każdym blokiem nie czytał zipa tylko raz zczytał i se go zapisał w pamięci cash (zmiennej)
// ? Sprawdzić blok math_operation. Zmienić aby blok convert_int_to_str itp były jednym blokiem convert. Dodać block random. a no i jeszcze create_variable

// TODO: dodać tag do bloków: <whenRequire>kod</whenRequire> będzie to mówiło kiedy input jest require (nie tylko true/false) no i tagi które zmieniają deafult, canYouPutBlockIn, valueList, placeholder itd
// TODO: ogarnąć wszystkie new fn (mają znak "(!)") tak aby zawierały takie same funkcje/zmienne dla każdej


import { askForFileLocation } from "./ts/userComunication";
import { readFileFromZip, listModulesAndBlocks } from "./ts/zipOperation";
import { createProject } from './projectGenerator';

import { XMLParser } from "fast-xml-parser";



type ParsedCode = Record<string, {
  on_start: Record<string, Array<Record<string, Array<{ '#text': string }>>>>;
}>;
type InputListItem = {
  name: string;
  type: string;
  required: string;
  default: string;
  canYouPutBlockIn: string;
  valueList: string; // Do użycia w spireLite Studio/IDE
  placeholder: string; // Do użycia w spireLite Studio/IDE
  max: string;
  min: string;
  regex: string;
  blockDoc: string; // Do użycia w spireLite Studio/IDE
};
type InputMap = Record<string, string | unknown>;
type RawAttributeValue = { [key: string]: Array<{ '#text'?: string }> };


let whichScript = 0;
export let platform = "windows";
export let lang = "rust";
export let devMode = false;

const langTypes = {"rust": ["string", "bool", "float", "int", "uint", "any", "block"]}
export let code: Array<string> = [];
export let cratesToAdd: string[] = []; 
let input: InputMap = {};
let inputReturn: InputMap = {}
let rawInput: InputMap = {};
let customData: any = {};
export let moduleFiles: any = {}
export const filePath = askForFileLocation();
export const configFile:any = readFileFromZip(filePath, "config.json")

console.clear();
const config = JSON.parse(readFileFromZip(filePath, "config.json") || "{}");
if (config == "{}") {
  console.error("Błąd: Nie znaleziono pliku konfiguracyjnego.");
  process.exit(1);
}

const allModules = listModulesAndBlocks(filePath);
// We create a list of paths to all blocks
const blockPathMap: Record<string, string> = {};
for (const [moduleName, blocks] of Object.entries(allModules)) {
  for (const blockName of blocks) {
    blockPathMap[blockName] = `modules/${moduleName}/${blockName}.xml`;
  }
}

// Runs pre-code from modules
if(devMode)console.log("<-------------------- ( ŁADOWANIE KODU Z MODUŁÓW ) -------------------->");
let loadedModuleName = ""; 
for(let i = 0; i < Object.entries(allModules).length; i++){
  const moduleName = Object.entries(allModules)[i][0];
  loadedModuleName = moduleName;
  const moduleConfigTEXT = readFileFromZip(filePath, `modules/${moduleName}/config.json`);
  if (moduleConfigTEXT) {

    const moduleConfig = JSON.parse(moduleConfigTEXT);
      if(devMode)
      console.log(`Ładujemy kod z modułu: ${moduleName}`);
    if(moduleConfig.runCode == undefined){
      continue;
    }

    let containsLanguage = false;
    for(let j = 0; j < (moduleConfig.targetLanguages).length; j++){
      if(moduleConfig.targetLanguages[j] == lang){
        containsLanguage = true;
      }
    }
    if(!containsLanguage){
      console.error(`Błąd: moduł ${moduleName} nie wspiera języka: ${lang}.`);
      process.exit(1);
    }

    let containsPlatform = false;
    for(let j = 0; j < (moduleConfig.platforms).length; j++){
      if(moduleConfig.platforms[j] == platform){
        containsPlatform = true;
      }
    }
    if(!containsPlatform){
      console.error(`Błąd: moduł ${moduleName} nie wspiera platformy: ${platform}.`);
      process.exit(1);
    }
    
    for(let j = 0; j < (moduleConfig.runCode[lang]).length; j++){
      const localCode = readFileFromZip(filePath, `modules/${moduleName}/${ (moduleConfig.runCode[lang])[j] }`)
      if (localCode) {
        eval(localCode)
      }
    }
    
  }
}
if(devMode)console.log("------------------------------------------------------------------------");


const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  cdataPropName: "cdata",
  processEntities: false,
  preserveOrder: true,
});
const parsedCode = parser.parse(
  readFileFromZip(filePath, config.entryPoints[0]) || "{}"
);


// The main loop that runs each block in the on_start script in turn.
for(; whichScript < parsedCode.length; whichScript++){
  code[whichScript] = "";
  for(let j = 0; j < Object.entries(parsedCode[whichScript].on_start).length; j++){
    if(devMode){
      console.log("\n")
      console.log(`<-------------------- ( ${Object.entries((parsedCode[whichScript].on_start)[j])[0][0]} ) -------------------->`);
    }

    const blockName = Object.entries((parsedCode[whichScript].on_start)[j])[0][0];
    const blockPath = blockPathMap[blockName];
    const blockContent = blockPath ? readFileFromZip(filePath, blockPath) : "{}";
    const parsedBlockContent = parser.parse(blockContent || "{}")[0][lang];

    const inputList = inputsFromDeclaration(parsedBlockContent);
    input = inputsFromUser(Object.entries(parsedCode[whichScript].on_start)[j][1], parsedBlockContent, inputList);

    
    type CodeEntry = { cdata: Array<{ '#text': string }> };
    for (let j = 0; j < parsedBlockContent.length; j++) {
      const entry = Object.entries(parsedBlockContent?.[j])?.[0];

      if (String(entry?.[0]) === 'code') {
        const raw = entry?.[1] as CodeEntry[];
    
        const cdataText = raw?.[0]?.cdata?.[0]?.['#text'];
        if (cdataText) {
          eval(cdataText);
        }
      }
    }
    
    if(devMode) console.log('------------------------------------------------------------');
  }

}

console.log("\n");
console.log(`WYGENEROWANY KOD JĘZYKA ${(lang).toUpperCase()}:`)
console.log("\n");
console.log(code);
console.log("\n"+Object.entries(moduleFiles)+"\n");

createProject()



// @  C:\Users\Mateusz\Desktop\test.srl





//We set the inputList variable to what this declared block supports all inputs. Example
function inputsFromDeclaration(parsedBlockContent: Array<ParsedCode>){
  let inputList: InputListItem[] = [];

  const inputsRaw = (()=>{
    for (const node of parsedBlockContent) {
      if (node["inputs"]) return node["inputs"];
    }
    return null;
  })();


  //  [
  //    { name: 'name', type: 'string', required: true },
  //    { name: 'value', type: 'any', required: true }
  //  ]
  // 
  if (Array.isArray(inputsRaw)) {
    for (const inputNode of inputsRaw) {
      const attrs = inputNode[":@"];
      if (attrs) {
        const cleaned: Record<string, any> = {};
        for (const key in attrs) {
          const cleanedKey = key.replace(/^@_/, "");
          cleaned[cleanedKey] = attrs[key];
        }
        inputList.push(cleaned as InputListItem);
      }
    }
  }

  if(devMode){
    console.log(`Z inputami w definicji bloku:`);
    console.log(inputList);
    console.log("");
  }

  return inputList;
}


// this piece of code deals with: Inputs to a block declared and provided by the user
function inputsFromUser(rawEntry: any, blockData: Array<ParsedCode>, inputList: any){
  let localInputs:any = {};
  // !!! NA TO TRZEBA UWAŻAĆ !!!
  
  let czyJestReturn = false;
  for(let i = 0; i < blockData.length; i++){
    if(blockData[i]["return"] !== undefined){
      czyJestReturn = true;
    }
  }
  if(!czyJestReturn){
    if(devMode) console.log("Zmianiamy rawEntry! na: "+JSON.stringify(rawEntry));
    
    rawInput = rawEntry;
  }

  const inputRawValues = Array.isArray(rawEntry) ? rawEntry[0] : rawEntry;



  const allAttributesInThisBlock = Object.entries(inputRawValues)[0]?.[1] as RawAttributeValue[] ?? [];

  if(devMode){
    console.log("Inputy w tym specyficznym bloku:");
    console.log(JSON.stringify(allAttributesInThisBlock));
    console.log("");
  }

  let doWeHaveThisInput  = false;

  //powarzamy tyle razy ile jest inputów w deklaracji
  for (let i = 0; i < inputList.length; i++) {


    //powtarzamy tyle razy ile jest inputów w tym specyficznym przetwarzanym bloku
    for (let j = 0; j < allAttributesInThisBlock.length; j++) {
      
      //szukamy czy w tym specyficznym bloku jest i input
      if(Object.entries(allAttributesInThisBlock[j])?.[0]?.[0] == inputList[i].name){
        if(devMode){  if(inputList[i].type == "block"){  console.log("Wykryto wartość: "+inputList[i].name+" Która oczekuje bloku")  }else{   console.log("Wykryto wartość: "+inputList[i].name)   };  }
        doWeHaveThisInput = true

        const name = inputList[i].name;
        const value = Object.entries(allAttributesInThisBlock[j])?.[0]?.[1]?.[0];

        //Debuging
        if(inputList[i].canYouPutBlockIn == "false" && value["#text"] === undefined){
          console.error(`Błąd: znajduje się block w inpucie który nie obsługuje bloków`);
          process.exit(1);
        }



        // Kiedy mamy w inpucie od razu wartość
        if(value["#text"] !== undefined){
          if(devMode) console.log(`Która wynosi: ${value?.["#text"]}\n`);

          if(hasCommonElement(inputList[i].type, getTypeOf(value?.["#text"]))  /*inputList[i].type == getTypeOf(value?.["#text"])*/ || inputList[i].type === "any"){

            if (inputList[i].type === "number" /* Później int, float, uint */ && inputList[i].min !== undefined) {
              const num = Number(value?.["#text"]);
              if (!(!isNaN(num) && num >= inputList[i].min)) {
                console.error(`input przekroczył wartość minimalną czyli ${inputList[i].min}. Dostano wartość ${value?.["#text"]}`);
                process.exit(1);
              }
            }

            if (inputList[i].type === "number" /* Później int, float, uint */ && inputList[i].max !== undefined) {
              const num = Number(value?.["#text"]);
              if (!(!isNaN(num) && num <= inputList[i].max)) {
                console.error(`input przekroczył wartość maksymalną czyli ${inputList[i].max}. Dostano wartość ${value?.["#text"]}`);
                process.exit(1);
              }
            }

            if (inputList[i].type === "string" && inputList[i].regex !== undefined) {
              const regex = new RegExp(inputList[i].regex);
              if (!regex.test(value?.["#text"])) {
                console.error(`Wartość inputu ${name} nie pasuje do wzorca regex: ${inputList[i].regex}. Otrzymano: ${value?.["#text"]}`);
                process.exit(1);
              }
            }

            localInputs[name] = value?.["#text"]

          }else{
            console.error(`Błąd: Zły typ danych podany dla inputu ${name}. Oczekuje ${inputList[i].type}, za to otrzymał ${/*typeof*/ getTypeOf(value?.["#text"])}`);
            process.exit(1)
          }
        }

        // Kiedy jest input typu block
        if(value["#text"] === undefined && inputList[i].type === "block"){

          if(inputList[i].min !== undefined || inputList[i].max !== undefined){
            // TODO: można zrobić że min i max oznaczają min i max ilość bloków w input
            console.error(`input ma ustawiony parametr max bądź min pomimo iż jest typu block`);
            process.exit(1);
          }
          
          //Debuging
          if(inputList[i].canYouPutBlockIn == "false"){
            console.error("Błąd: wartość canYouPutBlockIn została ustawiona na false, pomimo iż type inputu to block. Co niema sensu  :<");
            process.exit(1);
          }

          const rawValue = allAttributesInThisBlock[j][name];
          const returnBlockData = returnBlockDetected(rawValue?.[0])[0];
          localInputs[name] = returnBlockData;

        }

        // Kiedy mamy block w inpucie, ale input wymaga wartości
        if(value["#text"] === undefined && inputList[i].type !== "block"){

          // TODO: wymyśleć co tutaj zrobić kiedy ustawiono wartość max/min (albo i regex)

          //Debuging
          if(inputList[i].canYouPutBlockIn == "false"){
            console.error("Błąd: wartość canYouPutBlockIn została ustawiona na false, pomimo to w inpucie znajduje się blok");
            process.exit(1);
          }

          if(devMode) console.log('W której jest blok, przesyłamy do analizy');

          const rawValue = allAttributesInThisBlock[j][name];
          const test = returnBlockDetected(rawValue?.[0])
          const returnBlockData = test[0];
          let theDataTypeThatIsInInput:string = test[1];
          /*
          // Szukamy typu danych który znajduje się w bloku i przypizujemy go do zmiennej "theDataTypeThatIsInInput" 
          const fileOfBlockInsideInputTEXT = readFileFromZip(filePath, blockPathMap[Object.entries(rawValue?.[0])[0][0]]);
          if(fileOfBlockInsideInputTEXT){
            const fileOfBlockInsideInput = parser.parse(fileOfBlockInsideInputTEXT)[0][lang]
            for(let k = 0; k < fileOfBlockInsideInput.length; k++){
              if(Object.entries(fileOfBlockInsideInput[k])[0][0] == "return"){
                const inReturn = fileOfBlockInsideInput[k]["return"][0]
                if(inReturn["#text"]){
                  theDataTypeThatIsInInput = inReturn["#text"];
                }
                if(inReturn["cdata"]){

                  try {
                    const returnType = ne Function("customData", "inputReturn", "lang", "dataTypeOfInput", inReturn["cdata"][0]["#text"])(customData, inputReturn, lang, dataTypeOfInput);
                    console.log("otrzymano: "+returnType);
                    theDataTypeThatIsInInput = returnType;
                  } catch (e) {
                    if(devMode)
                    console.error("Błąd1: podczas evala typu:", e);
                  }

                }
              }
            }
          }
          */
          if(hasCommonElement(inputList[i].type, theDataTypeThatIsInInput) || inputList[i].type === "any"){
            localInputs[name] = returnBlockData
          }else{
            console.error(`Błąd: Zły typ danych podany dla inputu ${inputList[i].name}. Oczekuje ${inputList[i].type}, za to otrzymał ${theDataTypeThatIsInInput}`);
            console.log(customData)
            process.exit(1)
          }
          
        }
        
      }

    }



    //Debuging
    if(doWeHaveThisInput == false){
      if(inputList[i].required == true){
        console.error(`Błąd: Nie znaleziono w bloku ${Object.entries(rawEntry)[0][0]} inputu "${inputList[i].name}" który był wymagany!`);
        process.exit(1);
      }
      if(inputList[i].required == false){
        if(inputList[i].default){
          localInputs[inputList[i].name] = inputList[i].default;
        }else{
          if (inputList[i].type.includes("string")) {
            localInputs[inputList[i].name] = "unKnown";
          } else if (inputList[i].type.includes("number")) {
            localInputs[inputList[i].name] = 0;
          } else if (inputList[i].type.includes("boolean")) {
            localInputs[inputList[i].name] = false;
          } else {
            console.error(`Błąd: Nieobsługiwany typ "${inputList[i].type}" dla inputu "${inputList[i].name}" w bloku ${Object.entries(rawEntry)[0][0]}.`);
            process.exit(1);
          }
          if(devMode) 
          console.error(`Błąd: Input "${inputList[i].name}" w bloku ${Object.entries(rawEntry)[0][0]} nie został znaleziony, przypisano wartość domyślną dla typu "${inputList[i].type}".`);
        }
      }
    }


  }

  return localInputs;

}


function returnBlockDetected(data: object) {
  const blockName = Object.entries(data)?.[0]?.[0];
  const blockPath = blockPathMap[blockName];
  const blockContent = blockPath ? readFileFromZip(filePath, blockPath) : "{}";
  const parsedBlockContent = parser.parse(blockContent || "{}")[0][lang];

  if(devMode) console.log(`Analizujemy blok: ${blockName}\n`);
  
  const inputList = inputsFromDeclaration(parsedBlockContent);
  let input = inputsFromUser(Array.isArray(data) ? data[0] : data, parsedBlockContent, inputList);
  inputReturn = input;



  function dataTypeOfInputInCode(input: string): string {
    const pasedBlock = (data as Record<string, any>)?.[blockName];
    for(let i = 0; i < pasedBlock.length; i++){
      if(Object.entries(pasedBlock[i])[0][0] == input){
        const blockName = Object.entries(pasedBlock[i][input][0])[0][0]
        const fileTEXT = readFileFromZip(filePath, blockPathMap[blockName])
        if(fileTEXT){
          const file = parser.parse(fileTEXT)[0]?.[lang]
          //Szukamy return
          for(let j = 0; j < file.length; j++){
            if(Object.entries(file[j])[0][0] == "return"){

              const data = Object.entries(file[j])[0][1] as any[];

              if(data?.[0]?.["#text"]){
                if(devMode)console.log("Typ jest sztywnie narzucony: "+data?.[0]?.["#text"]+"\n")
                return data?.[0]?.["#text"]
                
              }else if(data?.[0]?.["cdata"]){
                if(devMode)console.log("Typ jest określany przez kod");

                /*
                console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
                console.log(pasedBlock[i][input][0]);
                console.log("&&&");
                console.log(code);
                console.log("&&&");
                console.log(returnBlockDetected(pasedBlock[i][input][0]));
                console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
                */
                //const returnType = ne Function(code)(); // działa jak eval, ale obsługuje "return"
                // ! CHYBA TRZA BĘDZI UŻYĆ ZNÓW: returnBlockDetected  Aby okereślić iunputy użytkownika dla tego bloku

                return returnBlockDetected(pasedBlock[i][input][0])[1];

              }
      
            }
          }
      
        }



      }
    }

    console.error("Błąd: error ze zdefiniowaniem typy");
    process.exit(1);
  }

  let theDataTypeThatIsInInput = "";
            
  for(let k = 0; k < parsedBlockContent.length; k++){    
    if(Object.entries(parsedBlockContent[k])[0][0] == "return"){
      const inReturn = parsedBlockContent[k]["return"][0]
                
      if(inReturn["#text"]){
          theDataTypeThatIsInInput = inReturn["#text"];
      }
                
      if(inReturn["cdata"]){
        try {
          // (!)
          const returnType = new Function("customData", "input", "lang", "dataTypeOfInput", inReturn["cdata"][0]["#text"])(customData, inputReturn, lang, dataTypeOfInputInCode);
          if(devMode) console.log("otrzymano: "+returnType);
          theDataTypeThatIsInInput = returnType;
        } catch (e) {
          if(devMode) console.error("Błąd2: podczas evala typu:", e);
        }
      }
    }
  }
              
        


  // Pętla J i if szukają bloku code w .xml wybranego bloku
  for (let j = 0; j < parsedBlockContent.length; j++) {
    const entry = Object.entries(parsedBlockContent?.[j])?.[0];

    if (String(entry?.[0]) === 'code') {
      const raw = entry?.[1] as { cdata: Array<{ '#text': string }> }[];

      const cdataText = raw?.[0]?.cdata?.[0]?.['#text'];
      if (cdataText) {
        // (!)
        const fn = new Function("input", "addAtBlockLocation", "lang", "rawInput", "isThereBlockInTheInput", "dataTypeOfInput", "GET", "addOnTopOfTheFile", "isThereSpecificBlockInTheInput", "stripQuotes", "customData", cdataText);
        let localCode = '';
        const localAdder = (s: string) => localCode += s;
        fn(input, localAdder, lang, rawInput, isThereBlockInTheInput, dataTypeOfInputInCode, GET, addOnTopOfTheFile, isThereSpecificBlockInTheInput, stripQuotes, customData);
        return [localCode, theDataTypeThatIsInInput];
      }
    
    }
    
  }
  return [];
}

function hasCommonElement(a: string, b: string): boolean {
  if(devMode) console.log(`Sprawdzamy czy ${a} i ${b} współnie zawierają elementy`);
  function toArray(input: string): any[] {
      input = input.trim();
      if (input.startsWith("[") && input.endsWith("]")) {
          try {
              const parsed = JSON.parse(input);
              if (Array.isArray(parsed)) {
                  return parsed;
              }
          } catch {
              // Ignorujemy błąd parsowania
          }
      }
      return [input];
  }

  const arrayA = toArray(a);
  const arrayB = toArray(b);
  const setB = new Set(arrayB);

  return arrayA.some(item => setB.has(item));
}

function getTypeOf(data: any): string {
  if (lang === "rust") {
    if (typeof data === "boolean") return "bool";
    if (typeof data === "string") return "string";
    if (typeof data === "number") {
      if(Number.isInteger(data)){
        if(data >= 0){
          return '["int", "uint"]';
        }else{
          return "uint"
        }
      }else{
        return "float";
      }
    }
    // Tu możesz dodać inne przypadki, np. tablice, obiekty itp.
    return "unknown";
  }

  // Możliwość dodania innych języków w przyszłości
  console.error(`Błąd: język ${lang} nie jest wspierany`);
  process.exit(1);
}







function addAtBlockLocation(data: string){
  code[whichScript] += data;
  if(devMode)console.log("Dodano kod: "+data);
}

function addOnTopOfTheFile(data: string){
  code[whichScript] = data + "\n" + code[whichScript];
  if(devMode) console.log("Dodano kod na góre pliku: "+data);
}

function addCrateToProject(data: string){
  cratesToAdd.push(data);
  // TODO: zrobić aby nie usuwał całego projektu ponieważ musi ciągle dodawać od nowa te crates
} 

function GET(path: (string | number)[]): any {
  let current: any = rawInput?.[Object.entries(rawInput)[0][0]];

  for (const step of path) {
    if (Array.isArray(current)) {
      // Automatyczna konwersja tablicy obiektów z pojedynczym kluczem na zwykły obiekt
      if (current.every(item => typeof item === 'object' && item !== null && Object.keys(item).length === 1)) {
        current = current.reduce((acc, obj) => {
          const key = Object.keys(obj)[0];
          acc[key] = obj[key];
          return acc;
        }, {} as Record<string, any>);
      } else {
        // Jeżeli nie jest to typowa tablica obiektów — traktujemy jak normalną tablicę
        current = current[Number(step)];
        continue;
      }
    }

    current = current?.[step];
    if (current === undefined) break;
  }

  return current;
}

function dataTypeOfInput(input: string){
  if(devMode)console.log(`Sprawdzamy typ inputu: ${input}`);
  const blockInInput = Object.entries(GET([input])[0])[0][0];
  const fileTEXT = readFileFromZip(filePath, blockPathMap[blockInInput]);
  if(fileTEXT){
    const file = parser.parse(fileTEXT)

    //Szukamy return
    for(let i = 0; i < file.length; i++){
      if(Object.entries(file[i])[0][0] == "return"){


        const data = Object.entries(file[i])[0][1] as any[];
        if(data?.[0]?.["#text"]){
          if(devMode)
          console.log("Typ jest sztywnie narzucony: "+data?.[0]?.["#text"]+"\n")
          return data?.[0]?.["#text"]
          
        }else if(data?.[0]?.["cdata"]){
          if(devMode)
          console.log("Typ jest określany przez kod");
          const code = data?.[0]?.["cdata"]?.[0]?.["#text"].trim();
          //const returnType = ne Function(code)(); // działa jak eval, ale obsługuje "return"
          try {
            // (!)
            const returnType = new Function("customData", "input", "lang", code)(customData, inputReturn, lang);
            return returnType;
          } catch (e) {
            if(devMode)
            console.error("Błąd3: podczas evala typu:", e);
          }
        }

      }
    }

  }
}

function isThereBlockInTheInput(input: string){
  return (GET([input, "#text"]) === undefined)
}

function isThereSpecificBlockInTheInput(input: string, nameOfBlock: string){
  //return (GET([input, "#text"]) === undefined)
  if(GET([input, "#text"]) === undefined){
    //Wiemy że jest block i sprawdzamy czy to ten
    return (Object.entries(GET([input])[0])[0][0] === nameOfBlock);
  }else{
    return false
  }
}

function addToModuleFile(data: string){
  if(devMode)console.log("dodano do modułu: "+loadedModuleName);
  if(moduleFiles[loadedModuleName] == undefined){
    moduleFiles[loadedModuleName] = "";
  }
  moduleFiles[loadedModuleName] += data
}

function stripQuotes(str: string): string {
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith("`") && str.endsWith("`"))
  ) {
    return str.slice(1, -1);
  }
  return str;
}