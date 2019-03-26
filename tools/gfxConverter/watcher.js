const fs = require('fs');
const DEBOUNCE_DELAY = 200;
//let lastChangeDate = new Date().getTime();
//let lastSyncDate = lastChangeDate;
let timer = null;

function watch(directory, cb) {
	let enabled = true;
	// TODO make it so you don't need the gfx/ anymore
	fs.watch(directory, {recursive:true}, (eventType, filename) => {
		//console.log('CHANGE', filename, eventType);
		//lastChangeDate = new Date().getTime();

		if (enabled) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				enabled = false;
				cb();
				setTimeout(() => {
					enabled = true;
				}, 10);
			}, DEBOUNCE_DELAY);
		}
	});
}

module.exports = {
	watch
};
