import * as core from '@actions/core'

import * as stateHelper from './state-helper'

async function run(): Promise<void> {
  try {
    core.info(`Current SHA: ${stateHelper.currentSha}`)
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

// Main
run()
