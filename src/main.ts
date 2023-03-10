import * as core from '@actions/core'

import * as stateHelper from './state-helper'
import FileParser from './file-parser'
import * as inputHelper from './input-helper'

async function run(): Promise<void> {
  try {
    core.debug(`Parsing inputs...`);
    const inputs = await inputHelper.getInputs()
    const fileParser = new FileParser()

    core.debug(`Parsing files...`);
    await fileParser.parse(
      inputs.buildPath,
      inputs.sflRanking,
      inputs.testCasesFilePath,
      inputs.spectraFilePath,
      inputs.matrixFilePath,
      inputs.statisticsFilePath
    )


    core.info(`Current SHA: ${stateHelper.currentSha}`)
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

if (!stateHelper.IsPost) {
  run()
}
