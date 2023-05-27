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
function getCurrentCommitSha(): string {
  return 'sha'
  if (github.context.eventName == 'pull_request') {
    return github.context.payload.pull_request?.head.sha
  } else {
    return github.context.sha
  }
}

/**
 * It returns the SHA of the previous commit, or the SHA of the base of the pull request if the current
 * event is a pull request
 * @returns The previous sha of the pull request or the previous sha of the commit.
 * @throws Error if the event is not a pull request and the previous sha is not defined.
 */
function getBaseCommitSha(): string | undefined {
  return 'sha'
  if (github.context.eventName == 'pull_request') {
    return github.context.payload.pull_request?.base.sha
  } else if (github.context.eventName == 'push') {
    return github.context.payload.before
  } else {
    throw new Error(
      `This action only supports pull requests and pushes. ${github.context.eventName} events are not supported.`
    )
  }
}

export const baseCommitSha = getBaseCommitSha()

export const currentCommitSha = getCurrentCommitSha()

export const isInPullRequest = false

export const isInPush = true

// Issues and PRs are the same for the GitHub API
export const pullRequestNumber = 1

export const currentSha = 'sha'

/**
 * It returns the root directory of the repository
 * @returns The root directory of the repository.
 */
function getRootDirectory(): string {
  const rootDirectory = '/Users/paiva/Documents/Tese/fastjson'
  if (rootDirectory == undefined) {
    throw new Error('GITHUB_WORKSPACE is not defined')
  }
  return rootDirectory
}

export const rootDirectory = getRootDirectory()

export const repoOwner = 'hugofpaiva'

export const repoName = 'repo-example'
