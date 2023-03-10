import {ISourceCodeLine} from './sourceCodeLine'

export interface ITestCaseLineCoverage {
  line: ISourceCodeLine
  covered: boolean
}
