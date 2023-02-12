import { sourceCodeMethod } from "./sourceCodeMethod";

export interface sourceCodeLine{
    lineNumber: number;
    method: sourceCodeMethod;
    covered: boolean;
}