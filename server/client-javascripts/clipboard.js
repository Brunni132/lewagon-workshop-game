import {PNG} from "pngjs/browser";
import {decodePng, pixels32ToPng} from "./page-utils";
import { saveAs } from 'file-saver';
import {editorConfig} from "./api";

let currentClipboardItem = null;

export function hasClipboardSupport() {
	return !(typeof ClipboardItem === 'undefined' || !navigator || !navigator.clipboard || !navigator.clipboard.write || !editorConfig.useClipboard);
}

export function copyToClipboard(type, indicator, width, height, pixels, clipboard = null) {
  currentClipboardItem = { type, indicator, width, height, pixels };
  if (!clipboard) return;

  // Write as PNG to the clipboard
  const png = new PNG({width: clipboard.width, height: clipboard.height});
  pixels32ToPng(png.data, clipboard.pixels, editorConfig.usePinkTransparency);
  const blob = new Blob([PNG.sync.write(png)], {type : "image/png"});

	if (clipboard.isExport) {
		saveAs(blob, 'image.png');
	} else if (hasClipboardSupport()) {
		const cbItem = new ClipboardItem({"image/png": blob});
		navigator.clipboard.write([cbItem]);
	}
}

export function copyObjectsToClipboard(objects) {
  // Keep in serialized form in the clipboard to avoid the caller mistakenly modifying them (easier API)
  currentClipboardItem = {type: 'object', objects: JSON.stringify(objects)};
}

export function getClipboardData(type) {
  if (!currentClipboardItem || currentClipboardItem.type !== type) return null;
  if (type === 'object') return {...currentClipboardItem, objects: JSON.parse(currentClipboardItem.objects)};
  return currentClipboardItem;
}

export async function readImageInClipboardIfAny() {
	if (!hasClipboardSupport()) return;
	const contents = await navigator.clipboard.read();
	if (!contents || contents.length === 0) return null;

	const item = contents[0];
	for (let t of item.types) {
		if (t === 'image/png') {
			const blob = await item.getType(t);
			return decodePng(await blob.arrayBuffer(), editorConfig.usePinkTransparency);
		}
	}
	return null;
}
