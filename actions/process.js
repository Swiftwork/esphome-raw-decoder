import chalk from 'chalk';
import {createReadStream, createWriteStream} from 'node:fs';
import {createInterface} from 'node:readline';

const lineRegex = /.*remote.raw:\d+\]:(?: Received Raw:)? (.*)/;

function processSignal(signal, options) {
  const numbers = signal.split(/[, ]+/).map(Number);
  if (numbers.length < options.minLength) return null;

  let binary = '';
  for (let i = 0; i < numbers.length; i++) {
    const duration = Math.abs(numbers[i] || 0);
    const tolerance = duration * (options.tolerance / 100);
    
    if (Math.abs(duration - options.one) <= tolerance) {
      binary += '1';
    } else if (Math.abs(duration - options.zero) <= tolerance) {
      binary += '0';
    }
  }

  if (binary.length < options.minLength) return null;
  return options.reverse ? binary.split('').reverse().join('') : binary;
}

export async function processAction(file, options) {
  const outputStream = options.output ? createWriteStream(options.output) : process.stdout;
  const processOptions = {
    one: parseInt(options.one),
    zero: parseInt(options.zero),
    tolerance: parseInt(options.tolerance),
    minLength: parseInt(options.minLength),
    reverse: !!options.reverse
  };

  try {
    const fileStream = createReadStream(file);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const match = line.match(lineRegex);
      const data = match?.[1]?.trim();
      if (!data) continue;

      const binary = processSignal(data, processOptions);
      if (binary) {
        outputStream.write(binary + '\n');
      }
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
