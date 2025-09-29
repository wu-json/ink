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
	let previousLines = [];
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

		const newLines = output.split('\n')

		const previousLinesCount = previousLines.length
		const newLinesCount = newLines.length

		for (let i = 0; i < newLinesCount; i++) {
			if (i > Math.max(previousLinesCount - 1)){
				// write new line; no need to clear
				stream.write(output + '\n');
				stream.write(ansiEscapes.cursorNextLine)
				continue
			}

			// only write if a new line
			if (previousLines[i] !== newLines[i]) {
				stream.write(output + '\n');
				stream.write(ansiEscapes.cursorNextLine)
			}
		}

		if (newLinesCount < previousLinesCount) {
			// clear the remaining lines
			for (let i = 0; i < previousLinesCount - newLinesCount; i++) {
				stream.write(ansiEscapes.eraseLine);
				stream.write(ansiEscapes.cursorUp());
			}
		}

		// Otherwise, we do incremental rendering bb

		previousOutput = output;
		stream.write(ansiEscapes.eraseLines(previousLines.length) + output);
		previousLines.length = output.split('\n').length;
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
