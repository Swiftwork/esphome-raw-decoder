import chalk from "chalk";
import { parseLogFile } from "./utils.js";

// Utility functions for statistical calculations
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function standardDeviation(arr) {
  const avg = average(arr);
  const squareDiffs = arr.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

// Generic function to display statistics for any data array
function displayStatistics(data, title, unit) {
  if (data.length === 0) return;

  console.log(chalk.cyan(`📊 ${title}:`));
  console.log(`  Count: ${data.length}${unit === "signals" ? " signals" : ""}`);
  console.log(`  Average: ${Math.round(average(data))}${unit}`);
  console.log(`  Median: ${Math.round(median(data))}${unit}`);
  console.log(`  Min: ${Math.min(...data)}${unit}`);
  console.log(`  Max: ${Math.max(...data)}${unit}`);
  console.log(`  Std Dev: ${Math.round(standardDeviation(data))}${unit}`);
  console.log();
}

// Generic function to create and display histograms
function displayHistogram(data, title, unit, bins = 10) {
  if (data.length === 0) return;

  console.log(chalk.cyan(`📈 ${title}:`));

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binSize = (max - min) / bins;
  const histogram = new Array(bins).fill(0);

  data.forEach((value) => {
    const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
    histogram[binIndex]++;
  });

  const maxCount = Math.max(...histogram);
  const maxBarLength = 40;

  for (let i = 0; i < bins; i++) {
    const rangeStart = Math.round(min + i * binSize);
    const rangeEnd = Math.round(min + (i + 1) * binSize);
    const count = histogram[i];
    const barLength = Math.round((count / maxCount) * maxBarLength);
    const bar = "█".repeat(barLength);

    console.log(
      `  ${rangeStart.toString().padStart(4)}-${rangeEnd
        .toString()
        .padEnd(4)}${unit}: ${bar} (${count})`
    );
  }
  console.log();
}

// Action-specific function to parse raw signals for analysis
async function parseRawSignalsForAnalysis(file, options) {
  return parseLogFile(file, (signal) => {
    // Parse the raw signal into numbers
    const numbers = signal
      .split(/[, ]+/)
      .map(Number)
      .filter((n) => n !== 0);

    if (
      numbers.length >= options.minLength &&
      numbers.length <= options.maxLength
    ) {
      // Convert all pulses to positive values
      let pulses = numbers.map((n) => Math.abs(n));
      let shortPulses = pulses.filter(
        (p) => p <= options.maxShortPulse && p >= options.minShortPulse
      );
      let longPulses = pulses.filter(
        (p) => p >= options.minLongPulse && p <= options.maxLongPulse
      );

      return {
        numbers,
        pulses,
        shortPulses,
        longPulses,
        length: numbers.length,
        raw: signal,
      };
    }
    return null;
  });
}

export async function analyzeAction(file, options) {
  const parseOptions = {
    minLength: parseInt(options.minLength),
    maxLength: parseInt(options.maxLength),
    minShortPulse: parseInt(options.minShortPulse),
    maxShortPulse: parseInt(options.maxShortPulse),
    minLongPulse: parseInt(options.minLongPulse),
    maxLongPulse: parseInt(options.maxLongPulse),
  };

  try {
    console.log(chalk.blue(`Analyzing file: ${file}`));
    console.log(
      chalk.gray(
        `Pulse filtering: ${parseOptions.minShortPulse || 0}μs - ${
          parseOptions.maxShortPulse || "∞"
        }μs (short), ${parseOptions.minLongPulse || 0}μs - ${
          parseOptions.maxLongPulse || "∞"
        }μs (long)`
      )
    );
    console.log(
      chalk.gray(
        `Signal length filtering: ${parseOptions.minLength} - ${parseOptions.maxLength} pulses`
      )
    );

    const signals = await parseRawSignalsForAnalysis(file, parseOptions);

    if (signals.length === 0) {
      console.log(chalk.yellow("No valid signals found in the dump file."));
      return;
    }

    console.log(
      chalk.green(`Found ${signals.length} valid signals to analyze\n`)
    );

    // Collect all pulse data
    const allShortPulses = [];
    const allLongPulses = [];
    const signalLengths = [];

    signals.forEach((signal) => {
      allShortPulses.push(...signal.shortPulses);
      allLongPulses.push(...signal.longPulses);
      signalLengths.push(signal.length);
    });

    // Display statistics using the generic function
    displayStatistics(allShortPulses, "SHORT PULSE ANALYSIS", "μs");
    displayStatistics(allLongPulses, "LONG PULSE ANALYSIS", "μs");
    displayStatistics(signalLengths, "SIGNAL LENGTH ANALYSIS", " pulses");

    // Suggest optimal thresholds based on analysis
    if (allShortPulses.length > 0 && allLongPulses.length > 0) {
      console.log(chalk.yellow("💡 SUGGESTED THRESHOLDS:"));
      console.log(
        `  Suggested short pulse threshold: ${Math.round(
          median(allShortPulses)
        )}μs`
      );
      console.log(
        `  Suggested long pulse threshold: ${Math.round(
          median(allLongPulses)
        )}μs`
      );

      // Calculate tolerance suggestion
      const shortVariability =
        (standardDeviation(allShortPulses) / average(allShortPulses)) * 100;
      const longVariability =
        (standardDeviation(allLongPulses) / average(allLongPulses)) * 100;
      const suggestedTolerance =
        Math.max(shortVariability, longVariability) * 1.5;

      console.log(
        `  Suggested --tolerance: ${Math.round(suggestedTolerance)}%`
      );
      console.log();
    }

    // Display histograms using the generic function
    if (options.histogram) {
      displayHistogram(
        [...allShortPulses, ...allLongPulses],
        "PULSE DURATION HISTOGRAM",
        "μs"
      );
      displayHistogram(signalLengths, "SIGNAL LENGTH HISTOGRAM", " pulses");
    }
  } catch (error) {
    console.error(chalk.red(`Error analyzing file: ${error.message}`));
    process.exit(1);
  }
}
