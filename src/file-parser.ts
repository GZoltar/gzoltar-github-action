import { sourceCodeFile } from './types/sourceCodeFile'
import { sourceCodeLine } from './types/sourceCodeLine'
import { sourceCodeMethod } from './types/sourceCodeMethod'
import { statistic } from './types/statistic'
import { testCase } from './types/testCase'

import * as stateHelper from './state-helper'
import * as fs from './fs-helper'
const path = require('path')

export class FileParser {
  private sourceCodeFiles: sourceCodeFile[] = []
  private sourceCodeMethods: sourceCodeMethod[] = []
  private sourceCodeLines: sourceCodeLine[] = []
  private testCases: testCase[] = []
  private statistics: statistic[] = []

  constructor(buildPath: string) {
    this.parseTestCases(buildPath)
    this.parseStatistics(buildPath)
    //TODO need to parse GZoltar spectra.csv or ochiai.ranking.csv
    this.parseMatrix(buildPath)

  }

  private parseTestCases(
    buildPath: string,
    testCasesFilePath?: string
  ): testCase[] {
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

    const lines = fs.readFile(testCasesFilePath!)

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
          stacktrace: parts[1] == 'PASS' ? undefined : parts[3]
        }

        testCases.push(testCase)
      })
      this.testCases = testCases
      return testCases
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing TestCases file '${testCasesFilePath}': ${(error as any)?.message ?? error
        }`
      )
    }
  }

  private parseSpectra(buildPath: string, spectraFilePath?: string) {
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

    const lines = fs.readFile(spectraFilePath!)

    //TODO parse and create sourceCode objects if they don't exist
  }

  private parseRanking(buildPath: string, ranking: string, rankingFilePath?: string) {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (!ranking) {
      throw new Error("Arg 'ranking' must not be empty")
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

    const lines = fs.readFile(rankingFilePath!)

    //TODO parse and create sourceCode objects if they don't exist

  }

  private parseMatrix(buildPath: string, matrixFilePath?: string): testCase[] {
    if (!buildPath) {
      throw new Error("Arg 'buildPath' must not be empty")
    }

    if (this.testCases.length == 0) {
      throw new Error('testCases must be parsed first to parse matrix')
    }

    if (this.sourceCodeLines.length == 0 || this.sourceCodeMethods.length == 0 || this.sourceCodeFiles.length == 0) {
      throw new Error("Matrix can only be parsed after spectra or ranking files are parsed")
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

    const lines = fs.readFile(matrixFilePath!)

    let testCaseIndex = 0

    try {
      lines.forEach(line => {
        const parts = line.split(' ')

        if (parts.length - 1 != this.testCases.length) {
          throw new Error(`matrix file '${matrixFilePath}' is invalid`)
        }

        //TODO continue searching on the created sourceCodeLines by the correspondent to give coverage to it. If not found, throw error
        this.testCases[testCaseIndex].coverage = []

      })
      return this.testCases;
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing matrix file '${matrixFilePath}': ${(error as any)?.message ?? error
        }`
      )
    }
  }

  private parseStatistics(
    buildPath: string,
    statisticsFilePath?: string
  ): statistic[] {
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

      lines = fs.readFile(statisticsFilePath!)
    } else {
      statisticsFilePath = fs.searchFile(buildPath, 'statistics.csv')

      if (!statisticsFilePath) {
        throw new Error(
          `Statistics file '${statisticsFilePath}' does not exist`
        )
      }

      lines = fs.readFile(statisticsFilePath)
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
      this.statistics = statistics
      return statistics
    } catch (error) {
      throw new Error(
        `Encountered an error when parsing statistics file '${statisticsFilePath}': ${(error as any)?.message ?? error
        }`
      )
    }
  }
}
