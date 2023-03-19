import * as core from '@actions/core'

import * as stateHelper from './stateHelper'
import FileParser from './fileParser'
import * as inputHelper from './inputHelper'
import * as githubActionsHelper from './githubActionsHelper'

async function run(): Promise<void> {
  try {
    core.debug(`Parsing inputs...`)
    const inputs = await inputHelper.getInputs()

    const fileParser = new FileParser()

    core.info(`Parsing files...`)
    await fileParser.parse(
      inputs.buildPath,
      inputs.sflRanking,
      inputs.rankingFilesPaths,
      inputs.testCasesFilePath,
      inputs.spectraFilePath,
      inputs.matrixFilePath,
      inputs.statisticsFilePath
    )

    core.info(`Creating commit/PR threshold comment...`)
    await githubActionsHelper.createCommitPRCommentLineSuspiciousnessThreshold(
      inputs.authToken,
      inputs.sflRanking,
      inputs.sflThreshold,
      fileParser.sourceCodeLines
    )

    if (inputs.uploadArtifacts) {
      core.info(`Uploading artifacts...`)
      await githubActionsHelper.uploadArtifacts(
        'GZoltar Results',
        fileParser.filePaths
      )
    }
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

if (!stateHelper.IsPost) {
  run()
}
