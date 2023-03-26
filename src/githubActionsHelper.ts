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
      body += "✅ **GZoltar didn't find any bug in your code** 🙌"
    } else {
      body +=
        '<details>\n<summary>Line Suspiciousness by Algorithm</summary>\n\n'
      body += getStringTableLineSuspiciousness(
        lines,
        sflRanking,
        sflRankingOrder
      )
      body += '</details>\n'

      body +=
        '<details>\n<summary>Lines Code Block Suspiciousness by Algorithm</summary>\n\n'
      body += getStringTableLineSuspiciousnessWithCodeBlock(
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

function getStringTableLineSuspiciousnessWithCodeBlock(
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

  const linesByMethod: ISourceCodeLine[][] = []
  const linesNextToEachOther: ISourceCodeLine[][] = []
  const lineSeparationThreshold = 5

  // group lines by method
  const uniqueMethods = [...new Set(lines.map(line => line.method))]
  uniqueMethods.forEach(method => {
    linesByMethod.push(lines.filter(line => line.method === method))
  })

  // group lines that are next to each other
  linesByMethod.forEach(linesOfMethod => {
    linesOfMethod.sort((a, b) => a.lineNumber - b.lineNumber)
    let currentLinesNextToEachOther: ISourceCodeLine[] = []
    linesOfMethod.forEach(line => {
      if (
        currentLinesNextToEachOther.length === 0 ||
        line.lineNumber -
          currentLinesNextToEachOther[currentLinesNextToEachOther.length - 1]
            .lineNumber <=
          lineSeparationThreshold
      ) {
        currentLinesNextToEachOther.push(line)
      } else {
        linesNextToEachOther.push(currentLinesNextToEachOther)
        currentLinesNextToEachOther = [line]
      }
    })
    if (currentLinesNextToEachOther.length > 0) {
      linesNextToEachOther.push(currentLinesNextToEachOther)
    }
  })

  // sort grouped lines by max suspiciousness based on sflRankingOrder
  linesNextToEachOther.sort((a, b) => {
    const maxA = a
      .map(line => {
        const suspiciousnessValue = line.suspiciousnessMetrics.find(
          obj => obj.algorithm === sflRankingOrder
        )?.suspiciousnessValue

        if (suspiciousnessValue === undefined) {
          return 0
        }

        return suspiciousnessValue
      })
      .reduce((a, b) => Math.max(a, b))
    const maxB = b
      .map(line => {
        const suspiciousnessValue = line.suspiciousnessMetrics.find(
          obj => obj.algorithm === sflRankingOrder
        )?.suspiciousnessValue

        if (suspiciousnessValue === undefined) {
          return 0
        }

        return suspiciousnessValue
      })
      .reduce((a, b) => Math.max(a, b))
    return maxB - maxA
  })

  if (linesNextToEachOther.length > 0) {
    // Add a header for the table
    bodyToReturn += `## Lines Code Block Suspiciousness by Algorithm\n`

    // Add a row for the algorithm names
    bodyToReturn += `|Line | ⬇ ${sflRanking.join(' | ')}\n`

    // Add a separator row for the table
    bodyToReturn += '|---|'
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += ':---:|'
    }
    bodyToReturn += '\n'

    // Iterate over each group of lines
    linesNextToEachOther.forEach(lines => {
      const lineLocation =
        (lines[0].method.file.path
          ? `https://github.com/${stateHelper.repoOwner}/${stateHelper.repoName}/blob/${stateHelper.currentCommitSha}${lines[0].method.file.path}`
          : `${lines[0].method.file.name}$${lines[0].method.name}`) +
        `#L${lines[0].lineNumber}${
          lines.length > 1 ? `-L${lines[lines.length - 1].lineNumber}` : ''
        }`

      // Get the suspiciousness values for each algorithm and line in the group
      const suspiciousnesses: string[] = sflRanking
        .map(algorithm => {
          return lines.map(line => {
            return line.suspiciousnessMetrics
              .find(obj => obj.algorithm === algorithm)
              ?.suspiciousnessValue.toFixed(2)
          })
        }) // Convert the suspiciousness values to a string
        .map(suspiciousnesses => {
          let suspiciousnessesString = ''
          suspiciousnesses.forEach((suspiciousness, index) => {
            if (index != 0) {
              suspiciousnessesString += '<br>'
            }
            if (suspiciousness === undefined) {
              suspiciousnessesString += '---'
            }
            suspiciousnessesString += suspiciousness
          })
          return suspiciousnessesString
        })

      // Add a row for the group of lines and their suspiciousness values
      bodyToReturn += `|${lineLocation}| ${suspiciousnesses.join(' | ')}\n`
    })
  }

  return bodyToReturn
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
    // Add a header for the table
    bodyToReturn += `## Line Suspiciousness by Algorithm\n`

    // Add a row for the algorithm names
    bodyToReturn += `|Line | ⬇ ${sflRanking.join(' | ')}\n`

    // Add a separator row for the table
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
        let suspiciousness = line.suspiciousnessMetrics
          .find(obj => obj.algorithm === algorithm)
          ?.suspiciousnessValue.toFixed(2)

        if (suspiciousness == undefined) {
          suspiciousness = '---'
        }
        return suspiciousness
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
