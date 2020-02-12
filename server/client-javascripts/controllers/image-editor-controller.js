import {arrayForType, gameResourceData, makeRenameOperation, mapNamed, runOperation} from "../api";
import {Controller} from "../controller";
import {IMAGE_UPDATE_DELAY, updateListCombo} from "../page-utils";

let didWarnFromChangingName = false;

export class ImageEditorController extends Controller {

  buildIndicatorsArray(key, fixedProps = {}) {
    const items = gameResourceData[key];
    const mapper = key => ({
      ...items[key],
      text: key,
      selected: key === this.selectedItemName,
      focused: this.focusedMode,
      indType: 'item',
      ...fixedProps
    });
    // In focused mode, return only one element with focused: true (used for displayed focused-mode-only indicators)
    if (this.focusedMode) return Object.keys(items).filter(k => k === this.selectedItemName).map(mapper);
    // Else all indicators, with highlighted property (used only in "overworld" mode, i.e. not in map-object mode)
    return Object.keys(items).map(key => ({
      ...mapper(key),
      highlighted: this.tool === 'select' && key === this.selectedItemName,
    }));
  }

  updateName(controlClass, itemType) {
    // No change?
    const newName = this.element(controlClass).value, prevName = this.selectedItemName;
    if (prevName === newName || !newName) return;
    const array = arrayForType(itemType);
    if (array[newName]) return alert(`There is already a ${itemType} named ${newName}. Please choose another name.`);
    this.selectedItemName = newName;
    runOperation(makeRenameOperation(itemType, prevName, newName));
  }

  static updatePaletteList(element) {
    updateListCombo(element, 'pals');
  }

  static updateTilesetList(element) {
    updateListCombo(element, 'sprites');
  }

  // Configures an element that should be called <type>-name
  configureRenamer(type, warnAboutChanging) {
    const el = this.element(`.${type}-name`);
    el.oninput = () => this.updateName(`.${type}-name`, type);
    if (warnAboutChanging) {
      el.onfocus = () => {
        if (didWarnFromChangingName) return;
        didWarnFromChangingName = true;
        alert(`Sprites and maps reference themselves by name. Therefore, changing the name of any resource requires updating the other sprite/maps one by one accordingly, or your game will not be able to draw them.`);
      }
    }
  }

  // ------------------------------ OVERRIDE ---------------------------------
  onBlur() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onFocus() {
    if (!this.timer) this.timer = setInterval(() => this.onPeriodicRender(), IMAGE_UPDATE_DELAY);
  }

  onPeriodicRender() {}
}
