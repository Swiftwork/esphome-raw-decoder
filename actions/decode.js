import chalk from "chalk";
import { parseLogFile, processSignal } from "./utils.js";

// Action-specific function to parse dump files for binary processing
async function parseDumpFile(file, options) {
  return parseLogFile(file, (signal) => {
    const { binary, length } = processSignal(signal, options);

    if (binary) {
      return {
        binary,
        length,
        raw: signal,
        numbers: signal.split(/[, ]+/).map(Number),
      };
    }
    return null;
  });
}

// Function to find common prefix among binary strings
function findCommonPrefix(binaries) {
  if (binaries.length === 0) return "";
  if (binaries.length === 1) return binaries[0];

  let prefix = "";
  const firstBinary = binaries[0];

  for (let i = 0; i < firstBinary.length; i++) {
    const char = firstBinary[i];
    if (binaries.every((binary) => binary[i] === char)) {
      prefix += char;
    } else {
      break;
    }
  }

  return prefix;
}

// Function to find common suffix among binary strings
function findCommonSuffix(binaries) {
  if (binaries.length === 0) return "";
  if (binaries.length === 1) return binaries[0];

  let suffix = "";
  const firstBinary = binaries[0];

  for (let i = firstBinary.length - 1; i >= 0; i--) {
    const char = firstBinary[i];
    if (
      binaries.every(
        (binary) =>
          binary[binary.length - 1 - (firstBinary.length - 1 - i)] === char
      )
    ) {
      suffix = char + suffix;
    } else {
      break;
    }
  }

  return suffix;
}

// Function to split signals into static and variable parts
function splitSignals(filteredSignals) {
  const binaries = filteredSignals.map(([binary, count]) => binary);

  const commonPrefix = findCommonPrefix(binaries);
  const commonSuffix = findCommonSuffix(binaries);

  // Ensure prefix and suffix don't overlap
  const maxStaticLength = Math.min(
    commonPrefix.length + commonSuffix.length,
    Math.min(...binaries.map((b) => b.length))
  );

  let finalPrefix = commonPrefix;
  let finalSuffix = commonSuffix;

  // Check for overlap and adjust if necessary
  if (commonPrefix.length + commonSuffix.length > maxStaticLength) {
    // Prioritize prefix if there's overlap
    finalSuffix = commonSuffix.slice(
      Math.max(0, commonPrefix.length + commonSuffix.length - maxStaticLength)
    );
  }

  const staticPart =
    finalPrefix +
    (finalSuffix && finalPrefix !== finalSuffix ? finalSuffix : "");

  const splitResults = filteredSignals.map(([binary, count]) => {
    const prefixLength = finalPrefix.length;
    const suffixLength = finalSuffix.length;

    let variablePart;
    if (suffixLength === 0) {
      variablePart = binary.slice(prefixLength);
    } else {
      variablePart = binary.slice(prefixLength, binary.length - suffixLength);
    }

    return {
      binary,
      count,
      staticPart: {
        prefix: finalPrefix,
        suffix: finalSuffix,
        combined: staticPart,
      },
      variablePart,
    };
  });

  return {
    staticPart: {
      prefix: finalPrefix,
      suffix: finalSuffix,
      combined: staticPart,
    },
    splitResults,
  };
}

export async function decodeAction(file, options) {
  const processOptions = {
    one: parseInt(options.one),
    zero: parseInt(options.zero),
    tolerance: parseInt(options.tolerance),
    minLength: parseInt(options.minLength),
    maxLength: parseInt(options.maxLength),
    reverse: !!options.reverse,
  };

  // Get minimum occurrence threshold from command-line option
  const minOccurrences = parseInt(options.minOccurrences);
  const splitEnabled = !!options.split;

  try {
    const signals = await parseDumpFile(file, processOptions);

    if (signals.length === 0) {
      console.log(chalk.yellow("No valid signals found in the dump file."));
      return;
    }

    // Track signal frequencies
    const signalFrequency = new Map();

    for (const signal of signals) {
      // Update frequency count
      const count = signalFrequency.get(signal.binary) || 0;
      signalFrequency.set(signal.binary, count + 1);
    }

    // Display most recurring signals
    if (signalFrequency.size > 0) {
      // Filter signals by minimum occurrences threshold
      const filteredSignals = Array.from(signalFrequency.entries()).filter(
        ([binary, count]) => count >= minOccurrences
      );

      if (filteredSignals.length > 0) {
        if (splitEnabled && filteredSignals.length > 1) {
          // Split signals into static and variable parts
          const { staticPart, splitResults } = splitSignals(filteredSignals);

          console.log(
            chalk.cyan(
              `\nSignal Analysis with Split (min ${minOccurrences} occurrences):`
            )
          );

          if (staticPart.combined.length > 0) {
            console.log(chalk.magenta(`\nStatic Part:`));
            if (staticPart.prefix.length > 0) {
              console.log(
                `  Prefix:  ${chalk.white(staticPart.prefix)} (${
                  staticPart.prefix.length
                } bits)`
              );
            }
            if (staticPart.suffix.length > 0) {
              console.log(
                `  Suffix:  ${chalk.white(staticPart.suffix)} (${
                  staticPart.suffix.length
                } bits)`
              );
            }
            console.log(
              `  Combined: ${chalk.white(staticPart.combined)} (${
                staticPart.combined.length
              } bits)`
            );

            let staticHex;
            try {
              staticHex =
                staticPart.combined.length > 0
                  ? BigInt("0b" + staticPart.combined)
                      .toString(16)
                      .toUpperCase()
                  : "N/A";
            } catch (error) {
              staticHex = "INVALID";
            }
            console.log(`  Hex:     0x${chalk.yellow(staticHex)}`);
          } else {
            console.log(
              chalk.yellow(
                `\nNo common static part found among filtered signals.`
              )
            );
          }

          console.log(chalk.magenta(`\nVariable Parts:`));
          splitResults.forEach((result, index) => {
            const { binary, count, variablePart } = result;
            let fullHex;
            try {
              fullHex = BigInt("0b" + binary)
                .toString(16)
                .toUpperCase();
            } catch (error) {
              fullHex = "INVALID";
            }
            let variableHex;
            try {
              variableHex =
                variablePart.length > 0
                  ? BigInt("0b" + variablePart)
                      .toString(16)
                      .toUpperCase()
                  : "N/A";
            } catch (error) {
              variableHex = "INVALID";
            }
            const percentage = ((count / signals.length) * 100).toFixed(1);

            console.log(
              `${chalk.green(
                (index + 1).toString().padStart(2, " ")
              )}. Variable: ${chalk.white(variablePart)} (0x${chalk.yellow(
                variableHex
              )}) | Full: ${chalk.gray(binary)} (0x${chalk.yellow(
                fullHex
              )}) - ${chalk.blue(count)} occurrences (${chalk.magenta(
                percentage
              )}%)`
            );
          });
        } else {
          // Standard display without splitting
          console.log(
            chalk.cyan(
              `\nMost recurring signals (min ${minOccurrences} occurrences):`
            )
          );

          filteredSignals.forEach(([binary, count], index) => {
            let hex;
            try {
              hex = BigInt("0b" + binary)
                .toString(16)
                .toUpperCase();
            } catch (error) {
              hex = "INVALID";
            }
            const percentage = ((count / signals.length) * 100).toFixed(1);
            console.log(
              `${chalk.green(
                (index + 1).toString().padStart(2, " ")
              )}. ${chalk.white(binary)} (0x${chalk.yellow(
                hex
              )}) - ${chalk.blue(count)} occurrences (${chalk.magenta(
                percentage
              )}%)`
            );
          });

          if (splitEnabled && filteredSignals.length === 1) {
            console.log(
              chalk.yellow(
                `\nNote: Split analysis requires at least 2 filtered signals.`
              )
            );
          }
        }
      } else {
        console.log(
          chalk.yellow(
            `\nNo signals found with ${minOccurrences} or more occurrences.`
          )
        );
      }

      console.log(
        `\nTotal unique signals: ${chalk.cyan(signalFrequency.size)}`
      );
      console.log(`Total signals processed: ${chalk.cyan(signals.length)}`);
      console.log(
        `Signals meeting threshold (≥${minOccurrences}): ${chalk.cyan(
          filteredSignals.length
        )}`
      );
    }
  } catch (error) {
    console.error(chalk.red(`Error processing file: ${error.message}`));
    if (options.output) {
      outputStream.end();
    }
    process.exit(1);
  }
}
