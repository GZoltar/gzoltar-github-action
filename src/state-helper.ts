import * as github from '@actions/github'


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

export const currentSha = getCurrentSha();

