String.prototype.formatAs = function(...colorDefs) {
	return `\x1b[${colorDefs.join(';')}m${this}\x1b[0m`;
};

String.prototype.formatAsError = function() {
	return this.formatAs('1', '31');
};

/**
 * (3, 4) => 4; (4, 4) => 4 ; (5, 4) => 8; (8, 4) => 8; (9, 4) => 12; etc.
 * @param number {number}
 * @param divider {number}
 */
function alignToUpperDivider(number, divider) {
	const mod = number % divider;
	if (mod === 0) return number;
	return number + (divider - number % divider);
}

// min and max included
function randomIntFromInterval(min,max) {
	return Math.floor(Math.random()*(max-min+1)+min);
}

module.exports = {
	BRIGHT: '1',
	DIM: '2',
	UNDERSCORE: '4',
	BLINK: '5',
	REVERSE: '7',
	HIDDEN: '8',
	FG_BLACK: '30',
	FG_RED: '31',
	FG_GREEN: '32',
	FG_YELLOW: '33',
	FG_BLUE: '34',
	FG_MAGENTA: '35',
	FG_CYAN: '36',
	FG_WHITE: '37',
	BG_BLACK: '40',
	BG_RED: '41',
	BG_GREEN: '42',
	BG_YELLOW: '43',
	BG_BLUE: '44',
	BG_MAGENTA: '45',
	BG_CYAN: '46',
	BG_WHITE: '47',
	alignToUpperDivider,
	randomIntFromInterval
};
