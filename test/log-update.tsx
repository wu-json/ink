import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';

test('renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello');
	t.is((stdout.write as any).callCount, 1);
	t.is((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World');
	t.is((stdout.write as any).callCount, 2);
	t.true(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('skips identical output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello');
	render('Hello');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental render (surgical updates)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Line 1\nLine 2\nLine 3');
	render('Line 1\nUpdated\nLine 3');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(secondCall.includes('Updated')); // Only updates changed line
	t.false(secondCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(secondCall.includes('Line 3')); // Doesn't rewrite unchanged
});
