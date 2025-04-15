//TODO:
//* Wprowadzenie zasady DRY (Don't Repeat Yourself).
//* init git i dodanie na githuba (póki co jako prowatny).
//! Obsługa bloków w bloku czyli np że ma wypisać na konsoli coś co zwraca X blok, a nie text / REMONT!
//! ogarnąć console.log()
//! Sprawdzanie czy input w bloku faktycznie będzie tego typu który potrzebóje.
//! Wykrywa czy język to ten który jest wybrany i czy każdy modół wspiera wybrany język. No i przy tłumaczeniu tłumaczy na ten wybrany.
//! Jeśli niema inputu a jest require to zwraca błąd. Lub jak nie jest require i go nie ma to ustawia na wartość domyślną.

//TODO:  POMYSŁ NA DZIAŁANIE TRANSPILERA
//?      Lecimy pokolei, czyli przykład z wypisanie czegoś na konsoli:
//?      println!("{   <-- zostało dodane po czy dochodzimy do input.value
//?      gdzie sprawdzamy czy jest blok jeśli tak to sczytujemy blok z tą zasadą
//?      jeśli nie to podajemy dane i lecimy dalej. Czyli kończymy to z
//?      }"); całe. Przydało by się jescze dodać funkcję dla developerów
//?      IS_THERE_BLOCK_INSIDE("nazwa inputu"); zwrawa true/false



import { askForFileLocation } from "./ts/userComunication";
import { readFileFromZip, listModulesAndBlocks } from "./ts/zipOperation";

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
const lang = "rs";

let code = '';

let inputList: InputListItem[] = [];
let input: InputMap = {};
let rawInput: InputMap = {};

const filePath = askForFileLocation();
const config = JSON.parse(readFileFromZip(filePath, "config.json") || "{}");
if (config == "{}") {
  console.error("Nie znaleziono pliku konfiguracyjnego.");
  process.exit(1);
}

let allModules = listModulesAndBlocks(filePath);
const blockPathMap: Record<string, string> = {};
for (const [moduleName, blocks] of Object.entries(allModules)) {
  for (const blockName of blocks) {
    blockPathMap[blockName] = `modules/${moduleName}/${blockName}.xml`;
  }
}
console.log(blockPathMap);


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
  console.log("---------------------------------");

  const blockName = Object.entries((parsedCode[whichScript].on_start)[i])[0][0];
  const blockPath = blockPathMap[blockName];
  const blockContent = blockPath ? readFileFromZip(filePath, blockPath) : "{}";
  const parsedBlockContent = parser.parse(blockContent || "{}");

  console.log("przetwarzamy blok: "+blockName);

  inputsFromDeclaration(parsedBlockContent);
  inputsFromUser(Object.entries(parsedCode[whichScript].on_start)[i][1], true);

  
  type CodeEntry = { cdata: Array<{ '#text': string }> };
  for (let j = 0; j < parsedBlockContent.length; j++) {
    const entry = Object.entries(parsedBlockContent?.[j])?.[0];
  
    if (String(entry?.[0]) === 'code') {
      const raw = entry?.[1] as CodeEntry[];
  
      const cdataText = raw?.[0]?.cdata?.[0]?.['#text'];
      if (cdataText) {
        //console.log("Zawartość CDATA:", cdataText);
        eval(cdataText);
      }
    }
  }
  
  console.log("---------------------------------");
}


console.log(code);


//!  C:\Users\Mateusz\Desktop\test.srl

//We set the inputList variable to what this declared block supports all inputs. Example
function inputsFromDeclaration(parsedBlockContent: Array<ParsedCode>){
  inputList = [];

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
  console.log(`Z inputami: ${JSON.stringify(inputList)}`);
}
// this piece of code deals with: Inputs to a block declared and provided by the user
function inputsFromUser(rawEntry: any, fromMainLoop: boolean){
  if(fromMainLoop){
    rawInput = rawEntry;
  }

  const inputRawValues = Array.isArray(rawEntry) ? rawEntry[0] : rawEntry;
  const allAttributesInThisBlock = Object.entries(inputRawValues)[0]?.[1] as RawAttributeValue[] ?? [];

  for (let inputDef of inputList) {
    const inputName = inputDef.name;
    let found = false;

    for (let attribute of allAttributesInThisBlock) {
      if (attribute.hasOwnProperty(inputName)) {
        const rawValue = attribute[inputName];

        if (Array.isArray(rawValue) && rawValue[0]?.['#text']) {
          console.log(`${inputName}: ${rawValue[0]['#text']}`);
          input[inputName] = rawValue[0]['#text'];
        } else {
          console.log(`Wykryto blok w ${inputName}, przesyłamy do analizy:`, rawValue?.[0]);
          input[inputName] = returnBlockDetected(rawValue?.[0]); // Upewnij się, że to coś zwraca!
        }

        found = true;
        break;
      }
    }

    if (!found) {
      if (inputDef.required === "true") {
        console.error(`Brak wymaganego inputu: ${inputName}`);
        process.exit(1);
      } else {
        input[inputName] = inputDef.default;
      }
    }
  }
}



function returnBlockDetected(data: object): any {

  const blockName = Object.entries(data)?.[0]?.[0];
  const blockPath = blockPathMap[blockName];
  const blockContent = blockPath ? readFileFromZip(filePath, blockPath) : "{}";
  const parsedBlockContent = parser.parse(blockContent || "{}");

  console.log(`Analizujemy ${blockName}`)

  inputsFromDeclaration(parsedBlockContent);
  inputsFromUser(Array.isArray(data) ? data[0] : data, false);

  console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIII");
  console.log("parsedBlockContent: ");
  console.log(parsedBlockContent);
  console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIII");
  
  // Pętla J i if szukają bloku code w .xml wybranego bloku
  for (let j = 0; j < parsedBlockContent.length; j++) {
    const entry = Object.entries(parsedBlockContent?.[j])?.[0];

    if (String(entry?.[0]) === 'code') {
      const raw = entry?.[1] as { cdata: Array<{ '#text': string }> }[];


      const cdataText = raw?.[0]?.cdata?.[0]?.['#text'];
      if (cdataText) {
        const fn = new Function("input", "addAtBlockLocation", cdataText);
        let localCode = '';
        const localAdder = (s: string) => localCode += s;
        fn(input, localAdder);
        return localCode;
      }


    }
  }

  return '';
}



function addAtBlockLocation(data: string){
  code += data;
  console.log("Dodano: "+data);
}


//TODO: Użyć funkcji GET aby uptościć kod w funkcjach: inputsFromDeclaration, inputsFromUser i można nawet returnBlockDetected
function GET(path: (string | number)[]): any {
  let current: any = rawInput;

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
