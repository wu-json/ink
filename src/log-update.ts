import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const create = (stream: Writable, {showCursor = false} = {}): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousLineCount = previousLines.length;
		const lines = output.split('\n');
		const lineCount = lines.length;

		// Accumulate parts to write in array then join at end for efficiency
		const parts: string[] = [];

		if (lineCount === 0 || previousLineCount === 0) {
			stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
			previousOutput = output;
			previousLines = lines;
			return;
		}

		// Clear any lines if necessary (only if output has less lines than previous)
		if (lineCount < previousLineCount) {
			parts.push(
				ansiEscapes.eraseLines(previousLineCount - lineCount),
				ansiEscapes.cursorUp(lineCount - 1),
			);
		} else {
			parts.push(ansiEscapes.cursorUp(previousLineCount));
		}

		for (let i = 0; i < lineCount; i++) {
			// Do not write line if content did not change
			if (lines[i] === previousLines[i]) {
				parts.push(ansiEscapes.cursorNextLine);
				continue;
			}

			parts.push(ansiEscapes.eraseLine, lines[i]!, '\n');
		}

		stream.write(parts.join(''));
		previousOutput = output;
		previousLines = lines;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
	};

	render.done = () => {
		previousOutput = '';
		previousLines = [];

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const output = str + '\n';
		previousOutput = output;
		previousLines = output.split('\n');
	};

	return render;
};

const logUpdate = {create};
export default logUpdate;
