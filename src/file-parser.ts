import {sourceCodeFile} from './types/sourceCodeFile'
import {sourceCodeLine} from './types/sourceCodeLine'
import {sourceCodeMethod} from './types/sourceCodeMethod'
import {statistic} from './types/statistic'
import {testCase} from './types/testCase'

import * as stateHelper from './state-helper'
import * as fs from './fs-helper'
const path = require('path')

export default class FileParser {
  private _sourceCodeFiles: sourceCodeFile[] = []
  private _sourceCodeMethods: sourceCodeMethod[] = []
  private _sourceCodeLines: sourceCodeLine[] = []
  private _testCases: testCase[] = []
  private _statistics: statistic[] = []

  constructor() {}

  public async parse(
    buildPath: string,
    sflRanking: string[],
    testCasesFilePath?: string,
    spectraFilePath?: string,
    matrixFilePath?: string,
    statisticsFilePath?: string
  ) {
    await this.parseTestCases(buildPath, testCasesFilePath)
    await this.parseSpectra(buildPath, spectraFilePath)
    sflRanking.forEach(async ranking => {
      await this.parseRanking(buildPath, ranking)
    })
    await this.parseMatrix(buildPath, matrixFilePath)
    await this.parseStatistics(buildPath, statisticsFilePath)
  }

  public get sourceCodeFiles(): sourceCodeFile[] {
    return this._sourceCodeFiles
  }

  public get sourceCodeMethods(): sourceCodeMethod[] {
    return this._sourceCodeMethods
  }

  public get sourceCodeLines(): sourceCodeLine[] {
    return this._sourceCodeLines
  }

  public get testCases(): testCase[] {
    return this._testCases
  }

  public get statistics(): statistic[] {
    return this._statistics
  }

  private async parseTestCases(
    buildPath: string,
    testCasesFilePath?: string
  ): Promise<testCase[]> {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (testCasesFilePath) {
      testCasesFilePath = path.join(
        stateHelper.rootDirectory,
        testCasesFilePath
      )
      if (!fs.fileExists(testCasesFilePath!)) {
        throw new Error(`TestCases file '${testCasesFilePath}' does not exist`)
      }
    } else {
      testCasesFilePath = fs.searchFile(buildPath, 'tests.csv')

      if (!testCasesFilePath) {
        throw new Error(`TestCases file '${testCasesFilePath}' does not exist`)
      }
    }

    const lines = await fs.readFileAndGetLines(testCasesFilePath!)

    let testCases: testCase[] = []
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name,outcome,runtime,stacktrace') {
          // next line
          return
        }
        const parts = line.split(',')

        if (parts.length < 3) {
          throw new Error(`TestCases file '${testCasesFilePath}' is invalid`)
        }

        const testCase: testCase = {
          testName: parts[0],
          passed: parts[1] == 'PASS' ? true : false,
          runtime: parseInt(parts[2]),
          stacktrace: parts[1] == 'PASS' ? undefined : parts[3],
          coverage: []
        }

        testCases.push(testCase)
      })
      this._testCases = testCases
      return testCases
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing TestCases file '${testCasesFilePath}': ${
          (error as any)?.message ?? error
        }`
      )
    }
  }

  private async parseSpectra(buildPath: string, spectraFilePath?: string) {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (spectraFilePath) {
      spectraFilePath = path.join(stateHelper.rootDirectory, spectraFilePath)
      if (!fs.fileExists(spectraFilePath!)) {
        throw new Error(`spectra file '${spectraFilePath}' does not exist`)
      }
    } else {
      spectraFilePath = fs.searchFile(buildPath, 'spectra.csv')

      if (!spectraFilePath) {
        throw new Error(`spectra file '${spectraFilePath}' does not exist`)
      }
    }

    const lines = await fs.readFileAndGetLines(spectraFilePath!)
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name') {
          // next line
          return
        }

        const parts = line.split(':')

        if (parts.length != 2) {
          throw new Error(`spectra file '${spectraFilePath}' is invalid`)
        }

        const methodLocation = parts[0].split('#')
        const lineIdentifiedOnSpectra = parseInt(parts[1])

        const classFile = methodLocation[0].split('$')
        const methodInfo = methodLocation[1].split('(')

        const methodName = methodInfo[0]
        const methodParametersString = methodInfo[1]
          .replace(')', '')
          .replace(/\s+/g, '')
        let methodParameters: string[] = []

        if (methodParametersString != '') {
          methodParameters = methodParametersString.split(',')
        }
        const packageName = classFile[0]
        const className = classFile[1]

        let sourceCodeFile = this._sourceCodeFiles.find(file => {
          if (file.name == className && file.packageName == packageName) {
            return true
          }
          return false
        })

        if (!sourceCodeFile) {
          const filePath = fs.searchFile(
            stateHelper.rootDirectory,
            `${className}.java`,
            true,
            packageName
          )
          sourceCodeFile = {
            name: className,
            packageName: packageName,
            path: filePath
          }
          this._sourceCodeFiles.push(sourceCodeFile)
        }

        let sourceCodeMethod = this.sourceCodeMethods.find(method => {
          if (
            method.name == methodName &&
            method.file == sourceCodeFile &&
            method.parameters.toString() == methodParameters.toString()
          ) {
            return true
          }
          return false
        })

        if (!sourceCodeMethod) {
          sourceCodeMethod = {
            name: methodName,
            file: sourceCodeFile,
            parameters: methodParameters
          }
          this._sourceCodeMethods.push(sourceCodeMethod)
        }

        let sourceCodeLine = this._sourceCodeLines.find(line => {
          if (
            line.method == sourceCodeMethod &&
            line.lineNumber == lineIdentifiedOnSpectra
          ) {
            return true
          }
          return false
        })

        if (!sourceCodeLine) {
          sourceCodeLine = {
            method: sourceCodeMethod,
            lineNumber: lineIdentifiedOnSpectra,
            suspiciousnessMetrics: []
          }
          this._sourceCodeLines.push(sourceCodeLine)
        }
      })
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing spectra file '${spectraFilePath}': ${
          (error as any)?.message ?? error
        }`
      )
    }
  }

  private async parseRanking(
    buildPath: string,
    ranking: string,
    rankingFilePath?: string
  ) {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (!ranking) {
      throw new Error("Arg 'ranking' must not be empty")
    }

    if (this._testCases.length == 0) {
      throw new Error('testCases must be parsed first to parse ranking files')
    }

    if (
      this._sourceCodeLines.length == 0 ||
      this._sourceCodeMethods.length == 0 ||
      this._sourceCodeFiles.length == 0
    ) {
      throw new Error(
        'Ranking files can only be parsed after spectra file is parsed'
      )
    }

    if (rankingFilePath) {
      rankingFilePath = path.join(stateHelper.rootDirectory, rankingFilePath)
      if (!fs.fileExists(rankingFilePath!)) {
        throw new Error(`ranking file '${rankingFilePath}' does not exist`)
      }
    } else {
      rankingFilePath = fs.searchFile(buildPath, `${ranking}.ranking.csv`)

      if (!rankingFilePath) {
        throw new Error(`ranking file '${rankingFilePath}' does not exist`)
      }
    }

    const lines = await fs.readFileAndGetLines(rankingFilePath!)

    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name;suspiciousness_value') {
          // next line
          return
        }

        const parts = line.split(';')

        if (parts.length != 2) {
          throw new Error(`ranking file '${rankingFilePath}' is invalid`)
        }
        const suspiciousnessValue = parseFloat(parts[1])

        const methodLineInfo = parts[0].split(':')
        const methodLocation = methodLineInfo[0].split('#')
        const lineIdentifiedOnSpectra = parseInt(methodLineInfo[1])

        const classFile = methodLocation[0].split('$')
        const methodInfo = methodLocation[1].split('(')

        const methodName = methodInfo[0]
        let methodParameters = methodInfo[1].replace(')', '').split(',')

        methodParameters = methodParameters.map((parameter, index) => {
          parameter.trim()
          return parameter
        })

        const packageName = classFile[0]
        const className = classFile[1]

        let sourceCodeFile = this._sourceCodeFiles.find(file => {
          if (file.name == className && file.packageName == packageName) {
            return true
          }
          return false
        })

        if (!sourceCodeFile) {
          throw new Error('Ranking information inconsistent with spectra')
        }

        let sourceCodeMethod = this._sourceCodeMethods.find(method => {
          if (
            method.name == methodName &&
            method.file == sourceCodeFile &&
            method.parameters.toString() == methodParameters.toString()
          ) {
            return true
          }
          return false
        })

        if (!sourceCodeMethod) {
          throw new Error('Ranking information inconsistent with spectra')
        }

        let sourceCodeLine = this._sourceCodeLines.find(line => {
          if (
            line.method == sourceCodeMethod &&
            line.lineNumber == lineIdentifiedOnSpectra
          ) {
            return true
          }
          return false
        })

        if (!sourceCodeLine) {
          throw new Error('Ranking information inconsistent with spectra')
        } else {
          let suspiciousnessMetric = sourceCodeLine.suspiciousnessMetrics.find(
            suspiciousnessMetric => {
              if (suspiciousnessMetric.algorithm == ranking) {
                return true
              }
              return false
            }
          )

          if (suspiciousnessMetric) {
            throw new Error(
              `Ranking file '${rankingFilePath}' contains duplicate information for suspiciousness metric '${ranking}'`
            )
          }

          sourceCodeLine.suspiciousnessMetrics.push({
            algorithm: ranking,
            suspiciousnessValue: suspiciousnessValue
          })
        }
      })
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing ranking file '${rankingFilePath}': ${
          (error as any)?.message ?? error
        }`
      )
    }
  }

  private async parseMatrix(
    buildPath: string,
    matrixFilePath?: string
  ): Promise<testCase[]> {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (this._testCases.length == 0) {
      throw new Error('testCases must be parsed first to parse matrix')
    }

    if (
      this._sourceCodeLines.length == 0 ||
      this._sourceCodeMethods.length == 0 ||
      this._sourceCodeFiles.length == 0
    ) {
      throw new Error('Matrix can only be parsed after spectra file is parsed')
    }

    if (matrixFilePath) {
      matrixFilePath = path.join(stateHelper.rootDirectory, matrixFilePath)
      if (!fs.fileExists(matrixFilePath!)) {
        throw new Error(`matrix file '${matrixFilePath}' does not exist`)
      }
    } else {
      matrixFilePath = fs.searchFile(buildPath, 'matrix.txt')

      if (!matrixFilePath) {
        throw new Error(`matrix file '${matrixFilePath}' does not exist`)
      }
    }

    const lines = await fs.readFileAndGetLines(matrixFilePath!)

    if (lines.length != this._testCases.length) {
      throw new Error(`matrix file '${matrixFilePath}' is invalid`)
    }

    try {
      lines.forEach((line, rowIndex) => {
        const parts = line.split(' ')

        if (parts.length - 1 != this._sourceCodeLines.length) {
          throw new Error(`matrix file '${matrixFilePath}' is invalid`)
        }
        //TODO check if it follows the testCase and Spectra Order

        parts.forEach((testLineCoverage, columnIndex) => {
          switch (testLineCoverage) {
            case '0':
              this._testCases[rowIndex].coverage.push({
                line: this._sourceCodeLines[columnIndex],
                covered: false
              })
              break
            case '1':
              this._testCases[rowIndex].coverage.push({
                line: this._sourceCodeLines[columnIndex],
                covered: true
              })
              break
            case '+':
              if (!this._testCases[rowIndex].passed)
                throw new Error(
                  `matrix file '${matrixFilePath}' is inconsistent with test results file`
                )
              break
            case '-':
              if (this._testCases[rowIndex].passed)
                throw new Error(
                  `matrix file '${matrixFilePath}' is inconsistent with test results file`
                )

              break
            default:
              throw new Error(`matrix file '${matrixFilePath}' is invalid`)
          }
        })
      })
      return this._testCases
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing matrix file '${matrixFilePath}': ${
          (error as any)?.message ?? error
        }`
      )
    }
  }

  private async parseStatistics(
    buildPath: string,
    statisticsFilePath?: string
  ): Promise<statistic[]> {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    let lines = []

    if (statisticsFilePath) {
      statisticsFilePath = path.join(
        stateHelper.rootDirectory,
        statisticsFilePath
      )
      if (!fs.fileExists(statisticsFilePath!)) {
        throw new Error(
          `Statistics file '${statisticsFilePath}' does not exist`
        )
      }

      lines = await fs.readFileAndGetLines(statisticsFilePath!)
    } else {
      statisticsFilePath = fs.searchFile(buildPath, 'statistics.csv')

      if (!statisticsFilePath) {
        throw new Error(
          `Statistics file '${statisticsFilePath}' does not exist`
        )
      }

      lines = await fs.readFileAndGetLines(statisticsFilePath)
    }

    let statistics: statistic[] = []
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'formula,metric_name,metric_value') {
          // next line
          return
        }
        const parts = line.split(',')

        if (parts.length < 3) {
          throw new Error(`Statistics file '${statisticsFilePath}' is invalid`)
        }

        const statistic: statistic = {
          formula: parts[0],
          metric_name: parts[1],
          metric_value: parseFloat(parts[2])
        }

        statistics.push(statistic)
      })
      this._statistics = statistics
      return statistics
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing statistics file '${statisticsFilePath}': ${
          (error as any)?.message ?? error
        }`
      )
    }
  }
}
