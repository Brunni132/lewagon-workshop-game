import {
  findValidName,
  gameResourceData,
  itemsInRect,
  makeClearRectOperation,
  makeCreateOperation,
  makeDeleteOperation, makeFloodFillOperation,
  makeImageWriteOperation,
  makePenWriteOperation,
  makePropertyWriteOperation,
  paletteBitmap,
  paletteNamed,
  runOperation,
  spriteBitmap,
  spriteNamed
} from "../api";
import {ImageEditorComponent} from "../components/image-editor-component";
import {ImageImportComponent} from "../components/image-import-component";
import {copyToClipboard, getClipboardData} from "../clipboard";
import {PaletteColorSelector} from "../components/palette-color-selector";
import {COLORS_IN_PALETTE, importSprite} from "../graphics-import";
import {showYesNoDialog} from "../components/yesno-dialog-component";
import {ImageEditorController} from "./image-editor-controller";
import {makeRectangle, makeRectangleWH, modulus} from "../math-utils";

export class SpritesController extends ImageEditorController {
  constructor() {
    super('sprites');
    // 'select' for selection/move, 'pen'|'eyedropper' for writing, 'rect' for rectangular selection
    this.tool = null;
    this.focusedMode = false;
    this.selectedItemName = null;
  }

  async onLoad() {
    await super.onLoad();
    this.imageEditor = new ImageEditorComponent(this.element('.sprite-editor'), this.itemSelector);
    this.imageEditor.onselectitem = this.onSelectItem.bind(this);
    this.imageEditor.onedititem = this.onFocusItem.bind(this);
    this.imageEditor.oneyedropper = this.onEyeDropper.bind(this);
    this.imageEditor.onpenwrite = this.onPenWrite.bind(this);
    this.imageEditor.onswitchtosecondarytool = this.onSwitchedToSecondaryTool.bind(this);
    this.imageEditor.ondrawpixel = (cacheBitmap, x, y, pixel) =>
      cacheBitmap.setPixel(x, y, (this.currentPaletteArray[pixel] & 0xffffff) | (pixel !== 0 ? 0xff000000 : 0));
    this.imageEditor.onbakepastedimage = this.onBakePastedImage.bind(this);
    this.imageEditor.onrequestpathcolor = () => this.activeColor.selectedColorNo;
    this.imageEditor.onothertool = this.onOtherTool.bind(this);
    this.imageEditor.onResize();

    this.imageImportComp = new ImageImportComponent('#sprites-body .toolbar');
    this.imageImportComp.onfileloaded = this.onImportImage.bind(this);

    this.activeColor = new PaletteColorSelector('#sprites-body .detail-box .palette-color-selector');

    ['select', 'rect', 'pen', 'eyedropper', 'bucket'].forEach(tool =>
      this.element(`.${tool}-button`).onclick = () => this.setTool(tool));
    this.element('.zoom-button').onclick = () => this.imageEditor.resetZoom();

    // On change to sprite properties, apply immediately
    ['x', 'y', 'w', 'h', 'tw', 'th', 'pal'].forEach(prop => {
      this.element(`.sprite-${prop}`).oninput = () => {
        const value = this.element(`.sprite-${prop}`).value;
        if (prop === 'pal') {
          this.element('.active-palette').value = value;
          return runOperation(makePropertyWriteOperation('sprite', this.selectedItemName, prop, value));
        }
        runOperation(makePropertyWriteOperation('sprite', this.selectedItemName, prop, parseInt(value)));
      };
    });
    this.configureRenamer('sprite', true);
    this.element('.edit-sprite-button').onclick = () => this.onFocusItem(this.imageEditor.getSelectedIndicator());
    this.element('.remove-sprite-button').onclick = this.onRemoveSprite.bind(this);

    this.element('.active-palette').onchange = this.activePaletteChanged.bind(this);
    this.element('.next-palette').onclick = () => this.selectNextPalette(1);
    this.element('.prev-palette').onclick = () => this.selectNextPalette(-1);
    this.element('.create-button').onclick = this.onCreateSprite.bind(this);

    this.setTool('select');
  }

  onFocus() {
    super.onFocus();
    ImageEditorController.updatePaletteList(this.element('.active-palette'));
    ImageEditorController.updatePaletteList(this.element('.sprite-pal'));
    this.activeColor.setColors32(this.currentPaletteArray);
    this.onChangeState(true);
  }

  onPeriodicRender() {
    this.imageEditor.render();
  }

  onChangeState(goingForward) {
    if (!spriteNamed(this.selectedItemName)) this.selectedItemName = null;
    this.updateEditor();
    this.imageEditor.onChangeState(goingForward);
    this.imageEditor.notifyBitmapImageChanged();
  }

  onCopyOrExport(isExport) {
    const {indicator, rect} = this.imageEditor.onCopy();
    const pixels = new Array(rect.width * rect.height);
    const pixels32 = new Array(rect.width * rect.height);
    let i = 0;
    for (let y = rect.y0; y < rect.y1; y++)
      for (let x = rect.x0; x < rect.x1; x++, i++) {
        pixels[i] = spriteBitmap.getPixel(x, y);
        pixels32[i] = this.currentPaletteArray[pixels[i]];
      }
    copyToClipboard('sprite', indicator, rect.width, rect.height, pixels, { width: rect.width, height: rect.height, pixels: pixels32, isExport });
    return {indicator, rect};
  }

  onCut() {
    const { rect, indicator } = this.onCopyOrExport(false);
    runOperation(makeClearRectOperation('sprite', rect));
    if (indicator) runOperation(makeDeleteOperation('sprite', indicator.text));
  }

  onPaste() {
    const item = getClipboardData('sprite');
    if (!item) return;

    this.imageEditor.pasteImage({ ...this.imageEditor.getSuggestedPastePosition(), width: item.width, height: item.height, pixels: item.pixels, indicator: item.indicator });
  }

  onKeyDown(e) {
    if (this.imageEditor.onKeyDown(e)) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'r') this.setTool('rect');
      if (e.key === 'p') this.setTool('pen');
      if (e.key === 'b') this.setTool('bucket');
      if (e.key === 's' || e.key === 'Escape') this.setTool('select');
      if (e.key === 'o') this.setTool('eyedropper');
      if (e.key === 'i') this.imageImportComp.openDialog();
      if (e.key === '2') this.selectNextPalette(1);
      if (e.key === '1') this.selectNextPalette(-1);
      if (e.key === '3') this.activeColor.selectedColorNo = modulus(this.activeColor.selectedColorNo - 1, COLORS_IN_PALETTE);
      if (e.key === '4') this.activeColor.selectedColorNo = modulus(this.activeColor.selectedColorNo + 1, COLORS_IN_PALETTE);
    }
  }

  onResize() {
    this.imageEditor.onResize();
    this.onPeriodicRender();
  }

  // ------------------------------ PRIVATE ---------------------------------
  activePaletteChanged() {
    this.updateEditor();
    this.imageEditor.notifyBitmapImageChanged();
  }

  selectNextPalette(dir) {
    const selector = this.element('.active-palette');
    let selectedIndex = selector.selectedIndex + dir;

    if (selectedIndex < 0) selectedIndex += selector.childNodes.length;
    if (selectedIndex >= selector.childNodes.length) selectedIndex -= selector.childNodes.length;
    selector.selectedIndex = selectedIndex;
    // Not fired automatically on programmatic change
    this.activePaletteChanged();
  }

  onBakePastedImage(image) {
    if (!this.focusedMode) {
      const overlaps = itemsInRect(gameResourceData.sprites, makeRectangleWH(image.x, image.y, image.width, image.height));
      if (overlaps.length > 0 && image.indicator &&
        !confirm(`The position where you are pasting the sprite overlaps with ${overlaps}. Continue?`)) return true;
    }

    runOperation(makeImageWriteOperation('sprite', image, this.imageEditor.visibleArea));
    // Upon paste, create the sprite indicator
    if (image.indicator) runOperation(makeCreateOperation('sprite', image.indicator.text, {...image.indicator}));
  }

  onCreateSprite() {
    const rect = this.imageEditor.getSelectionRectangle();
    if (!rect) return alert('No selection. Please click and drag to select an area.');
    const { x0, y0, x1, y1 } = rect;
    let name = prompt('Sprite name');
    if (!name) return;
    const overlaps = itemsInRect(gameResourceData.sprites, makeRectangle({x0, y0, x1, y1}));
    if (overlaps.length > 0 &&
      !confirm(`Warning: sprite overlaps with ${overlaps}. Please be careful (use zoom) when tracing a selection, being pixel-perfect is important to optimize your sprite sheet.`)) return;
    runOperation(makeCreateOperation('sprite', findValidName(name, gameResourceData.sprites), {
      x: x0,
      y: y0,
      w: x1 - x0,
      h: y1 - y0,
      tw: 0,
      th: 0,
      pal: this.element('.active-palette').value
    }));
    this.setTool('select');
    this.selectedItemName = name;
    this.imageEditor.notifyBitmapImageChanged();
    this.updateEditor();
  }

  onEyeDropper(x, y) {
    this.activeColor.selectedColorNo = spriteBitmap.getPixel(x, y);
  }

  onFocusItem(indicator) {
    this.focusedMode = true;
    this.imageEditor.setVisibleArea(indicator.x, indicator.y, indicator.w, indicator.h);
    this.setTool('rect');
  }

  onImportImage(png, fileName) {
    const palName = this.element('.active-palette').value;
    this.unsetClass('.sprite-import-dialog', 'hidden');
    this.element('.sprite-import-dialog .palette-name').innerHTML = palName;

    this.element('.sprite-import-dialog .button-ok').onclick = () => {
      const { pixels, operation } = importSprite(png.data, palName);
      const image = {
        ...this.imageEditor.getSuggestedPastePosition(),
        width: png.width,
        height: png.height,
        pixels
      };
      runOperation(operation);
      // Create a sprite too in selection mode
      if (!this.focusedMode) {
        image.indicator = { x: 0, y: 0, w: png.width, h: png.height, pal: palName, text: fileName };
      }
      this.imageEditor.pasteImage(image);
      this.setClass('.sprite-import-dialog', 'hidden');
    };
    this.element('.sprite-import-dialog .button-cancel').onclick = () =>
      this.setClass('.sprite-import-dialog', 'hidden');
  }

  onPenWrite(path) {
    runOperation(makePenWriteOperation('sprite', this.imageEditor.onrequestpathcolor(), path));
  }

  onOtherTool(tool, x, y) {
    if (tool === 'bucket') {
      runOperation(makeFloodFillOperation('sprite', x, y, this.imageEditor.onrequestpathcolor(), this.imageEditor.visibleArea));
    }
  }

  onRemoveSprite() {
    showYesNoDialog({
      title: 'Delete sprite',
      text: '<p>Also clear graphics contents beneath sprite?</p><p>Note that you can also use Ctrl+X (cut) for this operation. Paste it (Ctrl+V) afterwards, which can be useful to move the sprite around with its contents.</p>',
      onYes: () => {
        const sprite = spriteNamed(this.selectedItemName);
        runOperation(makeDeleteOperation('sprite', this.selectedItemName));
        runOperation(makeClearRectOperation('sprite', { x0: sprite.x, y0: sprite.y, x1: sprite.x + sprite.w, y1: sprite.y + sprite.h }));
      },
      onNo: () => runOperation(makeDeleteOperation('sprite', this.selectedItemName))
    });
  }

  onSelectItem(indicator) {
    this.selectedItemName = indicator ? indicator.text : null;
    if (this.selectedItemName) this.element('.active-palette').value = indicator.pal;
    this.activePaletteChanged();
  }

  onSwitchedToSecondaryTool(state) {
    this.setTool(state ? 'eyedropper' : 'pen');
  }

  setTool(tool) {
    // Cannot use hidden tool
    if (this.hasClass(`.${tool}-button`, 'hidden') || this.element(`.${tool}-button`).disabled || this.tool === tool) return;
    // Cancel edit mode
    if (tool === 'select' && this.focusedMode) {
      this.focusedMode = false;
      this.imageEditor.resetVisibleArea();
    }
    this.tool = tool;
    this.unsetClass('.toolbar button', 'active');
    this.setClass(`.${this.tool}-button`, 'active');
    this.updateEditor();
  }

  updateEditor() {
    const activePalette = paletteNamed(this.element('.active-palette').value);
    const paletteNo = activePalette ? activePalette.y : 0;
    let panel = 'default';
    this.currentPaletteArray = paletteBitmap.pixels.subarray(paletteNo * 16, paletteNo * 16 + 16);
    this.imageEditor.setTool(this.tool);
    this.imageEditor.setBitmapImage({
      ...spriteBitmap,
      indicators: this.buildIndicatorsArray('sprites')
    });

    if (this.tool !== 'select') {
      this.element('.edit-sprite-label').innerHTML = this.selectedItemName;
      panel = 'edition';
    }
    else if (this.selectedItemName) {
      const sprite = spriteNamed(this.selectedItemName);
      this.element('.sprite-name').value = this.selectedItemName;
      ['x', 'y', 'w', 'h', 'tw', 'th', 'pal'].forEach(prop =>
        this.element(`.sprite-${prop}`).value = sprite[prop] || 0);
      panel = 'detail';
    }

    this.setClass('.sprite-detail-panel', 'hidden', panel !== 'detail');
    this.setClass('.edition-panel', 'hidden', panel !== 'edition');
    this.setClass('.default-panel', 'hidden', panel !== 'default');
    //this.setClass('.palette-color-selector', 'hidden', !['pen', 'eyedropper', 'bucket'].includes(this.tool));
    this.element('.bucket-button').disabled = !this.focusedMode;
    this.element('.create-button').disabled = this.tool !== 'rect';
    this.activeColor.setColors32(this.currentPaletteArray);
  }
}
