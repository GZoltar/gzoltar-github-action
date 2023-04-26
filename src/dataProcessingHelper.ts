import {ISourceCodeLine} from './types/sourceCodeLine'
import {ITestCase} from './types/testCase'
import * as stateHelper from './stateHelper'

export function groupLinesNextToEachOther(
  linesToBeGrouped: ISourceCodeLine[],
  lineSeparationThreshold?: number
): ISourceCodeLine[][] {
  const linesNextToEachOther: ISourceCodeLine[][] = []

  lineSeparationThreshold = lineSeparationThreshold || 5

  linesToBeGrouped.sort((a, b) => a.lineNumber - b.lineNumber)
  let currentLinesNextToEachOther: ISourceCodeLine[] = []
  linesToBeGrouped.forEach(line => {
    if (
      currentLinesNextToEachOther.length === 0 ||
      line.lineNumber -
        currentLinesNextToEachOther[currentLinesNextToEachOther.length - 1]
          .lineNumber <=
        lineSeparationThreshold!
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

  return linesNextToEachOther
}

export function sortedGroupedLinesBySflRankingOrder(
  groupedLines: ISourceCodeLine[][],
  sflRankingOrder: string
) {
  return groupedLines.sort((a, b) => {
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
}

export function getStringTableLineSuspiciousnessWithCodeBlockWithLinesNextToEachOther(
  linesNextToEachOther: ISourceCodeLine[],
  sflRanking: string[],
  standAloneTableWithoutLineLocation?: boolean
) {
  standAloneTableWithoutLineLocation =
    standAloneTableWithoutLineLocation || false

  let bodyToReturn = ''

  if (standAloneTableWithoutLineLocation) {
    // Add a row for the algorithm names
    bodyToReturn += `| ⬇ ${sflRanking.join(' | ')}|\n`

    // Add a separator row for the table
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += '|:---:'
    }
    bodyToReturn += '|\n'
  }

  const lineLocation =
    (linesNextToEachOther[0].method.file.path
      ? `https://github.com/${stateHelper.repoOwner}/${stateHelper.repoName}/blob/${stateHelper.currentCommitSha}${linesNextToEachOther[0].method.file.path}`
      : `${linesNextToEachOther[0].method.file.name}$${linesNextToEachOther[0].method.name}`) +
    `#L${linesNextToEachOther[0].lineNumber}${
      linesNextToEachOther.length > 1
        ? `-L${
            linesNextToEachOther[linesNextToEachOther.length - 1].lineNumber
          }`
        : ''
    }`

  // Get the suspiciousness values for each algorithm and line in the group
  const suspiciousnesses: string[] = sflRanking
    .map(algorithm => {
      return linesNextToEachOther.map((line, index) => {
        let suspiciousnessForThisLineAndAlgorithm = line.suspiciousnessMetrics
          .find(obj => obj.algorithm === algorithm)
          ?.suspiciousnessValue.toFixed(2)
        let returnSuspiciousnessForThisLineAndAlgorithm = ''
        if (
          index != 0 &&
          line.lineNumber > linesNextToEachOther[index - 1].lineNumber + 1
        ) {
          let previousLineNumber = linesNextToEachOther[index - 1].lineNumber
          while (previousLineNumber < line.lineNumber - 1) {
            returnSuspiciousnessForThisLineAndAlgorithm += `**L${
              previousLineNumber + 1
            } 𑗅** -------<br>`
            previousLineNumber++
          }
        }

        if (suspiciousnessForThisLineAndAlgorithm !== undefined) {
          returnSuspiciousnessForThisLineAndAlgorithm += `**L${
            line.lineNumber
          } 𑗅** ${getColoredSuspiciousness(
            suspiciousnessForThisLineAndAlgorithm
          )}`
        } else {
          returnSuspiciousnessForThisLineAndAlgorithm += `**L${line.lineNumber} 𑗅** -------`
        }

        return returnSuspiciousnessForThisLineAndAlgorithm
      })
    }) // Convert the suspiciousness values to a string
    .map(algorithmSuspiciousnessLineArray => {
      let suspiciousnessesStringForThisAlgorithm = ''

      algorithmSuspiciousnessLineArray.forEach(
        (algorithmSuspiciousnessForLine, index) => {
          if (!standAloneTableWithoutLineLocation) {
            if (index == 0) {
              suspiciousnessesStringForThisAlgorithm += '<br>'
            }

            suspiciousnessesStringForThisAlgorithm += '<br>'
          }

          if (algorithmSuspiciousnessForLine !== undefined) {
            suspiciousnessesStringForThisAlgorithm +=
              algorithmSuspiciousnessForLine
          }
        }
      )
      return suspiciousnessesStringForThisAlgorithm
    })

  // Add a row for the group of lines and their suspiciousness values
  bodyToReturn += `${
    standAloneTableWithoutLineLocation ? '' : '|' + lineLocation
  }| ${suspiciousnesses.join(' | ')}|\n`

  return bodyToReturn
}

export function getStringTableLineSuspiciousnessWithCodeBlockWithNormalLines(
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
  let linesNextToEachOther: ISourceCodeLine[][] = []

  // group lines by method
  const uniqueMethods = [...new Set(lines.map(line => line.method))]
  uniqueMethods.forEach(method => {
    linesByMethod.push(lines.filter(line => line.method === method))
  })

  // group lines that are next to each other
  linesByMethod.forEach(linesOfMethod => {
    linesNextToEachOther = [
      ...linesNextToEachOther,
      ...groupLinesNextToEachOther(linesOfMethod)
    ]
  })

  // sort grouped lines by max suspiciousness based on sflRankingOrder
  linesNextToEachOther = sortedGroupedLinesBySflRankingOrder(
    linesNextToEachOther,
    sflRankingOrder
  )

  if (linesNextToEachOther.length > 0) {
    // Add a header for the table
    bodyToReturn += `## Lines Code Block Suspiciousness by Algorithm\n`

    // Add a row for the algorithm names
    bodyToReturn += `|Line | ⬇ ${sflRanking.join(' | ')}|\n`

    // Add a separator row for the table
    bodyToReturn += '|---|'
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += ':---:|'
    }
    bodyToReturn += '\n'

    // Iterate over each group of lines
    linesNextToEachOther.forEach(lines => {
      bodyToReturn +=
        getStringTableLineSuspiciousnessWithCodeBlockWithLinesNextToEachOther(
          lines,
          sflRanking
        )
    })
  }
  return bodyToReturn
}

export function getStringTableLineSuspiciousnessForSingleLine(
  line: ISourceCodeLine,
  sflRanking: string[],
  testCases: ITestCase[],
  standAloneTableWithoutLineLocation?: boolean
) {
  standAloneTableWithoutLineLocation =
    standAloneTableWithoutLineLocation || false

  let bodyToReturn = ''

  const lineLocation =
    line.method.file.path != undefined
      ? `https://github.com/${stateHelper.repoOwner}/${stateHelper.repoName}/blob/${stateHelper.currentCommitSha}${line.method.file.path}#L${line.lineNumber} `
      : `${line.method.file.name}$${line.method.name}#L${line.lineNumber}`

  const lineCoveredTests = testCases
    .filter(testCase =>
      testCase.coverage.some(
        coverage => coverage.line === line && coverage.covered
      )
    ) // Sort the tests so that the ones that passed are last
    .sort((a, b) => {
      if (a.passed && !b.passed) {
        return 1
      }
      if (!a.passed && b.passed) {
        return -1
      }
      return 0
    })

  // Create a string with the tests that cover this line
  let lineCoveredTestsString = ''

  if (lineCoveredTests.length > 0) {
    lineCoveredTestsString =
      '<details><summary>Tests that cover this line</summary>'

    lineCoveredTestsString += `<table><thead><tr><th>Test Case</th><th>Result</th><th>Stacktrace</th></tr></thead><tbody>`

    lineCoveredTests.forEach(testCase => {
      lineCoveredTestsString += `<tr><td>${testCase.testName}</td><td>${
        testCase.passed ? '✅' : '❌'
      }</td><td>${
        testCase.stacktrace
          ? substringStacktraceOnlyOnSpaces(testCase.stacktrace, 75)
          : '---'
      }</td></tr>`
    })
    lineCoveredTestsString += '</tbody></table></details>'
  }

  // Get the suspiciousness values for each algorithm and line in the group
  const suspiciousnesses: string[] = sflRanking.map(algorithm => {
    let suspiciousness = line.suspiciousnessMetrics
      .find(obj => obj.algorithm === algorithm)
      ?.suspiciousnessValue.toFixed(2)

    if (suspiciousness == undefined) {
      suspiciousness = '---'
    }
    return getColoredSuspiciousness(suspiciousness)
  })

  if (standAloneTableWithoutLineLocation) {
    bodyToReturn += `|⬇ ${sflRanking.join(' | ')}|\n`
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += '|:---:|'
    }
    bodyToReturn += '\n'
  }

  // Add a row for the group of lines and their suspiciousness values
  bodyToReturn += `${
    !standAloneTableWithoutLineLocation
      ? '|' + lineLocation + lineCoveredTestsString
      : ''
  }| ${suspiciousnesses.join(' | ')}|\n`

  if (standAloneTableWithoutLineLocation) {
    bodyToReturn += '\n' + lineCoveredTestsString
  }

  return bodyToReturn
}

export function getStringTableLineSuspiciousness(
  lines: ISourceCodeLine[],
  sflRanking: string[],
  sflRankingOrder: string,
  testCases: ITestCase[]
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
    bodyToReturn += `|Line | ⬇ ${sflRanking.join(' | ')}|\n`

    // Add a separator row for the table
    bodyToReturn += '|---|'
    for (let i = 0; i < sflRanking.length; i++) {
      bodyToReturn += ':---:|'
    }
    bodyToReturn += '\n'

    // Iterate over each line
    lines.forEach(line => {
      bodyToReturn += getStringTableLineSuspiciousnessForSingleLine(
        line,
        sflRanking,
        testCases
      )
    })
  }
  return bodyToReturn
}

/**
 * Substring a stacktrace only on spaces
 * @param stacktrace The stacktrace to substring
 * @param maxLength The maximum length of each line the stacktrace
 * @returns The string containing multiple substringed lines of the stacktrace
 */
function substringStacktraceOnlyOnSpaces(
  stacktrace: string,
  maxLength: number
): string {
  let stacktraceToReturn = ''
  let stacktraceAfterSubstring = ''
  if (stacktrace.length > maxLength) {
    let indexOfSpace = stacktrace.substring(0, maxLength).lastIndexOf(' ')

    if (indexOfSpace < 25) {
      const newIndexOfSpace = stacktrace.substring(maxLength).indexOf(' ')
      indexOfSpace =
        newIndexOfSpace > 0 ? newIndexOfSpace + maxLength : indexOfSpace
    }

    stacktraceToReturn += '```' + stacktrace.substring(0, indexOfSpace) + '```'
    stacktraceAfterSubstring = stacktrace.substring(indexOfSpace + 1)

    stacktraceToReturn += '<details><summary>...</summary>'

    while (stacktraceAfterSubstring.length > maxLength) {
      let innerIndexOfSpace = stacktraceAfterSubstring
        .substring(0, maxLength)
        .lastIndexOf(' ')

      if (innerIndexOfSpace < 25) {
        const newInnerIndexOfSpace = stacktraceAfterSubstring
          .substring(maxLength)
          .indexOf(' ')
        innerIndexOfSpace =
          newInnerIndexOfSpace > 0
            ? newInnerIndexOfSpace + maxLength
            : innerIndexOfSpace
      }

      stacktraceToReturn +=
        '```' +
        stacktraceAfterSubstring.substring(0, innerIndexOfSpace) +
        '```<br>'
      stacktraceAfterSubstring = stacktraceAfterSubstring.substring(
        innerIndexOfSpace + 1
      )
    }

    if (stacktraceAfterSubstring.length > 0) {
      stacktraceToReturn += '```' + stacktraceAfterSubstring + '```'
    }

    stacktraceToReturn += '</details>'
    return stacktraceToReturn
  }
  return stacktrace
}

/**
 * Get the color for the suspiciousness value
 * @param suspiciousness The suspiciousness value
 * @returns The color for the suspiciousness value
 */
function getColoredSuspiciousness(suspiciousness: string): string {
  let colorAddFile = undefined
  if (suspiciousness !== '' && suspiciousness !== '---') {
    const suspiciousnessValue = parseFloat(suspiciousness)
    if (suspiciousnessValue >= 0.9) {
      //red
      colorAddFile = 'red.svg'
    } else if (suspiciousnessValue >= 0.75) {
      //orange
      colorAddFile = 'orange.svg'
    } else if (suspiciousnessValue >= 0.5) {
      //yellow
      colorAddFile = 'yellow.svg'
    } else if (suspiciousnessValue >= 0.25) {
      //lightgreen
      colorAddFile = 'green.svg'
    } else {
      //green
      colorAddFile = 'green.svg'
    }
  }
  return (
    (colorAddFile != undefined
      ? `<img src ="https://raw.githubusercontent.com/hugofpaiva/gzoltar-feedback-action/main/src/assets/ColorADD/${colorAddFile}" width="11" height="11"> `
      : '') + suspiciousness
  )
}
