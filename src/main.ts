import * as core from '@actions/core'

import * as stateHelper from './state-helper'
import FileParser from './file-parser'

async function run(): Promise<void> {
  try {
    const fileParser = new FileParser()
    await fileParser.parse(
      '/Users/paiva/Documents/Tese/gzoltar-feedback-action/build',
      ['ochiai']
    )
    console.log(fileParser.sourceCodeFiles)
    console.log(fileParser.sourceCodeMethods)
    console.log(fileParser.sourceCodeLines)
    console.log(fileParser.statistics)
    console.log(fileParser.testCases)
    core.info(`Current SHA: ${stateHelper.currentSha}`)
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

if (!stateHelper.IsPost) {
  run()
}
