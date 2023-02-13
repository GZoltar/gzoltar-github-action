import {testCaseLineCoverage} from './testCaseLineCoverage'

export interface testCase {
  testName: string

  /**
   * Indicates if the test passed or failed
   */
  passed: boolean

  /**
   * runtime in nanoseconds
   */
  runtime: number

  /**
   * stacktrace if test failed
   */
  stacktrace?: string

  /**
   * line coverage for this test case
   */
  coverage?: testCaseLineCoverage[]
}
