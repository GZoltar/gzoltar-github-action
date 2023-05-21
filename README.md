# 📚 GZoltar Automatic Feedback for GitHub Actions

Analyzes GZoltar results and posts a comment on the pull request/commit with the suspicious lines.

## Action inputs

| Name                      | Description                                                                                                                                                                                                                                                                                                                                                                                                     | Default       |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|
| `token`                   | Personal access token (PAT) used to make actions on the repository such as creating comments on PRs/Commits. It is recommended to use a service account with the least permissions necessary. Also when generating a new PAT, select the least scopes necessary. [Learn more about creating and using encrypted secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets) | `${{ github.token }}` |
| `build-path`              | Path to the build/target directory containing the GZoltar results                                                                                                                                                                                                                                                                                                                                               | `/build`      |
| `serialized-coverage-file-path` | Path to the file containing the serialized file with the coverage collect by GZoltar. Example: `/build/gzoltar.ser`                                                                                                                                                                                                                                                                                                 | Not required  |
| `test-cases-file-path`    | Path to the file containing a list of all test cases identified by GZoltar. Example: `/build/sfl/txt/tests.csv`                                                                                                                                                                                                                                                                                                     | Not required  |
| `spectra-file-path`       | Path to the file containing a list of all lines of code identified by GZoltar (one per row) of all classes under test. Example: `/build/sfl/txt/spectra.csv`                                                                                                                                                                                                                                                 | Not required  |
| `matrix-file-path`        | Path to the file containing a binary coverage matrix produced by GZoltar. Example: `/build/sfl/txt/matrix.txt`                                                                                                                                                                                                                                                                                                   | Not required  |
| `statistics-file-path`    | Path to the file containing statistics information of the ranking produced by GZoltar. Example: `/build/sfl/txt/statistics.csv`                                                                                                                                                                                                                                                                                  | Not required  |
| `ranking-files-paths`     | Path to each SFL ranking algorithms file. Example: `[/build/sfl/txt/ochiai.ranking.csv]`                                                                                                                                                                                                                                                                                                                        | Not required  |
| `ranking-html-directories-paths`     | Path to each SFL ranking algorithms directory containing the HTML reports. Example: `[/build/sfl/html/ochiai/]`                                                                                                                                                                                                                                                                                                                        | Not required  |
| `sfl-ranking`             | List of the SFL ranking algorithms to use separated by `,`. (Keep in mind that each algorithm need to have present a fault localization report file in the `ranking-files-path` directory with his name, i.e. `ochiai.ranking.csv`.)                                                                                                                                                                             | `[ochiai]`    |
| `sfl-threshold`           | Line suspiciousness threshold to trigger an warning. A threshold is needed for each SFL ranking algorithms used                                                                                                                                                                                                                                                                                                 | `[0.5]`       |
| `sfl-ranking-order`           | Ranking algorithm to order table results by suspiciousness, on descending order.                                                                                                                                                                                                                                                                                                 | `ochiai`       |
| `diff-comments-code-block`           | Indicates if comments displayed on files with suspicious lines in diff are grouped by code block, instead of in each line                                                                                                                                                                                                                                                                                                 | `true`       |
| `upload-artifacts`        | Indicates whether to upload the GZoltar results as an artifact                                                                                                                                                                                                                                                                                                                                                    | `false`       |


## Usage

Executing automatic feedback action after GZoltar fault-localization 

```yaml
name: GZoltar Fault Localization
on: [push]
jobs:
  fault-localization:
    name: Fault Localization
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
    - uses: actions/checkout@v3
    - name: Executes GZoltar fault-localization on a Java project using CLI
      run: ./run_gzoltar.sh
    - name: Executes GZoltar Automatic Feedback for GitHub Actions to get summarized view
      uses: hugofpaiva/gzoltar-feedback-action@main
      with:
        sfl-ranking: "[ochiai, tarantula]"
        sfl-threshold: "[0.5, 0.85]"
        sfl-ranking-order: "ochiai"
        upload-artifacts: true
```

## Example

A repository with a detailed example can be found [here](https://github.com/hugofpaiva/example-gzoltar-feedback-action).
