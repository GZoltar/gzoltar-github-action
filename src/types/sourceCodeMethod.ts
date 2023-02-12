import { sourceCodeFile } from "./sourceCodeFile"

export interface sourceCodeMethod {
  name: string
  parameters: string[]
  file: sourceCodeFile
}
