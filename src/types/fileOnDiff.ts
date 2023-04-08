import {IDiffChangedLines} from './diffChangedLines'

export interface IFileOnDiff {
  path: string
  changedLines: IDiffChangedLines[]
}
