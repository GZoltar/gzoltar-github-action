import * as github from '@actions/github'
import * as core from '@actions/core'

/**
 * Indicates whether the POST action is running
 */
export const IsPost = !!core.getState('isPost')

/**
 * It returns the SHA of the current commit, or the SHA of the head of the pull request if the current
 * event is a pull request
 * @returns The current sha of the pull request or the current sha of the commit.
 */
function getCurrentSha(): string {
  if (github.context.eventName == 'pull_request') {
    return github.context.payload.pull_request?.head.sha
  } else {
    return github.context.sha
  }
}

export const currentSha = getCurrentSha()

/**
 * It returns the root directory of the repository
 * @returns The root directory of the repository.
 */
function getRootDirectory(): string {
  const rootDirectory = process.env.GITHUB_WORKSPACE
  if (rootDirectory == undefined) {
    throw new Error('GITHUB_WORKSPACE is not defined')
  }
  return rootDirectory
}

export const rootDirectory = getRootDirectory()

export const repoOwner = github.context.repo.owner

export const repoName = github.context.repo.repo
