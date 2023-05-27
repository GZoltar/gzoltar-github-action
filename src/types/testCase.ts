import {ISourceCodeLine} from './sourceCodeLine'

export interface ITestCase {
  testName: string

  /**
   * Indicates if the test passed or failed
   */
  passed: boolean

  /**
   * Runtime in nanoseconds
   */
  runtime: number

  /**
   * Stacktrace if test failed
   */
  stacktrace?: string

  /**
   * Line coverage for this test case. If a line is included in this array, it means that the line was covered.
   */
  coverage: ISourceCodeLine[]
}
