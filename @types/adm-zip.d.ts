declare module 'adm-zip' {
    class AdmZip {
        constructor(zipFile?: string);
        addFile(name: string, data: any): void;
        extractAllTo(destination: string, overwrite: boolean): void;
        getEntries(): any[];
    }
    export = AdmZip;
}
