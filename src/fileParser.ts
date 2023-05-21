import * as core from '@actions/core'

import {ISourceCodeFile} from './types/sourceCodeFile'
import {ISourceCodeLine} from './types/sourceCodeLine'
import {ISourceCodeMethod} from './types/sourceCodeMethod'
import {IStatistic} from './types/statistic'
import {ITestCase} from './types/testCase'

import * as stateHelper from './stateHelper'
import * as fs from './fsHelper'
import path from 'path'

export default class FileParser {
  private _sourceCodeFiles: ISourceCodeFile[] = []
  private _sourceCodeMethods: ISourceCodeMethod[] = []
  private _sourceCodeLines: ISourceCodeLine[] = []
  private _testCases: ITestCase[] = []
  private _statistics: IStatistic[] = []
  private _filesPaths: string[] = []
  private _htmlDirectoriesPaths: string[] = []

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  public async parse(
    buildPath: string,
    sflRanking: string[],
    rankingFilesPaths?: string[],
    rankingHTMLDirectoriesPaths?: string[],
    testCasesFilePath?: string,
    spectraFilePath?: string,
    matrixFilePath?: string,
    statisticsFilePath?: string,
    serializedCoverageFilePath?: string
  ) {
    buildPath = path.join(stateHelper.rootDirectory, buildPath)

    if (rankingFilesPaths) {
      rankingFilesPaths = rankingFilesPaths.map(rankingFilePath => {
        return path.join(stateHelper.rootDirectory, rankingFilePath)
      })
    }

    if (rankingHTMLDirectoriesPaths) {
      rankingHTMLDirectoriesPaths = rankingHTMLDirectoriesPaths.map(
        rankingHTMLDirectoryPath => {
          return path.join(stateHelper.rootDirectory, rankingHTMLDirectoryPath)
        }
      )
    }

    if (testCasesFilePath) {
      testCasesFilePath = path.join(
        stateHelper.rootDirectory,
        testCasesFilePath
      )
    }

    if (spectraFilePath) {
      spectraFilePath = path.join(stateHelper.rootDirectory, spectraFilePath)
    }

    if (matrixFilePath) {
      matrixFilePath = path.join(stateHelper.rootDirectory, matrixFilePath)
    }

    if (statisticsFilePath) {
      statisticsFilePath = path.join(
        stateHelper.rootDirectory,
        statisticsFilePath
      )
    }

    await this.parseTestCases(buildPath, testCasesFilePath)
    await this.parseSpectra(buildPath, spectraFilePath)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    sflRanking.forEach(async (ranking, index) => {
      let rankingFilePath: string | undefined = undefined
      if (rankingFilesPaths) {
        rankingFilePath = rankingFilesPaths[index]
      }
      await this.parseRanking(buildPath, ranking, rankingFilePath)
    })
    await this.parseMatrix(buildPath, matrixFilePath)
    await this.parseStatistics(buildPath, statisticsFilePath)
    this.findSerializedCoverageFile(buildPath, serializedCoverageFilePath)
    this.findRankingHtmlDirectories(
      buildPath,
      sflRanking,
      rankingHTMLDirectoriesPaths
    )
  }

  public get sourceCodeFiles(): ISourceCodeFile[] {
    return this._sourceCodeFiles
  }

  public get sourceCodeMethods(): ISourceCodeMethod[] {
    return this._sourceCodeMethods
  }

  public get sourceCodeLines(): ISourceCodeLine[] {
    return this._sourceCodeLines
  }

  public get testCases(): ITestCase[] {
    return this._testCases
  }

  public get statistics(): IStatistic[] {
    return this._statistics
  }

  public get filePaths(): string[] {
    return this._filesPaths
  }

  public get htmlDirectoriesPaths(): string[] {
    return this._htmlDirectoriesPaths
  }

  private async parseTestCases(
    buildPath: string,
    testCasesFilePath?: string
  ): Promise<ITestCase[]> {
    core.info(`Parsing test cases...`)

    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (testCasesFilePath) {
      if (!fs.fileExists(testCasesFilePath)) {
        throw new Error(`TestCases file '${testCasesFilePath}' does not exist`)
      }
    } else {
      core.debug(`No testCasesFilePath found, starting search...`)
      testCasesFilePath = fs.searchFile(buildPath, 'tests.csv')

      if (!testCasesFilePath) {
        throw new Error(`TestCases file not found`)
      }
    }

    core.debug(`TestCases file found: '${testCasesFilePath}'`)
    this._filesPaths.push(testCasesFilePath)

    const lines = await fs.readFileAndGetLines(testCasesFilePath)

    const testCases: ITestCase[] = []
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name,outcome,runtime,stacktrace') {
          // next line
          return
        }
        const parts = line.split(',')

        if (parts.length < 3) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`TestCases file '${testCasesFilePath}' is invalid`)
        }

        const testCase: ITestCase = {
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
    core.info(`Parsing spectra...`)

    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (spectraFilePath) {
      if (!fs.fileExists(spectraFilePath)) {
        throw new Error(`spectra file '${spectraFilePath}' does not exist`)
      }
    } else {
      core.debug(`No spectraFilePath found, starting search...`)
      spectraFilePath = fs.searchFile(buildPath, 'spectra.csv')

      if (!spectraFilePath) {
        throw new Error(`Spectra file not found`)
      }
    }

    core.debug(`Spectra file found: '${spectraFilePath}'`)
    this._filesPaths.push(spectraFilePath)

    const lines = await fs.readFileAndGetLines(spectraFilePath)
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name') {
          // next line
          return
        }

        const parts = line.split(':')

        if (parts.length != 2) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
          let filePath = fs.searchFile(
            stateHelper.rootDirectory,
            `${className}.java`,
            true,
            packageName,
            buildPath
          )
          if (filePath) {
            filePath = filePath.substring(stateHelper.rootDirectory.length)
          }
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
    core.info(`Parsing ranking ${ranking}...`)

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
      if (!fs.fileExists(rankingFilePath)) {
        throw new Error(`ranking file '${rankingFilePath}' does not exist`)
      }
    } else {
      core.debug(
        `No rankingFilePath for ranking ${ranking} found, starting search...`
      )
      rankingFilePath = fs.searchFile(buildPath, `${ranking}.ranking.csv`)

      if (!rankingFilePath) {
        throw new Error(`Ranking file for ${ranking} not found`)
      }
    }

    core.debug(`Ranking file found: '${rankingFilePath}'`)
    this._filesPaths.push(rankingFilePath)

    const lines = await fs.readFileAndGetLines(rankingFilePath)

    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'name;suspiciousness_value') {
          // next line
          return
        }

        const parts = line.split(';')

        if (parts.length != 2) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

        methodParameters = methodParameters.map(parameter => {
          parameter.trim()
          return parameter
        })

        const packageName = classFile[0]
        const className = classFile[1]

        const sourceCodeFile = this._sourceCodeFiles.find(file => {
          if (file.name == className && file.packageName == packageName) {
            return true
          }
          return false
        })

        if (!sourceCodeFile) {
          throw new Error('Ranking information inconsistent with spectra')
        }

        const sourceCodeMethod = this._sourceCodeMethods.find(method => {
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

        const sourceCodeLine = this._sourceCodeLines.find(line => {
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
          const suspiciousnessMetric =
            sourceCodeLine.suspiciousnessMetrics.find(suspiciousnessMetric => {
              if (suspiciousnessMetric.algorithm == ranking) {
                return true
              }
              return false
            })

          if (suspiciousnessMetric) {
            throw new Error(
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
  ): Promise<ITestCase[]> {
    core.info(`Parsing matrix...`)
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
      if (!fs.fileExists(matrixFilePath)) {
        throw new Error(`matrix file '${matrixFilePath}' does not exist`)
      }
    } else {
      core.debug(`No matrixFilePath found, starting search...`)
      matrixFilePath = fs.searchFile(buildPath, 'matrix.txt')

      if (!matrixFilePath) {
        throw new Error(`Matrix file not found`)
      }
    }

    core.debug(`Matrix file found: '${matrixFilePath}'`)
    this._filesPaths.push(matrixFilePath)

    const lines = await fs.readFileAndGetLines(matrixFilePath)

    if (lines.length != this._testCases.length) {
      throw new Error(`matrix file '${matrixFilePath}' is invalid`)
    }

    try {
      lines.forEach((line, rowIndex) => {
        const parts = line.split(' ')

        if (parts.length - 1 != this._sourceCodeLines.length) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                  `Matrix file '${matrixFilePath}' is inconsistent with test results file`
                )
              break
            case '-':
              if (this._testCases[rowIndex].passed)
                throw new Error(
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                  `Matrix file '${matrixFilePath}' is inconsistent with test results file`
                )

              break
            default:
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              throw new Error(`Matrix file '${matrixFilePath}' is invalid`)
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
  ): Promise<IStatistic[]> {
    core.info(`Parsing statistics...`)
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (statisticsFilePath) {
      if (!fs.fileExists(statisticsFilePath)) {
        throw new Error(
          `Statistics file '${statisticsFilePath}' does not exist`
        )
      }
    } else {
      core.debug(`No statisticsFilePath found, starting search...`)
      statisticsFilePath = fs.searchFile(buildPath, 'statistics.csv')

      if (!statisticsFilePath) {
        throw new Error(`Statistics file not found`)
      }
    }

    core.debug(`Statistics file found: '${statisticsFilePath}'`)
    this._filesPaths.push(statisticsFilePath)

    const lines = await fs.readFileAndGetLines(statisticsFilePath)

    const statistics: IStatistic[] = []
    try {
      lines.forEach(line => {
        if (line.replace(/\s+/g, '') == 'formula,metric_name,metric_value') {
          // next line
          return
        }
        const parts = line.split(',')

        if (parts.length < 3) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Statistics file '${statisticsFilePath}' is invalid`)
        }

        const statistic: IStatistic = {
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

  private findRankingHtmlDirectories(
    buildPath: string,
    sflRanking: string[],
    rankingHtmlDirectories?: string[]
  ): string[] {
    core.info(`Finding Ranking HTML Directories...`)
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (rankingHtmlDirectories) {
      rankingHtmlDirectories.forEach(rankingHtmlDirectory => {
        if (!fs.directoryExists(rankingHtmlDirectory)) {
          core.error(
            `Ranking HTML Directory '${rankingHtmlDirectory}' does not exist`
          )
        }
      })
    } else {
      core.debug(`No rankingHtmlDirectories found, starting search...`)

      rankingHtmlDirectories = []

      sflRanking.forEach(ranking => {
        const rankingHtmlDirectory = fs.searchDirectory(
          buildPath,
          ranking,
          'html'
        )
        if (!rankingHtmlDirectory) {
          core.debug(`Ranking HTML Directory for ranking ${ranking} not found`)
        } else {
          core.debug(
            `Ranking HTML Directory for ranking ${ranking} found: '${rankingHtmlDirectory}'`
          )
          rankingHtmlDirectories?.push(rankingHtmlDirectory)
        }
      })
    }

    this._htmlDirectoriesPaths = rankingHtmlDirectories

    return rankingHtmlDirectories
  }

  private findSerializedCoverageFile(
    buildPath: string,
    serializedCoverageFilePath?: string
  ): string | null {
    core.info(`Finding Serialized Coverage File...`)
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (serializedCoverageFilePath) {
      if (!fs.fileExists(serializedCoverageFilePath)) {
        core.error(
          `Serialized Coverage file '${serializedCoverageFilePath}' does not exist`
        )
        return null
      }
    } else {
      core.debug(`No serializedCoverageFilePath found, starting search...`)
      serializedCoverageFilePath = fs.searchFile(buildPath, 'gzoltar.ser')

      if (!serializedCoverageFilePath) {
        core.error(`Serialized Coverage file not found`)
        return null
      }
    }

    core.debug(
      `Serialized Coverage file found: '${serializedCoverageFilePath}'`
    )
    this._filesPaths.push(serializedCoverageFilePath)

    return serializedCoverageFilePath
  }
}
