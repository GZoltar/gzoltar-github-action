export interface IInputs {
  /**
   * Path to the build/target directory containing the GZoltar results
   */
  buildPath: string

  /**
   * Path to the file containing the serialized file with the coverage collect by GZoltar. Example: `/build/gzoltar.ser`
   */
  serializedCoverageFilePath?: string

  /**
   * Path to the file containing a list of all test cases generated by GZoltar. Example: `/build/sfl/txt/tests.csv`
   */
  testCasesFilePath?: string

  /**
   * Path to the file containing a list of all lines of code identified by GZoltar (one per row) of all classes under test. Example: `/build/sfl/txt/spectra.csv`
   */
  spectraFilePath?: string

  /**
   * Path to the file containing a binary coverage matrix produced by GZoltar. Example: `/build/sfl/txt/matrix.txt`
   */
  matrixFilePath?: string

  /**
   * Path to the file containing statistics information of the ranking produced by GZoltar. Example: `/build/sfl/txt/statistics.csv`
   */
  statisticsFilePath?: string

  /**
   * List of the SFL ranking algorithms to use. (Keep in mind that each algorithm need to have present a fault localization report file in the `ranking-files-path` directory with his name, i.e. `ochiai.ranking.csv`.)
   */
  sflRanking: string[]

  /**
   * The depth when fetching
   */
  sflThreshold: number[]

  /**
   * Indicates whether to upload the GZoltar results as an artifact
   */
  uploadArtifacts: boolean

  /**
   * The auth token to use when performing actions on GitHub API
   */
  authToken: string
}
