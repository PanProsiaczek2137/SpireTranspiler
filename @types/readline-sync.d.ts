declare module 'readline-sync' {
    function question(query: string): string;
    function keyIn(prompt?: string, options?: any): string;
    function keyInYNStrict(prompt?: string): boolean;
    function prompt(options?: any): string;
    function setDefaultOptions(options: any): void;

    export { question, keyIn, keyInYNStrict, prompt, setDefaultOptions };
}
