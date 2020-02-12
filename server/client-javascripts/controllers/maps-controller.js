import {
  drawTile32,
  findValidName,
  gameResourceData,
  itemsInRect,
  makeClearRectOperation,
  makeCreateOperation,
  makeDeleteOperation,
  makeImageWriteOperation,
  makeObjectChangeOperation,
  makePropertyWriteOperation,
  mapBitmap,
  mapNamed, paletteNamed,
  paletteSubarrayFromPaletteName,
  runOperation,
  spriteNamed
} from "../api";
import {ImageEditorComponent} from "../components/image-editor-component";
import {ImageImportComponent} from "../components/image-import-component";
import {ImageEditorController} from "./image-editor-controller";
import {TileSelectorComponent} from "../components/tile-selector-component";
import {copyObjectsToClipboard, copyToClipboard, getClipboardData} from "../clipboard";
import {CanvasImageData} from "../canvas-image-data";
import {showYesNoDialog} from "../components/yesno-dialog-component";
import {PlaneListComponent} from "../components/plane-list-component";
import {makeRectangle, makeRectangleWH, range} from "../math-utils";
import {importMap} from "../graphics-import";

export class MapsController extends ImageEditorController {
  constructor() {
    super('maps');
    this.tool = null;
    this.focusedMode = false;
    this.selectedItemName = null;
  }

  // ------------------------------ OVERRIDE ---------------------------------
  async onLoad() {
    await super.onLoad();
    this.imageEditor = new ImageEditorComponent(this.element('.map-editor'), this.itemSelector);
    this.imageEditor.onselectitem = this.onSelectItem.bind(this);
    this.imageEditor.onedititem = this.onFocusItem.bind(this);
    this.imageEditor.oncloner = this.onCloner.bind(this);
    this.imageEditor.onswitchtosecondarytool = this.onSwitchedToSecondaryTool.bind(this);
    this.imageEditor.onbakepastedimage = this.onBakePastedImage.bind(this);
    this.imageEditor.onrequestpathcolor = () => this.activeColor.selectedColorNo;
    this.imageEditor.onbrushpasted = this.onBrushPasted.bind(this);
    this.imageEditor.onmovetool = this.onMoveTool.bind(this);
    this.imageEditor.onmoveselect = this.onMoveSelect.bind(this);
    this.imageEditor.onplacetool = this.onPlaceTool.bind(this);
    this.imageEditor.onResize();

    this.imageImportComp = new ImageImportComponent('#maps-body .toolbar');
    this.imageImportComp.onfileloaded = this.onImportImage.bind(this);

    this.tileSelector = new TileSelectorComponent(this.element('.tile-selector canvas'), '.tile-selector');
    this.tileSelector.allowMultiSelection = true;
    this.tileSelector.onselect = this.onTileSelected.bind(this);

    this.brushBitmap = new CanvasImageData(this.imageEditor.context, 0, 0);
    this.imageEditor.brushBitmap = this.brushBitmap;
    this.brushContents = null;

    // Used in object mode
    this.objList = null;
    this.selectedIndices = [];

    // Used in focused mode
    this.planeSelector = new PlaneListComponent('.plane-list');
    this.planeSelector.onplanelistchange = this.onChangeState.bind(this);
    this.planeSelector.onactiveplanechange = this.onChangeActivePlane.bind(this);

    ['select', 'rect', 'brush', 'cloner', 'move', 'place'].forEach(tool =>
      this.element(`.${tool}-button`).onclick = () => this.setTool(tool));
    this.element('.zoom-button').onclick = () => this.imageEditor.resetZoom();

    // On change to map properties, apply immediately
    ['x', 'y', 'w', 'h', 'til', 'pal', 'type'].forEach(prop => {
      this.element(`.map-${prop}`).oninput = () => {
        let value = this.element(`.map-${prop}`).value;
        if (!['pal', 'til', 'type'].includes(prop)) {
          value = parseInt(value);
        }
        runOperation(makePropertyWriteOperation('map', this.selectedItemName, prop, value));
        // On change tileset, choose the appropriate map automatically
        if (prop === 'til') {
          const pal = spriteNamed(value).pal;
          runOperation(makePropertyWriteOperation('map', this.selectedItemName, 'pal', pal));
        }
      };
    });
    this.configureRenamer('map', false);
    this.element('.edit-map-button').onclick = () => this.onFocusItem(this.imageEditor.getSelectedIndicator());
    this.element('.remove-map-button').onclick = this.onRemoveMap.bind(this);
    this.element('.create-button').onclick = this.onCreateMap.bind(this);
    this.element('.obj-properties').onblur = this.doUpdateObjectProperties.bind(this);

    this.setTool('select');
  }

  onFocus() {
    super.onFocus();
    ImageEditorController.updateTilesetList(this.element('.map-til'));
    ImageEditorController.updatePaletteList(this.element('.map-pal'));
    this.onChangeState(true);
  }

  onPeriodicRender() {
    this.imageEditor.render();
    if (this.focusedMode) this.tileSelector.render();
  }

  onChangeState(goingForward) {
    if (!mapNamed(this.selectedItemName)) this.selectedItemName = null;
    this.updateEditor();
    // Clear cached object list
    if (this.focusedMode) {
      this.objList = this.getPlaneInfo(this.activePlane).objectList;
    }
    this.imageEditor.onChangeState(goingForward);
    this.imageEditor.notifyBitmapImageChanged();
    this.tileSelector.notifyBitmapImageChanged();
    this.updateBrushRender();
  }

  onCopyOrExport(isExport) {
    // Object mode
    if (this.objList) {
      if (!this.selectedIndices.length) return [];
      copyObjectsToClipboard(this.selectedIndices.map(i => this.objList[i]));
      return this.selectedIndices;
    }

    // Map (overview) mode
    const {indicator, rect} = this.imageEditor.onCopy();
    const pixels = new Array(rect.width * rect.height);
    let i = 0;
    for (let y = rect.y0; y < rect.y1; y++)
      for (let x = rect.x0; x < rect.x1; x++, i++)
        pixels[i] = mapBitmap.getPixel(x, y);

    const englobingIndicators = this.imageEditor.indicatorsInRect(rect);
    if (englobingIndicators.length === 1) {
      const { tileset, paletteArray } = this.getPlaneInfo(englobingIndicators[0].text);
      const clipboardBitmap = new CanvasImageData(this.imageEditor.context, rect.width * tileset.tw, rect.height * tileset.th);
      for (let y = rect.y0; y < rect.y1; y++)
        for (let x = rect.x0; x < rect.x1; x++)
          drawTile32(clipboardBitmap, (x - rect.x0) * tileset.tw, (y - rect.y0) * tileset.th, paletteArray, tileset, mapBitmap.getPixel(x, y));
      copyToClipboard('map', indicator, rect.width, rect.height, pixels, { width: clipboardBitmap.width, height: clipboardBitmap.height, pixels: clipboardBitmap.color32, isExport });
    } else {
      copyToClipboard('map', indicator, rect.width, rect.height, pixels);
    }
    return {indicator, rect};
  }

  onCut() {
    // Object mode
    if (this.objList) {
      if (!this.selectedIndices.length) return;
      const copiedIndices = this.onCopyOrExport(false);
      copiedIndices.sort().reverse().forEach(i => this.objList.splice(i, 1));
      runOperation(makeObjectChangeOperation(this.getPlaneInfo(this.activePlane).mapName, this.objList));
      return;
    }

    // Map (overview) mode
    const { rect, indicator } = this.onCopyOrExport(false);
    runOperation(makeClearRectOperation('map', rect));
    if (indicator) runOperation(makeDeleteOperation('map', indicator.text));
  }

  onPaste() {
    // Object mode
    if (this.objList) {
      const item = getClipboardData('object');
      if (!item) return;

      const initialIndex = this.objList.length;
      this.objList = this.objList.concat(item.objects.map(o => this.findAcceptablePlaceForObject(o)));
      runOperation(makeObjectChangeOperation(this.getPlaneInfo(this.activePlane).mapName, this.objList));
      this.selectedIndices = range(initialIndex, this.objList.length);
      this.updateEditor();
      return;
    }

    const item = getClipboardData('map');
    if (!item) return;
    this.imageEditor.pasteImage({ ...this.imageEditor.getSuggestedPastePosition(), width: item.width, height: item.height, pixels: item.pixels, indicator: item.indicator });
  }

  // Avoid objects overlapping each other when pasted, etc.
  findAcceptablePlaceForObject(obj) {
    while (this.objList.find(o => obj.x === o.x && obj.y === o.y)) {
      obj.x += 3;
      obj.y += 3;
    }
    return obj;
  }

  onBakePastedImage(image) {
    const overlaps = itemsInRect(gameResourceData.maps, makeRectangleWH(image.x, image.y, image.width, image.height));
    if (overlaps.length > 0 && image.indicator &&
      !confirm(`The position where you are pasting the map overlaps with ${overlaps}. If two maps overlap, editing one will inadvertently replace part of the other.`)) return true;

    runOperation(makeImageWriteOperation('map', image, this.imageEditor.visibleArea));
    // Upon paste, create the map indicator
    if (image.indicator) runOperation(makeCreateOperation('map', image.indicator.text, {...image.indicator}));
  }

  onKeyDown(e) {
    if (this.imageEditor.onKeyDown(e)) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const type = this.focusedMode ? this.getPlaneInfo(this.activePlane).type : 'none';
      if (e.key === 'r' && type === 'none') this.setTool('rect');
      if (e.key === 'r' && type === 'object') this.setTool('move');
      if (e.key === 'p' && type === 'object') this.setTool('place');
      if (e.key === 'p' && type === 'map') this.setTool('brush');
      if (e.key === 'o') this.setTool('cloner');
      if (e.key === 's' || e.key === 'Escape') this.setTool('select');
      if (e.key === 'i') this.imageImportComp.openDialog();
      if (e.key === '1') this.tileSelector.selectNextTile(-1);
      if (e.key === '2') this.tileSelector.selectNextTile(1);
      if (e.key === '3') this.tileSelector.selectNextPalette(-1);
      if (e.key === '4') this.tileSelector.selectNextPalette(1);
      if (e.key === '5') this.planeSelector.selectNextPlane(-1);
      if (e.key === '6') this.planeSelector.selectNextPlane(1);
    }
  }

  onResize() {
    this.imageEditor.onResize();
    this.onPeriodicRender();
  }

  // ------------------------------ PRIVATE ---------------------------------
  clearBrush() {
    this.brushContents = null;
    this.brushBitmap.setSize(0, 0);
  }

  copyMapDataToBrush(width, height, cells) {
    this.brushContents = { type: 'map', width, height, cells };

    const { tileset, paletteArray } = this.getPlaneInfo(this.activePlane);
    let cell = 0;
    this.brushBitmap.setSize(this.imageEditor.context, width * tileset.tw, height * tileset.th);
    for (let j = 0; j < height; j++)
      for (let i = 0; i < width; i++, cell++)
        drawTile32(this.brushBitmap, i * tileset.tw, j * tileset.th, paletteArray, tileset, cells[cell]);
  }

  updateBrushRender() {
    if (this.brushContents) this.copyMapDataToBrush(this.brushContents.width, this.brushContents.height, this.brushContents.cells);
  }

  onBrushPasted(x, y) {
    if (!this.brushContents) return;
    const image = {
      x, y,
      width: this.brushContents.width,
      height: this.brushContents.height,
      pixels: this.brushContents.cells
    };
    runOperation(makeImageWriteOperation('map', image, this.imageEditor.visibleArea));
  }

  get activePlane() { return this.planeSelector.activePlane; }
  get planeList() { return this.planeSelector.planeList; }

  onChangeActivePlane() {
    const { objectList, map, type } = this.getPlaneInfo(this.activePlane);
    if (type === 'map') this.imageEditor.setVisibleArea(map.x, map.y, map.w, map.h, false, true);
    else {
      // In object-mode, place the viewport always at (0,0) to avoid offset with positioning inside the imageEditor
      const mainMap = this.getPlaneInfo(0).map;
      this.imageEditor.setVisibleArea(0, 0, mainMap.w, mainMap.h, false, true);
    }
    this.objList = objectList;
    this.clearBrush();
    this.selectedIndices = [];
    this.imageEditor.notifyBitmapImageChanged();
    this.tileSelector.notifyBitmapImageChanged();
    this.updateEditor();
    this.setTool(type === 'object' ? 'move' : 'brush');
  }

  getPlaneInfo(planeNoOrName) {
    const self = this;
    if (typeof planeNoOrName === 'number') {
      planeNoOrName = this.planeList[planeNoOrName].name;
    }
    const map = mapNamed(planeNoOrName);
    return {
      mapName: planeNoOrName,
      map: map.type === 'map' ? map : null,
      type: map.type,
      tilesetName: map.til,
      paletteName: map.pal,
      get tileset() { return spriteNamed(map.til); },
      get paletteArray() { return paletteSubarrayFromPaletteName(map.pal); },
      get objectList() { return self.getObjectList(planeNoOrName); }
    };
  }

  // TODO Florian -- cache
  getObjectList(name) {
    const map = mapNamed(name);
    if (map.type !== 'object') return null;
    return mapBitmap.getObjectJSON(map.x, map.y, map.w, map.h);
  }

  onFocusItem(indicator) {
    const { type, til, pal } = mapNamed(this.selectedItemName);
    if (type !== 'map') {
      return alert('Unable to edit an object list directly. These are meant to be used in combination with a tilemap. Double-click on a map, then from the plane list, add this object list.');
    }
    if (!spriteNamed(til) || !paletteNamed(pal)) {
      return alert('Please check that a tileset and palette have been properly assigned to this map');
    }
    const { tw, th } = spriteNamed(til);
    if (!tw || !th) {
      return alert(`The sprite ${til} is not a tileset. Go to SPRITES, select ${til} and set its TW/TH to the appropriate tile size.`);
    }
    this.focusedMode = true;
    this.planeSelector.clearPlanes();
    this.planeSelector.addPlane(this.selectedItemName);
    // Needs to be done later because the computation uses pixelW/pixelH which are set by updateEditor (called as a side-effect of addPlane)
    this.imageEditor.setVisibleArea(indicator.x, indicator.y, indicator.w, indicator.h);
  }

  onSelectItem(indicator) {
    this.selectedItemName = indicator ? indicator.text : null;
    this.updateEditor();
  }

  onMoveTool(indicatorIndices, moveX, moveY) {
    indicatorIndices.forEach(i => {
      this.objList[i].x = Math.round(this.objList[i].x + moveX);
      this.objList[i].y = Math.round(this.objList[i].y + moveY);
    });
    runOperation(makeObjectChangeOperation(this.getPlaneInfo(this.activePlane).mapName, this.objList));
  }

  onMoveSelect(indicatorIndices) {
    this.selectedIndices = indicatorIndices;
    this.updateEditor();
  }

  onPlaceTool(x, y) {
    const id = this.tileSelector.getSingleTileSelectedIfAny();
    if (id < 0) return;
    this.objList.push({ id, x, y });
    runOperation(makeObjectChangeOperation(this.getPlaneInfo(this.activePlane).mapName, this.objList));
  }

  onCloner(rect) {
    if (rect.width === 1 && rect.height === 1) {
      this.tileSelector.selectTile(mapBitmap.getPixel(rect.x0, rect.y0));
    } else {
      this.tileSelector.deselectTile();
    }

    const cells = new Array(rect.width * rect.height);
    let cell = 0;
      for (let j = 0; j < rect.height; j++)
        for (let i = 0; i < rect.width; i++, cell++)
          cells[cell] = mapBitmap.getPixel(rect.x0 + i, rect.y0 + j);
    this.copyMapDataToBrush(rect.width, rect.height, cells);
  }

  onTileSelected(width, height, cells) {
    if (this.getPlaneInfo(this.activePlane).type === 'map') {
      this.copyMapDataToBrush(width, height, cells);
    } else {
      this.setTool('place');
      this.copyMapDataToBrush(width, height, cells);
    }
  }

  onImportImage(png, fileName) {
    this.unsetClass('.map-import-dialog', 'hidden');
    ImageEditorController.updateTilesetList(this.element('.map-import-dialog .tileset'));

    this.element('.map-import-dialog .button-ok').onclick = () => {
      const { pixels, operations, width, height, pal, til, error } = importMap(png, this.element('.map-import-dialog .tileset').value);
      if (error) return alert(error);
      const image = {
        ...this.imageEditor.getSuggestedPastePosition(),
        width, height, pixels
      };
      runOperation(operations);
      // Create a map too in selection mode
      if (!this.focusedMode) {
        image.indicator = { x: 0, y: 0, w: width, h: height, type: 'map', pal, til, text: fileName };
      }
      this.imageEditor.pasteImage(image);
      this.setClass('.map-import-dialog', 'hidden');
    };
    this.element('.map-import-dialog .button-cancel').onclick = () =>
      this.setClass('.map-import-dialog', 'hidden');
  }

  onSwitchedToSecondaryTool(state) {
    this.setTool(state ? 'cloner' : 'brush');
  }

  onCreateMap() {
    const rect = this.imageEditor.getSelectionRectangle();
    const firstPalette = Object.keys(gameResourceData.pals)[0],  firstTileset = Object.keys(gameResourceData.sprites)[0];
    if (!rect) return alert('No selection. Please click and drag to select an area.');
    if (!firstPalette || !firstTileset) return alert('You need palette and/or tilesets (sprites with non-zero TW/TH for tile width/height) first');
    const { x0, y0, x1, y1 } = rect;
    let name = prompt('Map name');
    if (!name) return;
    const overlaps = itemsInRect(gameResourceData.maps, makeRectangle({x0, y0, x1, y1}));
    if (overlaps.length > 0 &&
      !confirm(`Warning: map overlaps with ${overlaps}. If you choose to create the map anyway, please adjust the position by playing with X/Y to avoid this situation. When maps overlap, editing one will inadvertently overwrite the contents of the other map.`)) return;
    runOperation(makeCreateOperation('map', findValidName(name, gameResourceData.maps), {
      x: x0,
      y: y0,
      w: x1 - x0,
      h: y1 - y0,
      til: firstTileset,
      pal: firstPalette,
      type: 'map'
    }));
    this.setTool('select');
    this.selectedItemName = name;
    this.imageEditor.notifyBitmapImageChanged();
    this.updateEditor();

    alert('Map created. Please check the parameters, such as the tileset, the palette and type.');
  }

  onRemoveMap() {
    showYesNoDialog({
      title: 'Delete map',
      text: '<p>Also clear graphics contents beneath map?</p><p>Note that you can also use Ctrl+X (cut) for this operation. Paste it (Ctrl+V) afterwards, which can be useful to move the map around with its contents.</p>',
      onYes: () => {
        const map = mapNamed(this.selectedItemName);
        runOperation(makeDeleteOperation('map', this.selectedItemName));
        runOperation(makeClearRectOperation('map', { x0: map.x, y0: map.y, x1: map.x + map.w, y1: map.y + map.h }));
      },
      onNo: () => runOperation(makeDeleteOperation('map', this.selectedItemName))
    });
  }

  setTool(tool) {
    // Cannot use hidden tool
    if (this.hasClass(`.${tool}-button`, 'hidden') || this.tool === tool) return;
    // Cancel edit mode
    const cancelEditMode = (tool === 'select' && this.focusedMode);
    if (cancelEditMode) this.focusedMode = false;
    if (!['place', 'brush', 'clone'].includes(tool)) {
      this.tileSelector.deselectTile();
      this.clearBrush();
    }
    if (tool !== 'move') {
      this.selectedIndices = [];
    }
    this.tool = tool;
    this.unsetClass('.toolbar button', 'active');
    this.setClass(`.${this.tool}-button`, 'active');
    this.updateEditor();
    // Needs to be done later because the computation uses pixelW/pixelH which are set by updateEditor
    if (cancelEditMode) this.imageEditor.resetVisibleArea();
  }

  getCommonPropertiesForObjects(objects) {
    const result = Object.assign({}, objects[0]);
    for (let i = 1; i < objects.length; i++) {
      Object.keys(result).forEach(p => {
        if (result[p] !== objects[i][p]) delete result[p];
      });
    }
    return result;
  }

  doUpdateObjectProperties() {
    try {
      const json = JSON.parse(this.element('.obj-properties').value);
      if (Array.isArray(json)) {
        return alert('Please provide an object with property => new value to assign to all selected objects.');
      }
      this.selectedIndices.map(p => this.objList[p]).forEach(o =>
        Object.assign(o, json));
      runOperation(makeObjectChangeOperation(this.getPlaneInfo(this.activePlane).mapName, this.objList));
    } catch (e) {
      alert(`Failed to parse your JSON. Check the syntax. Message: ${e}`);
    }
  }

  buildIndicatorsArray() {
    if (!this.focusedMode) return super.buildIndicatorsArray('maps');

    const { type, tileset, objectList } = this.getPlaneInfo(this.activePlane);
    if (type === 'map') return super.buildIndicatorsArray('maps');

    return objectList.map((obj, index) => ({
      x: obj.x / this.imageEditor.pixelW,
      y: obj.y / this.imageEditor.pixelH,
      w: tileset.tw / this.imageEditor.pixelW,
      h: tileset.th / this.imageEditor.pixelH,
      highlighted: this.selectedIndices.includes(index),
      indType: 'object'
    }));
  }

  updateEditor() {
    let panel = 'default';
    const map = mapNamed(this.selectedItemName);
    let pixelsPerPixelW = 1, pixelsPerPixelH = 1;
    let isEditableMap = this.focusedMode, isEditableObjectPlane = this.focusedMode;

    if (this.focusedMode) {
      const { type, tilesetName, paletteName } = this.getPlaneInfo(this.activePlane);
      const basePlane = this.getPlaneInfo(0);
      if (basePlane.type !== 'map') return console.error('Non-map plane as first plane not supported');
      // Maps use the standard editor and considers that each map cell is one pixel (because each map cell is just one pixel in the mapBitmap, like the palette and sprite bitmaps). The editor supports a final scale, so that you can render in a bigger image, which will be scaled down. We use that to draw to an image that is TW/TH times bigger than the number of pixels (map cells), and instead of rendering a single pixel, we render a tile.
      pixelsPerPixelW = basePlane.tileset.tw;
      pixelsPerPixelH = basePlane.tileset.th;
      isEditableMap = type === 'map';
      isEditableObjectPlane = type === 'object';
      this.tileSelector.setTileset(tilesetName, paletteName);
      this.tileSelector.allowMultiSelection = isEditableMap;
      this.imageEditor.ondrawimage = this.drawImage.bind(this);

      this.element('.tile-no-label', isEditableMap ? 'Tile number' : 'Tile ID');
      this.setClass('.tile-no-row', 'hidden', this.selectedIndices.length > 0);
      this.setClass('.pal-offset-row', 'hidden', !isEditableMap);
      this.setClass('.obj-props-row', 'hidden', this.selectedIndices.length === 0);
    } else {
      // Overworld (draw with red/green/blue scale)
      this.imageEditor.ondrawimage = null;
      this.imageEditor.ondrawpixel = (cacheBitmap, x, y, pixel) =>
        cacheBitmap.setPixel(x, y, (pixel & 0xf) << 4 | (pixel >> 4 & 0x1f) << 11 | (pixel >> 9 & 0xf) << 20 | 0xff000000);
    }

    this.imageEditor.setTool(this.tool);
    this.imageEditor.setBitmapImage({
      ...mapBitmap,
      indicators: this.buildIndicatorsArray(),
      pixelsPerPixelW, pixelsPerPixelH
    });

    if (this.tool !== 'select' && this.focusedMode) {
      this.element('.edit-map-label').innerHTML = this.selectedItemName;
      panel = 'edition';
      this.setClass('.tile-selector', 'hidden', !this.focusedMode);
    }
    else if (this.selectedItemName) {
      this.element('.map-name').value = this.selectedItemName;
      ['x', 'y', 'w', 'h', 'til', 'pal', 'type'].forEach(prop =>
        this.element(`.map-${prop}`).value = map[prop] || 0);
      panel = 'detail';
    }

    if (this.selectedIndices.length > 0) {
      const props = this.getCommonPropertiesForObjects(this.selectedIndices.map(i => this.objList[i]));
      this.element('.obj-properties').value = JSON.stringify(props);
    }

    this.setClass('.map-detail-panel', 'hidden', panel !== 'detail');
    this.setClass('.edition-panel', 'hidden', panel !== 'edition');
    this.setClass('.default-panel', 'hidden', panel !== 'default');
    this.setClass('.palette-color-selector', 'hidden', !['pen', 'eyedropper', 'bucket'].includes(this.tool));
    this.element('.create-button').disabled = this.tool !== 'rect';
    ['create', 'rect', 'import'].forEach(btn =>
      this.setClass(`.${btn}-button`, 'hidden', this.focusedMode));
    ['brush', 'cloner'].forEach(btn =>
      this.setClass(`.${btn}-button`, 'hidden', !isEditableMap));
    ['move', 'place'].forEach(btn =>
      this.setClass(`.${btn}-button`, 'hidden', !isEditableObjectPlane));
  }

  drawImage(cacheBitmap, visibleArea) {
    const renderPlane = (plane, index) => {
      const {type, tileset, paletteArray, map, objectList} = this.getPlaneInfo(index);
      if (type === 'map') {
        let xPos = 0, yPos = 0;
        // Normal planes
        for (let y = 0; y < visibleArea.height && y < map.h; y++) {
          for (let x = 0; x < visibleArea.width && x < map.w; x++) {
            drawTile32(cacheBitmap, xPos, yPos, paletteArray, tileset, mapBitmap.getPixel(map.x + x, map.y + y), true);
            xPos += tileset.tw;
          }
          yPos += tileset.th;
          xPos = 0;
        }
      } else {
        // Object planes
        objectList.forEach(obj => drawTile32(cacheBitmap, obj.x, obj.y, paletteArray, tileset, obj.id, true));
      }
    };

    // Render all background planes first
    this.planeList.forEach((plane, index) => {
      if (index !== this.activePlane && plane.visible) renderPlane(plane, index);
    });
    renderPlane(this.planeList[this.activePlane], this.activePlane);
    return [{ bitmap: cacheBitmap, opacity: 1 }];
  }

  //drawTile(tileset, palette, cacheBitmap, x, y, pixel) {
  //	drawTile32(cacheBitmap, x * tileset.tw, y * tileset.th, palette, tileset, pixel);
  //}
}
