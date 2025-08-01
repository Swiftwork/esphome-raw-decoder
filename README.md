# ESPHome Raw Decoder

CLI tool to process and decode ESPHome raw RF/IR dump files into binary sequences.

## Installation

```bash
yarn install
```


## Input Format

The tool processes ESPHome raw RF/IR dump files. Each line should contain RF/IR timings in the format:

```js
[timestamp][remote.raw:0]: Received Raw: 1234, -420, 1287, -1265
```

## Usage

The tool provides three main commands:

### 1. Decode Command

Decode a dump file and analyze RF/IR signals:

```bash
yarn decode [options] [file]
```

**Options:**

- `--one <microseconds>` - One threshold in microseconds (default: 1250)
- `--zero <microseconds>` - Zero threshold in microseconds (default: 450)
- `--tolerance <percent>` - Tolerance percentage (default: 25)
- `--min-length <bits>` - Minimum signal length (default: 8)
- `--max-length <bits>` - Maximum signal length (default: 32)
- `--min-occurrences <number>` - Minimum occurrences of valid signals (default: 3)
- `--reverse` - Reverse bit order (default: false)
- `--split` - Analyze and split signals into fixed and variable parts (default: false)

**Example:**

```bash
yarn decode --one 1500 --zero 500 --split dump.txt
```

**Output:**

The decode command analyzes signal frequency and provides:

- Most recurring signals with occurrence counts and percentages
- Binary representations with hexadecimal conversion
- When using `--split`, separates signals into static/fixed and variable parts
- Signal statistics (total unique signals, signals processed, signals meeting threshold)

Example output:

```text
Most recurring signals (min 3 occurrences):
 1. 110100011101 (0x1A3D) - 5 occurrences (25.0%)
 2. 110100010011 (0x1A13) - 4 occurrences (20.0%)
```

### 2. Analyze Command

Analyze raw signals to find optimal pulse thresholds and signal statistics:

```bash
yarn analyze [options] [file]
```

**Options:**

- `--min-length <bits>` - Minimum signal length (default: 8)
- `--max-length <bits>` - Maximum signal length (default: 32)
- `--min-short-pulse <microseconds>` - Minimum short pulse length (default: 50)
- `--max-short-pulse <microseconds>` - Maximum short pulse length (default: 350)
- `--min-long-pulse <microseconds>` - Minimum long pulse length (default: 600)
- `--max-long-pulse <microseconds>` - Maximum long pulse length (default: 1000)
- `--histogram` - Show pulse duration histogram (default: false)

**Example:**

```bash
yarn analyze --histogram dump.txt
```

**Output:**

The analyze command provides statistical analysis:

- Short pulse analysis (average, median, min, max, standard deviation)
- Long pulse analysis with the same statistics
- Signal length analysis
- Suggested optimal thresholds based on the data
- Optional pulse duration histograms with `--histogram`

### 3. Render Command

Render signals as an interactive HTML graph:

```bash
yarn render [options] [file]
```

**Options:**

- `-o, --output <file>` - Output file path (default: "decoded-graph.html")
- `--min-length <bits>` - Minimum signal length (default: 8)
- `--max-length <bits>` - Maximum signal length (default: 32)

**Example:**

```bash
yarn render -o signals.html dump.txt
```

**Output:**

The render command generates an interactive HTML file with:

- Visual graphs of all processed signals
- Timing diagrams showing pulse patterns
- Interactive charts for signal analysis
