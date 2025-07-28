# ESPHome Raw Decoder

CLI tool to process and decode ESPHome raw RF dump files into binary sequences.

## Installation

```bash
yarn install
```

## Usage

Basic usage:

```bash
yarn process [options] [file]
```

### Options

- `-o, --output <file>` - Output file path (default: "decoded.txt")
- `--one <microseconds>` - One threshold in microseconds (default: 1250)
- `--zero <microseconds>` - Zero threshold in microseconds (default: 450)
- `--tolerance <percent>` - Tolerance percentage (default: 25)
- `--min-length <bits>` - Minimum signal length (default: 8)
- `--max-length <bits>` - Maximum signal length (default: 32)
- `--reverse` - Reverse bit order (default: true)
- `--faults` - Show timing faults as 'X' in output (default: false)
- `--hex` - Add hexadecimal values to output (default: false)
- `--group` - Attempt to group signals by length (default: false)

### Example

Process a dump file with custom thresholds:

```bash
yarn process --one 1500 --zero 500 dump.txt
```

## Input Format

The tool processes ESPHome raw RF/IR dump files. Each line should contain RF/IR timings in the format:

```js
[timestamp][remote.raw:0]: Received Raw: 1234, -420, 1287, -1265
```

## Output

The tool outputs binary sequences, one per line. Each sequence represents the decoded RF/IR signal.
When using `--hex`, the output includes both binary and hexadecimal formats:

```js
1101 0xD
```
