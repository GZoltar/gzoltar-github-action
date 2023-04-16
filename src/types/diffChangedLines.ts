export interface IDiffChangedLines {
  startLine: number
  endLine: number
  startDiffPosition: number
  linesRemovedNotConsidered: number[]
}
