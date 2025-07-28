import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

// Shared regex for parsing ESPHome raw log lines
export const lineRegex = /.*remote.raw:\d+\]:(?: Received Raw:)? (.*)/;

// Shared utility to process a raw signal into binary format
export function processSignal(signal, options) {
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
    } else {
      return { binary: null, length: numbers.length };
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

// Shared utility to parse ESPHome log files and extract raw signal data
export async function parseLogFile(file, processor) {
  const results = [];
  const fileStream = createReadStream(file);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentSignal = "";

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

    // Let the processor handle the signal
    const result = processor(currentSignal);
    if (result) {
      results.push(result);
    }

    currentSignal = ""; // Reset for next signal
  }

  return results;
} 
