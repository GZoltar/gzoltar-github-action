import fs from 'fs'
import path from 'path'
import readline from 'readline'

export function readFileAndGetLineReader(path: string): readline.Interface {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  try {
    const fileStream = fs.createReadStream(path)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    return rl
  } catch (error) {
    throw new Error(
      `Encountered an error when reading file path '${path}': ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export async function readFileAndGetLines(path: string): Promise<string[]> {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  try {
    const fileStream = fs.createReadStream(path)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    const lines = []
    for await (const line of rl) {
      lines.push(line)
    }
    return lines
  } catch (error) {
    throw new Error(
      `Encountered an error when reading file path '${path}': ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export function searchFile(
  dir: string,
  fileName: string,
  classFileMode?: boolean,
  packageName?: string,
  directoryPathToExclude?: string
): string | undefined {
  if (!dir) {
    throw new Error("Arg 'dir' must not be empty")
  }

  if (!fileName) {
    throw new Error("Arg 'fileName' must not be empty")
  }

  if (classFileMode && !packageName) {
    throw new Error(
      'Arg mismatch. If classFileMode is true, packageName must be present'
    )
  }

  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)

      const fileStat = fs.statSync(filePath)

      if (fileStat.isDirectory()) {
        if (
          directoryPathToExclude &&
          filePath.includes(directoryPathToExclude)
        ) {
          continue
        }
        files.push(
          ...fs
            .readdirSync(filePath)
            .map((item: string) => path.join(file, item))
        )
      } else if (file == fileName) {
        if (classFileMode) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const packageNameSplitted = packageName!.split('.')
          let lastFoundIndex = -1
          packageNameSplitted.every(value => {
            const newIndex = filePath.search(value)
            if (newIndex > lastFoundIndex && newIndex !== -1) {
              lastFoundIndex = newIndex
              return true
            }
            return false
          })

          if (lastFoundIndex !== -1) {
            return filePath
          }
        } else {
          return filePath
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Encountered an error when searching file '${fileName}' in directory '${dir}': ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export function searchDirectory(
  dir: string,
  directoryName: string,
  upperDirectory?: string
): string | undefined {
  if (!dir) {
    throw new Error("Arg 'dir' must not be empty")
  }

  if (!directoryName) {
    throw new Error("Arg 'directoryName' must not be empty")
  }

  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const directoryPath = path.join(dir, file)

      const directories = directoryPath.split('/')

      if (directoryExists(directoryPath)) {
        if (directories[directories.length - 1] === directoryName) {
          if (upperDirectory) {
            const upperDirectoryIndex = directories.indexOf(upperDirectory)
            if (
              upperDirectoryIndex !== -1 &&
              upperDirectoryIndex === directories.length - 2
            ) {
              return directoryPath
            }
          } else {
            return directoryPath
          }
        }

        const result = searchDirectory(
          directoryPath,
          directoryName,
          upperDirectory
        )
        if (result) {
          return result
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Encountered an error when searching directory '${directoryName}' in directory '${dir}': ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export function directoryExists(path: string): boolean {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  try {
    const fileStat = fs.statSync(path)

    return fileStat.isDirectory()
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      return false
    }

    throw new Error(
      `Encountered an error when checking whether path '${path}' exists: ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export function getFilesFromDirectory(directoryPath: string): string[] {
  if (!directoryPath) {
    throw new Error("Arg 'directoryPath' must not be empty")
  }

  try {
    const files = fs.readdirSync(directoryPath)
    const filesWithPath = files.map(
      (file: string) => directoryPath + '/' + file
    )

    return filesWithPath
  } catch (error) {
    throw new Error(
      `Encountered an error when getting files from directory '${directoryPath}': ${
        (error as any)?.message ?? error
      }`
    )
  }
}

export function fileExists(path: string): boolean {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  try {
    const fileStat = fs.statSync(path)

    return !fileStat.isDirectory()
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      return false
    }

    throw new Error(
      `Encountered an error when checking whether file '${path}' exists: ${
        (error as any)?.message ?? error
      }`
    )
  }
}
