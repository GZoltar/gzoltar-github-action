import * as core from '@actions/core'
import {IInputs} from './types/inputs'

export function getInputs(): IInputs {
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

  // Ranking Files Paths
  let rankingFilesPaths: string[] | undefined = undefined
  try {
    const rankingFilesPathsString: string = core.getInput('ranking-files-paths')

    if (rankingFilesPathsString !== '') {
      rankingFilesPaths = rankingFilesPathsString
        .replace(/\[|\]/g, '')
        .replace(/\s+/g, '')
        .split(',')
    }
  } catch (error) {
    throw new Error(
      'Invalid form of input `ranking-files-paths`. It should be a comma separated list of strings.'
    )
  }

  // Ranking Files Paths
  let rankingHTMLDirectoriesPaths: string[] | undefined = undefined
  try {
    const rankingHTMLDirectoriesPathsString: string = core.getInput(
      'ranking-html-directories-paths'
    )

    if (rankingHTMLDirectoriesPathsString !== '') {
      rankingHTMLDirectoriesPaths = rankingHTMLDirectoriesPathsString
        .replace(/\[|\]/g, '')
        .replace(/\s+/g, '')
        .split(',')
    }
  } catch (error) {
    throw new Error(
      'Invalid form of input `ranking-html-directories-paths`. It should be a comma separated list of strings.'
    )
  }

  // SFL Ranking
  let sflRanking: string[] = []
  try {
    sflRanking = core
      .getInput('sfl-ranking', {required: true})
      .replace(/\[|\]/g, '')
      .replace(/\s+/g, '')
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
      .replace(/\[|\]/g, '')
      .replace(/\s+/g, '')
      .split(',')
      .map(value => parseFloat(value))
  } catch (error) {
    throw new Error(
      'Invalid form of input `sfl-threshold`. It should be a comma separated list of numbers.'
    )
  }

  if (sflRanking.length !== sflThreshold.length) {
    throw new Error(
      'The number of elements in `sfl-ranking` and `sfl-threshold` should be the same.'
    )
  }

  if (rankingFilesPaths && sflRanking.length !== rankingFilesPaths.length) {
    throw new Error(
      'The number of elements in `sfl-ranking` and `ranking-files-paths` should be the same.'
    )
  }

  if (
    rankingHTMLDirectoriesPaths &&
    sflRanking.length !== rankingHTMLDirectoriesPaths.length
  ) {
    throw new Error(
      'The number of elements in `sfl-ranking` and `ranking-html-directories-paths` should be the same.'
    )
  }

  // SFL Ranking Order
  const sflRankingOrder: string = core.getInput('sfl-ranking-order')

  if (sflRanking.indexOf(sflRankingOrder)) {
    throw new Error(
      'The value of `sfl-ranking-order` should be one of the elements in `sfl-ranking`.'
    )
  }

  // Diff Comments in Code Block
  const diffCommentsInCodeBlock: boolean =
    core.getInput('diff-comments-code-block') === 'true'

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
    rankingFilesPaths: rankingFilesPaths,
    rankingHTMLDirectoriesPaths: rankingHTMLDirectoriesPaths,
    sflRanking: sflRanking,
    sflThreshold: sflThreshold,
    sflRankingOrder: sflRankingOrder,
    diffCommentsInCodeBlock: diffCommentsInCodeBlock,
    uploadArtifacts: uploadArtifacts
  }
}
