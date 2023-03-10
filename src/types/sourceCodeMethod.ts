import {ISourceCodeFile} from './sourceCodeFile'

export interface ISourceCodeMethod {
  name: string
  parameters: string[]
  file: ISourceCodeFile
}
