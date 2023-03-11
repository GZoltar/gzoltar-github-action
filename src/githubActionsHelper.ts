import * as github from '@actions/github'

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
      // check if every line suspiciousnessMetrics always contains the same length of algorithms. If yes, I could just use the index
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
            }/blob/${stateHelper.currentSha}/${line.method.file.path}#L${
              line.lineNumber
            }  | ${
              line.suspiciousnessMetrics.find(
                obj => obj.algorithm === algorithm
              )!.suspiciousnessValue
            }\n`
          } else {
            body += `|${line.method.file.name}${line.method.name}#L${
              line.lineNumber
            }  | ${
              line.suspiciousnessMetrics.find(
                obj => obj.algorithm === algorithm
              )!.suspiciousnessValue
            }`
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
