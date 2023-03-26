import * as github from '@actions/github'
import * as artifact from '@actions/artifact'
import * as core from '@actions/core'

import * as stateHelper from './stateHelper'
import {ISourceCodeLine} from './types/sourceCodeLine'

export async function createCommitPRCommentLineSuspiciousnessThreshold(
  authToken: string,
  sflRanking: string[],
  sflThreshold: number[],
  parsedLines: ISourceCodeLine[]
) {
  try {
    let body = ''
    sflRanking.forEach((algorithm, index) => {
      // TODO check if every line suspiciousnessMetrics always contains the same length of algorithms. If yes, I could just use the index
      const lines = parsedLines
        .filter(line =>
          line.suspiciousnessMetrics.some(
            suspiciousnessMetric =>
              suspiciousnessMetric.algorithm === algorithm &&
              suspiciousnessMetric.suspiciousnessValue >= sflThreshold[index]
          )
        )
        .sort(
          (a, b) =>
            b.suspiciousnessMetrics.find(obj => obj.algorithm === algorithm)!
              .suspiciousnessValue -
            a.suspiciousnessMetrics.find(obj => obj.algorithm === algorithm)!
              .suspiciousnessValue
        )
      if (lines.length > 0) {
        body += `## ${
          algorithm.charAt(0).toUpperCase() + algorithm.slice(1)
        } suspicious lines\n`
        body += '|Line | Suspiciousness|\n'
        body += '|---|:---:|\n'
        lines.forEach(line => {
          if (line.method.file.path != undefined) {
            body += `|https://github.com/${stateHelper.repoOwner}/${
              stateHelper.repoName
            }/blob/${stateHelper.currentCommitSha}${line.method.file.path}#L${
              line.lineNumber
            }  | ${line.suspiciousnessMetrics
              .find(obj => obj.algorithm === algorithm)!
              .suspiciousnessValue.toFixed(2)}|\n`
          } else {
            body += `|${line.method.file.name}$${line.method.name}#L${
              line.lineNumber
            }  | ${line.suspiciousnessMetrics
              .find(obj => obj.algorithm === algorithm)!
              .suspiciousnessValue.toFixed(2)}|\n`
          }
        })

        body += '\n\n'
      }
    })

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
  const octokit = getOctokit(authToken)
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
