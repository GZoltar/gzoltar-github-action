import {algorithmSuspiciousness} from './algorithmSuspiciousness'
import {sourceCodeMethod} from './sourceCodeMethod'

export interface sourceCodeLine {
  lineNumber: number
  method: sourceCodeMethod
  suspiciousnessMetrics: algorithmSuspiciousness[]
}
