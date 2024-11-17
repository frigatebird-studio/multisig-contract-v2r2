export declare const findWrappers: () => Promise<{
    path: string;
    name: string;
}[]>;
export declare const readCompiled: (name: string) => Promise<string>;
