
const pixels = 65536;
const ratios = [ [16, 9], [16, 10], [3, 2], [4, 3], [1, 1] ];

for (const ratio of ratios) {
	let cur = 1;
	let width = 256, height = 256;
	let r = ratio[0] / ratio[1];
	let okWidth = width, okHeight = height;
	while (width / height < r) {
		okWidth = width;
		okHeight = height;
		width += 8;
		height = pixels / width;
	}

	console.log(`For ratio ${ratio[0]}:${ratio[1]}, we have: ${okWidth} x ${okHeight}`);
}


