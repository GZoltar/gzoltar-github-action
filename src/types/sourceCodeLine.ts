import {IAlgorithmSuspiciousness} from './algorithmSuspiciousness'
import {ISourceCodeMethod} from './sourceCodeMethod'

export interface ISourceCodeLine {
  lineNumber: number
  method: ISourceCodeMethod
  suspiciousnessMetrics: IAlgorithmSuspiciousness[]
}
