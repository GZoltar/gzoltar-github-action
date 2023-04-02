export interface IFileOnDiff {
  path: string
  changedLines: {startLine: number; endLine: number}[]
}
