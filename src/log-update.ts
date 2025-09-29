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

		const prevLinesCount = previousLines.length
		const newLinesCount = newLines.length


		if (newLinesCount < prevLinesCount) {
			// Erase and move up
			stream.write(ansiEscapes.eraseLines(prevLinesCount - newLinesCount))
			stream.write(ansiEscapes.cursorUp(newLinesCount))
		}

		for (let i = 0; i < newLinesCount; i++) {
			if (i < Math.max(prevLinesCount - 1, 0)){
				stream.write(ansiEscapes.eraseLine + newLines[i] + '\n');
				stream.write(ansiEscapes.cursorNextLine)
				continue
			}

			// write new line; no need to clear (already cleared by someone else)
			stream.write(newLines[i] + '\n');
			stream.write(ansiEscapes.cursorNextLine)
		}

		previousOutput = output;
		previousLines = newLines
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
