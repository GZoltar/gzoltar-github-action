import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import {IInputs} from './types/inputs'

export async function getInputs(): Promise<IInputs> {
  // Auth token
  const authToken: string = core.getInput('token', {required: true})

  // Build Path
  const buildPath: string = core.getInput('build-path', {required: true})

  // Serialized Coverage File Path
  const serializedCoverageFilePath: string = core.getInput(
    'serialized-coverage-file-path'
  )

  // Test Cases File Path
  const testCasesFilePath: string = core.getInput('test-cases-file-path')

  // Spectra File Path
  const spectraFilePath: string = core.getInput('spectra-file-path')

  // Matrix File Path
  const matrixFilePath: string = core.getInput('matrix-file-path')

  // Statistics File Path
  const statisticsFilePath: string = core.getInput('statistics-file-path')

  // SFL Ranking
  let sflRanking: string[] = []
  try {
    sflRanking = core
      .getInput('sfl-ranking', {required: true})
      .replace(/[|]/g, '')
      .split(',')
  } catch (error) {
    throw new Error(
      'Invalid form of input `sfl-ranking`. It should be a comma separated list of strings.'
    )
  }

  // SFL Threshold
  let sflThreshold: number[] = []
  try {
    sflThreshold = core
      .getInput('sfl-threshold', {required: true})
      .replace(/[|]/g, '')
      .split(',')
      .map(value => parseInt(value))
  } catch (error) {
    throw new Error(
      'Invalid form of input `sfl-threshold`. It should be a comma separated list of numbers.'
    )
  }

  // Upload Artifacts
  const uploadArtifacts: boolean = core.getInput('upload-artifacts') === 'true'

  return {
    authToken: authToken,
    buildPath: buildPath,
    serializedCoverageFilePath:
      serializedCoverageFilePath === ''
        ? undefined
        : serializedCoverageFilePath,
    testCasesFilePath: testCasesFilePath === '' ? undefined : testCasesFilePath,
    spectraFilePath: spectraFilePath === '' ? undefined : spectraFilePath,
    matrixFilePath: matrixFilePath === '' ? undefined : matrixFilePath,
    statisticsFilePath:
      statisticsFilePath === '' ? undefined : statisticsFilePath,
    sflRanking: sflRanking,
    sflThreshold: sflThreshold,
    uploadArtifacts: uploadArtifacts
  }
}
