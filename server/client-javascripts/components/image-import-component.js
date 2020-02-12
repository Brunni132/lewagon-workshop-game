import {Component} from "../component";
import {decodePng} from "../page-utils";
import {hasClipboardSupport, readImageInClipboardIfAny} from "../clipboard";
import {editorConfig} from "../api";

export class ImageImportComponent extends Component {
  constructor(selector) {
    super(selector);
    // Triggered when a file is loaded
    this.onfileloaded = null;

    this.fileImport = this.element('.file-import');
    this.element('.import-button').onclick = event => {
    	if (!hasClipboardSupport()) {
				this.openDialog();
				return;
			}

			try {
				readImageInClipboardIfAny().then(png => {
					if (png) this.onfileloaded && this.onfileloaded(png, 'untitled');
					else this.openDialog();
				});
				event.preventDefault();
				return true;
			} catch (e) {
				console.error('Error when fetching the clipboard', e);
				this.openDialog();
			}
		};

    const reader = new FileReader();
    reader.onload = event => {
      decodePng(event.target.result, editorConfig.usePinkTransparency).then(png => {
        this.onfileloaded && this.onfileloaded(png, this.fileName);
      });
    };
    this.fileImport.onchange = () => {
      this.fileName = this.fileImport.files[0].name;
      if (this.fileName.endsWith('.png')) this.fileName = this.fileName.substring(0, this.fileName.length - 4);
      reader.readAsArrayBuffer(this.fileImport.files[0]);
      this.fileImport.value = '';
    };
  }

  openDialog() {
    if (!this.hasClass(`.import-button`, 'hidden')) this.fileImport.click();
  }
}
