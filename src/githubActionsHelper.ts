import * as github from '@actions/github'
import * as artifact from '@actions/artifact'
import * as core from '@actions/core'

import * as stateHelper from './stateHelper'
import * as dataProcessingHelper from './dataProcessingHelper'
import {ISourceCodeLine} from './types/sourceCodeLine'
import {ITestCase} from './types/testCase'

export async function createCommitPRCommentLineSuspiciousnessThreshold(
  authToken: string,
  sflRanking: string[],
  sflThreshold: number[],
  sflRankingOrder: string,
  parsedLines: ISourceCodeLine[],
  testCases: ITestCase[]
) {
  try {
    let body = ''
    const lines: ISourceCodeLine[] = []
    sflRanking.forEach((algorithm, index) => {
      parsedLines
        .filter(line =>
          line.suspiciousnessMetrics.some(
            suspiciousnessMetric =>
              suspiciousnessMetric.algorithm === algorithm &&
              suspiciousnessMetric.suspiciousnessValue >= sflThreshold[index]
          )
        )
        .forEach(line => {
          if (!lines.some(l => l.lineNumber === line.lineNumber)) {
            lines.push(line)
          }
        })
    })

    lines.sort((a, b) => {
      const aSuspiciousnessValue = a.suspiciousnessMetrics.find(
        obj => obj.algorithm === sflRankingOrder
      )?.suspiciousnessValue

      const bSuspiciousnessValue = b.suspiciousnessMetrics.find(
        obj => obj.algorithm === sflRankingOrder
      )?.suspiciousnessValue

      if (
        aSuspiciousnessValue === undefined ||
        bSuspiciousnessValue === undefined
      ) {
        return 0
      }

      return bSuspiciousnessValue - aSuspiciousnessValue
    })

    if (lines.length === 0) {
      body += "✅ **GZoltar didn't find any possible bug in your code** 🙌"
    } else {
      body += '⚠️ **GZoltar found possible bugs** ⚠️'

      body +=
        '<details>\n<summary>Line Suspiciousness by Algorithm</summary>\n\n'
      body += dataProcessingHelper.getStringTableLineSuspiciousness(
        lines,
        sflRanking,
        sflRankingOrder,
        testCases
      )
      body += '</details>\n'

      body +=
        '<details>\n<summary>Lines Code Block Suspiciousness by Algorithm</summary>\n\n'
      body +=
        dataProcessingHelper.getStringTableLineSuspiciousnessWithCodeBlock(
          lines,
          sflRanking,
          sflRankingOrder
        )
      body += '</details>\n'
    }

    body += '\n\n'

    await createCommitPRComment(authToken, {body})
  } catch (error) {
    throw new Error(
      `Encountered an error when creating Commit/PR comment based on threshold of algorithms: ${
        (error as any)?.message ?? error
      }`
    )
  }
}

async function createCommitPRComment(
  authToken: string,
  inputs: {body: string; path?: string; position?: number; line?: number}
) {
  try {
    const octokit = getOctokit(authToken)
    if (stateHelper.isInPullRequest) {
      // Issues and PRs are the same for the GitHub API
      await octokit.rest.issues.createComment({
        owner: stateHelper.repoOwner,
        repo: stateHelper.repoName,
        issue_number: stateHelper.pullRequestNumber,
        body: inputs.body
      })
    } else {
      await octokit.rest.repos.createCommitComment({
        owner: stateHelper.repoOwner,
        repo: stateHelper.repoName,
        commit_sha: stateHelper.currentSha,
        body: inputs.body,
        path: inputs.path,
        position: inputs.position,
        line: inputs.line
      })
    }
  } catch (error) {
    throw new Error(
      `Encountered an error when creating Commit/PR comment: ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export async function getDiff(authToken: string) {
  try {
    const octokit = getOctokit(authToken)

    const response = await octokit.rest.repos.compareCommits({
      owner: stateHelper.repoOwner,
      repo: stateHelper.repoName,
      base: stateHelper.baseCommitSha!,
      head: stateHelper.currentCommitSha
    })

    // Making sure the API call was successful
    if (response.status !== 200) {
      throw new Error(
        `The request needed to get the diff between the base and head commits for this event returned ${response.status} when it is expected 200.`
      )
    }

    // Making sure head commit is ahead of the base commit
    if (response.data.status !== 'ahead') {
      throw new Error(`The head commit is not ahead of the base commit.`)
    }

    const statusConsidered = [
      'added',
      'modified',
      'renamed',
      'copied',
      'changed',
      'unchanged'
    ]

    const files =
      response.data.files?.filter(file => {
        return statusConsidered.includes(file.status)
      }) ?? []

    const filesOnDiff: {
      path: string
      changedLines: {startLine: number; endLine: number}[]
    }[] = []

    files.forEach(file => {
      const changedLines: {startLine: number; endLine: number}[] = []

      if (file.patch) {
        let nextIndex = 0
        let firstIndex = 0
        while (nextIndex !== -1 && firstIndex !== -1) {
          firstIndex = file.patch.indexOf(
            '@@',
            nextIndex == 0 ? nextIndex : nextIndex + 1
          )
          if (firstIndex !== -1) {
            nextIndex = file.patch.indexOf('@@', firstIndex + 1)
            if (nextIndex !== -1) {
              const line = file.patch.substring(firstIndex, nextIndex)
              const lineSplitted = line.split(' ')
              const lineSplitted2 = lineSplitted[1].split(',')
              const startLine = parseInt(lineSplitted2[0].substring(1))
              const sizeOfBlock = parseInt(lineSplitted2[1])
              changedLines.push({
                startLine: startLine,
                endLine: startLine + sizeOfBlock - 1
              })
            }
          }
        }
      }

      filesOnDiff.push({path: file.filename, changedLines: changedLines})
    })

    console.log(filesOnDiff)
  } catch (error) {
    throw new Error(
      `Encountered an error when getting diff: ${
        (error as any)?.message ?? error
      }`
    )
  }
}

function getOctokit(authToken: string) {
  return github.getOctokit(authToken)
}

export async function uploadArtifacts(
  artifactName: string,
  filesPaths: string[]
) {
  try {
    const artifactClient = artifact.create()

    const rootDirectory = stateHelper.rootDirectory

    const options: artifact.UploadOptions = {
      continueOnError: true
    }

    const uploadResult: artifact.UploadResponse =
      await artifactClient.uploadArtifact(
        artifactName,
        filesPaths,
        rootDirectory,
        options
      )

    if (uploadResult.failedItems.length > 0) {
      core.error(`Failed to upload some artifacts: ${uploadResult.failedItems}`)
    }
  } catch (error) {
    throw new Error(
      `Encountered an error when uploading artifacts: ${
        (error as any)?.message ?? error
      }`
    )
  }
}
