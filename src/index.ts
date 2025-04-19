// TODO:
// * Wprowadzenie zasady DRY (Don't Repeat Yourself).
// * init git i dodanie na githuba (póki co jako prowatny).
// * ogarnąć console.log()
// * Jeśli niema inputu a jest require to zwraca błąd. Lub jak nie jest require i go nie ma to ustawia na wartość domyślną.
// * Obsługa bloków w bloku czyli np że ma wypisać na konsoli coś co zwraca X blok, a nie text / REMONT!
// ~ dodanie obsługi wielu typów w inpucie i ustalenie wreście raz na zwarsze jakie typy będzie miał spireTranspiler!
// * dodać funkcję specjalną która sprawdza czy w inpucie jest blok 
// * Wykrywa czy język to ten który jest wybrany i czy każdy modół wspiera wybrany język. No i przy tłumaczeniu tłumaczy na ten wybrany.
// * dodanie bloków typu: if, pętla, itp. czyli jeden (bądź więcej) input będzie typ block
// ! przeprować więcej testów na aktualnych blokach szukając błędów. Tworzą np: kalkulator czy zgadywanie liczby
// ! więcej wartości do inputów. Np, że jest niezbędna wartość bezpośrenia. Czyli nie może być z zmiennej bądź z innego bloku zwracającego (return block)
// ! dodać więcej modółów
// ? zrobić że jak wygeneruje już kod to tworzy plik i sam go kompiluje na wykonywalny
// ! jak jest "" w string to zamienia na ''


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
};
type InputMap = Record<string, string | unknown>;
type RawAttributeValue = { [key: string]: Array<{ '#text'?: string }> };



let whichScript = 0;
let lang = "rust";
export let devMode = true;

export let code = '';
let input: InputMap = {};
let inputReturn: InputMap = {}
let rawInput: InputMap = {};
let customData: any = {};

console.clear();
export const filePath = askForFileLocation();
const config = JSON.parse(readFileFromZip(filePath, "config.json") || "{}");
if (config == "{}") {
  console.error("Nie znaleziono pliku konfiguracyjnego.");
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
for(let i = 0; i < Object.entries(allModules).length; i++){
  const moduleName = Object.entries(allModules)[i][0];
  const moduleConfigTEXT = readFileFromZip(filePath, `modules/${moduleName}/config.json`);
  if (moduleConfigTEXT) {
    const moduleConfig = JSON.parse(moduleConfigTEXT);
      if(devMode)
      console.log(`Ładujemy kod z modułu: ${moduleName}`);
    if(moduleConfig.runCode == undefined){
      continue;
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
for(let i = 0; i < Object.entries(parsedCode[whichScript].on_start).length; i++){
  if(devMode){
    console.log("\n")
    console.log(`<-------------------- ( ${Object.entries((parsedCode[whichScript].on_start)[i])[0][0]} ) -------------------->`);
  }

  const blockName = Object.entries((parsedCode[whichScript].on_start)[i])[0][0];
  const blockPath = blockPathMap[blockName];
  const blockContent = blockPath ? readFileFromZip(filePath, blockPath) : "{}";
  const parsedBlockContent = parser.parse(blockContent || "{}");

  const inputList = inputsFromDeclaration(parsedBlockContent);
  input = inputsFromUser(Object.entries(parsedCode[whichScript].on_start)[i][1], parsedBlockContent, inputList);

  
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
  
  if(devMode)
  console.log('------------------------------------------------------------');
}



console.log("\n");
console.log(`WYGENEROWANY KOD JĘZYKA ${(lang).toUpperCase()}:`)
console.log("\n");
console.log(code);
console.log("\n");
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

  let czyJestReturn = false;
  for(let i = 0; i < blockData.length; i++){
    if(blockData[i]["return"] !== undefined){
      czyJestReturn = true;
    }
  }
  if(!czyJestReturn){
    console.log("Zmianiamy rawEntry! na: "+JSON.stringify(rawEntry));
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

        if(value["#text"] !== undefined){
          if(devMode) console.log(`Która wynosi: ${value?.["#text"]}\n`);

          if(inputList[i].type == /*typeof*/ getTypeOf(value?.["#text"]) || inputList[i].type === "any"){
            localInputs[name] = value?.["#text"]
          }else{
            console.error(`Zły typ danych podany dla inputu ${name}. Oczekuje ${inputList[i].type}, za to otrzymał ${/*typeof*/ getTypeOf(value?.["#text"])}`);
            process.exit(1)
          }
        }
        if(value["#text"] === undefined && inputList[i].type === "block"){
          console.log("DZIAŁA!!!!!!!!") 
          const rawValue = allAttributesInThisBlock[j][name];
          console.log(rawValue);
          const returnBlockData = returnBlockDetected(rawValue?.[0]);
          console.log("OKEJ!")
          console.log(returnBlockData);
          localInputs[name] = returnBlockData;
        }
        if(value["#text"] === undefined && inputList[i].type !== "block"){
          if(devMode) console.log('W której jest blok, przesyłamy do analizy');

          const rawValue = allAttributesInThisBlock[j][name];
          const returnBlockData = returnBlockDetected(rawValue?.[0]);
          let theDataTypeThatIsInInput = "";

          // Szukamy typu danych który znajduje się w bloku i przypizujemy go do zmiennej "theDataTypeThatIsInInput" 
          const fileOfBlockInsideInputTEXT = readFileFromZip(filePath, blockPathMap[Object.entries(rawValue?.[0])[0][0]]);
          if(fileOfBlockInsideInputTEXT){
            const fileOfBlockInsideInput = parser.parse(fileOfBlockInsideInputTEXT)
            for(let k = 0; k < fileOfBlockInsideInput.length; k++){
              if(Object.entries(fileOfBlockInsideInput[k])[0][0] == "return"){
                const inReturn = fileOfBlockInsideInput[k]["return"][0]
                if(inReturn["#text"]){
                  theDataTypeThatIsInInput = inReturn["#text"];
                }
                if(inReturn["cdata"]){

                  try {
                    const returnType = new Function("customData", "inputReturn", "lang", inReturn["cdata"][0]["#text"])(customData, inputReturn, lang);
                    theDataTypeThatIsInInput = returnType
                  } catch (e) {
                    if(devMode)
                    console.error("Błąd podczas evala typu:", e);
                  }

                }
              }
            }
          }

          if(inputList[i].type == theDataTypeThatIsInInput || inputList[i].type === "any"){
            localInputs[name] = returnBlockData
          }else{
            console.error(`Zły typ danych podany dla inputu ${inputList[i].name}. Oczekuje ${inputList[i].type}, za to otrzymał ${theDataTypeThatIsInInput}`);
            console.log(customData)
            process.exit(1)
          }
          
        }
        
      }

    }







    //Debuging
    if(doWeHaveThisInput == false){
      if(inputList[i].required == true){
        console.error(`Nie znaleziono w bloku ${Object.entries(rawEntry)[0][0]} inputu "${inputList[i].name}" który był wymagany!`);
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
            console.error(`Nieobsługiwany typ "${inputList[i].type}" dla inputu "${inputList[i].name}" w bloku ${Object.entries(rawEntry)[0][0]}.`);
            process.exit(1);
          }
          if(devMode) 
          console.error(`Input "${inputList[i].name}" w bloku ${Object.entries(rawEntry)[0][0]} nie został znaleziony, przypisano wartość domyślną dla typu "${inputList[i].type}".`);
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
  const parsedBlockContent = parser.parse(blockContent || "{}");

  if(devMode) console.log(`Analizujemy blok: ${blockName}\n`);
  
  const inputList = inputsFromDeclaration(parsedBlockContent);
  let input = inputsFromUser(Array.isArray(data) ? data[0] : data, parsedBlockContent, inputList);
  inputReturn = input;

  // Pętla J i if szukają bloku code w .xml wybranego bloku
  for (let j = 0; j < parsedBlockContent.length; j++) {
    const entry = Object.entries(parsedBlockContent?.[j])?.[0];

    if (String(entry?.[0]) === 'code') {
      const raw = entry?.[1] as { cdata: Array<{ '#text': string }> }[];

      const cdataText = raw?.[0]?.cdata?.[0]?.['#text'];
      if (cdataText) {
        const fn = new Function("input", "addAtBlockLocation", "lang", "rawInput", "isThereBlockInTheInput", "dataTypeOfInput", "GET", "addOnTopOfTheFile", "isThereSpecificBlockInTheInput", cdataText);
        let localCode = '';
        const localAdder = (s: string) => localCode += s;
        fn(input, localAdder, lang, rawInput, isThereBlockInTheInput, dataTypeOfInput, GET, addOnTopOfTheFile, isThereSpecificBlockInTheInput);
        return localCode;
      }
    
    }
    
  }
  return '';
}



function isTypeMatch(expected: string, value: any): boolean {
  if (expected === "string") return typeof value === "string";
  if (expected === "number") return !isNaN(Number(value));
  if (expected === "boolean") return value === "true" || value === "false";
  if (expected === "any") return true;
  return false;
}



function getTypeOf(data: any){
  if(lang == "rust"){

    if(typeof data == "string"){
      return "string"
    }else if(typeof data == "boolean"){
      return "bool"
    } else if (typeof data === "number") {
      if (Number.isInteger(data)) {
        return "int";
      } else {
        return "float";
      }
    }else if(data == Array || data == Object){
      return "block";
    }
  }
}







function addAtBlockLocation(data: string){
  code += data;
  if(devMode)
  console.log("Dodano kod: "+data);
}

function addOnTopOfTheFile(data: string){
  code = data + "\n" + code;
  if(devMode)
  console.log("Dodano kod na góre pliku: "+data);
}

// TODO: Użyć funkcji GET aby uptościć kod w funkcjach: inputsFromDeclaration, inputsFromUser i można nawet returnBlockDetected i innych.
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
  if(devMode)
  console.log(`Sprawdzamy typ inputu: ${input}`);

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
          //const returnType = new Function(code)(); // działa jak eval, ale obsługuje "return"
          try {
            const returnType = new Function("customData", "inputReturn", "lang", code)(customData, inputReturn, lang);
            return returnType;
          } catch (e) {
            if(devMode)
            console.error("Błąd podczas evala typu:", e);
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