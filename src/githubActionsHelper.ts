import * as github from '@actions/github'
import * as artifact from '@actions/artifact'
import * as core from '@actions/core'

import * as stateHelper from './stateHelper'
import {ISourceCodeLine} from './types/sourceCodeLine'

export async function createCommitPRCommentLineSuspiciousnessThreshold(
  authToken: string,
  sflRanking: string[],
  sflThreshold: number[],
  sflRankingOrder: string,
  parsedLines: ISourceCodeLine[]
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
      return (
        b.suspiciousnessMetrics.find(obj => obj.algorithm === sflRankingOrder)!
          .suspiciousnessValue -
        a.suspiciousnessMetrics.find(obj => obj.algorithm === sflRankingOrder)!
          .suspiciousnessValue
      )
    })

    body += '<details>\n<summary>Line Suspiciousness by Algorithm</summary>\n\n'
    body += getStringTableLineSuspiciousness(lines, sflRanking, sflRankingOrder)
    body += '</details>\n'

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

function getStringTableLineSuspiciousness(
  lines: ISourceCodeLine[],
  sflRanking: string[],
  sflRankingOrder: string
): string {
  let bodyToReturn = ''

  sflRanking.sort((a, b) => {
    if (a === sflRankingOrder) {
      return -1
    }
    if (b === sflRankingOrder) {
      return 1
    }
    return 0
  })

  if (lines.length > 0) {
    bodyToReturn += `## Line Suspiciousness by Algorithm\n`
    bodyToReturn += `|Line | ${sflRanking.join(' | ')}\n`
    bodyToReturn += '|---|'
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += ':---:|'
    }
    bodyToReturn += '\n'
    lines.forEach(line => {
      const lineLocation =
        line.method.file.path != undefined
          ? `https://github.com/${stateHelper.repoOwner}/${stateHelper.repoName}/blob/${stateHelper.currentCommitSha}${line.method.file.path}#L${line.lineNumber} `
          : `${line.method.file.name}$${line.method.name}#L${line.lineNumber}`

      const suspiciousnesses: string[] = sflRanking.map(algorithm => {
        return line.suspiciousnessMetrics
          .find(obj => obj.algorithm === algorithm)!
          .suspiciousnessValue.toFixed(2)
      })

      bodyToReturn += `|${lineLocation}| ${suspiciousnesses.join(' | ')}\n`
    })
  }
  return bodyToReturn
}

async function createCommitPRComment(
  authToken: string,
  inputs: {body: string; path?: string; position?: number; line?: number}
) {
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
