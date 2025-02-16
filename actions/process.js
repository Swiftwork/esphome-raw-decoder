import chalk from "chalk";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

const lineRegex = /.*remote.raw:\d+\]:(?: Received Raw:)? (.*)/;

function processSignal(signal, options) {
  const numbers = signal.split(/[, ]+/).map(Number);
  if (
    numbers.length < options.minLength ||
    numbers.length > options.maxLength
  ) {
    return { binary: null, length: numbers.length };
  }

  let binary = "";
  for (let i = 0; i < numbers.length; i++) {
    const duration = Math.abs(numbers[i] || 0);
    const tolerance = duration * (options.tolerance / 100);

    if (Math.abs(duration - options.one) <= tolerance) {
      binary += "1";
    } else if (Math.abs(duration - options.zero) <= tolerance) {
      binary += "0";
    } else if (options.faults) {
      binary += "X";
    }
  }

  if (binary.length < options.minLength || binary.length > options.maxLength) {
    return { binary: null, length: binary.length };
  }
  return {
    binary: options.reverse ? binary.split("").reverse().join("") : binary,
    length: binary.length,
  };
}

export async function processAction(file, options) {
  const outputStream = options.output
    ? createWriteStream(options.output)
    : process.stdout;
  const processOptions = {
    one: parseInt(options.one),
    zero: parseInt(options.zero),
    tolerance: parseInt(options.tolerance),
    minLength: parseInt(options.minLength),
    maxLength: parseInt(options.maxLength),
    reverse: !!options.reverse,
    faults: !!options.faults,
    group: !!options.group,
  };

  try {
    const fileStream = createReadStream(file);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentSignal = "";
    let previousLength = options.maxLength;
    let validSignal = false;

    for await (const line of rl) {
      const match = line.match(lineRegex);
      const data = match?.[1]?.trim();
      if (!data) continue;

      if (currentSignal) {
        // Append this line to previous incomplete signal
        currentSignal += data;
      } else {
        currentSignal = data;
      }

      // Check if this line ends with a comma
      if (currentSignal.endsWith(",")) {
        continue; // Wait for next line
      }

      const { binary, length } = processSignal(currentSignal, processOptions);

      if (binary) {
        if (options.hex) {
          const hex = parseInt(binary, 2).toString(16).toUpperCase();
          outputStream.write(`${binary} 0x${hex}\n`);
        } else {
          outputStream.write(`${binary}\n`);
        }
        validSignal = true;
      }

      if (validSignal && processOptions.group && previousLength > length) {
        outputStream.write("\n");
      }
      previousLength = length;
      validSignal = false;
      currentSignal = ""; // Reset for next signal
    }

    if (options.output) {
      outputStream.end();
      console.log(chalk.green(`Output written to ${options.output}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error processing file: ${error.message}`));
    if (options.output) {
      outputStream.end();
    }
    process.exit(1);
  }
}
