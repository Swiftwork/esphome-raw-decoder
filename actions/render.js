import chalk from "chalk";
import { createWriteStream, readFileSync } from "node:fs";
import { parseLogFile } from "./utils.js";

// Action-specific function to parse raw signals for rendering
async function parseRawSignals(file, options) {
  return parseLogFile(file, (signal) => {
    // Parse the raw signal
    const numbers = signal.split(/[, ]+/).map(Number).filter(n => n !== 0);
    
    if (numbers.length >= options.minLength && numbers.length <= options.maxLength) {
      return {
        numbers,
        length: numbers.length
      };
    }
    return null;
  });
}

export async function renderAction(file, options) {
  const parseOptions = {
    minLength: parseInt(options.minLength),
    maxLength: parseInt(options.maxLength),
  };

  try {
    console.log(chalk.blue(`Processing file: ${file}`));
    
    const signals = await parseRawSignals(file, parseOptions);
    
    if (signals.length === 0) {
      console.log(chalk.yellow("No valid signals found in the dump file."));
      return;
    }

    console.log(chalk.green(`Found ${signals.length} valid signals`));

    // Read the HTML template
    const templatePath = new URL("../templates/graph.html", import.meta.url);
    let htmlTemplate = readFileSync(templatePath, "utf8");

    // Replace the placeholder with the signals data
    const signalsJson = JSON.stringify(signals);
    htmlTemplate = htmlTemplate.replace("'{{ SIGNALS_DATA }}'", signalsJson);

    // Write the output file
    const outputStream = createWriteStream(options.output);
    outputStream.write(htmlTemplate);
    outputStream.end();

    console.log(chalk.green(`HTML chart written to ${options.output}`));
    console.log(chalk.blue(`Open ${options.output} in your browser to view the charts`));

  } catch (error) {
    console.error(chalk.red(`Error processing file: ${error.message}`));
    process.exit(1);
  }
} 
