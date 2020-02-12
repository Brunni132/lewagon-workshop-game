import {Component} from "../component";
import {element, hasClass, setClass, updateListCombo} from "../page-utils";
import {mapNamed, spriteNamed} from "../api";
import {modulus} from "../math-utils";

export class PlaneListComponent extends Component {
  constructor(itemSelector) {
    super(itemSelector);

    this.baseHtmlForPlane = this.element('.plane').innerHTML;
    this.element('.plane-add').onclick = this.onAddPlaneButton.bind(this);

    // Can access publicly: [{ name, visible }] of configured planes
    this.clearPlanes();
    this.onplanelistchange = null;
    this.onactiveplanechange = null;
  }

  clearPlanes() {
    this.elements('.plane').forEach(e => e.remove());
    this.planeList = [];
    this.activePlane = 0;
  }

  addPlane(name) {
    const planeIndex = this.planeList.length;
    this.planeList.push({ name, visible: true });

    const div = document.createElement('div');
    div.innerHTML = this.baseHtmlForPlane;
    setClass(div, 'plane');
    setClass(div, 'active');
    div.querySelector('.name').innerHTML = name;
    this.element().insertBefore(div, this.element('.plane-add'));

    div.onmousedown = e => {
      const hover = e.target === div || e.target === div.querySelector('.name');
      setClass(div, 'hover', hover);
    };
    div.onmouseup = () => {
      if (hasClass(div, 'hover')) {
        setClass(div, 'hover', false);
        this.changeActivePlane(planeIndex);
      }
    };
    div.onmouseout = () => setClass(div, 'hover', false);

    // Bind events to toggle visibility of plane
    div.querySelector('.visible-button').onclick = () => {
      const i = div.querySelector('.visible-button i');
      this.planeList[planeIndex].visible = !this.planeList[planeIndex].visible;
      setClass(i, 'fa-eye', this.planeList[planeIndex].visible);
      setClass(i, 'fa-eye-slash', !this.planeList[planeIndex].visible);
      this.onplanelistchange && this.onplanelistchange();
    };
    this.onplanelistchange && this.onplanelistchange();
    this.changeActivePlane(planeIndex);
  }

  selectNextPlane(direction) {
    this.changeActivePlane(modulus(this.activePlane + direction, this.planeList.length));
  }

  onAddPlaneButton() {
    this.unsetClass('.plane-add-dialog', 'hidden');
    updateListCombo(element('.plane-add-dialog .map-list'), 'maps');

    this.element('.plane-add-dialog .button-ok').onclick = () => {
      const name = element('.plane-add-dialog .map-list').value;
      if (this.planeList.find(p => p.name === name)) return alert('Plane already added');

      // Check that the plane has the same dimensions
      const map = mapNamed(name);
      const tileset = spriteNamed(map.til);
      const tilesetOfBaseMap = spriteNamed(mapNamed(this.planeList[0].name).til);
      if (map.type === 'map' && (tileset.tw !== tilesetOfBaseMap.tw || tileset.th !== tilesetOfBaseMap.th)) {
        return alert(`Multiple tilemaps need to have the same tile size (base has ${tilesetOfBaseMap.tw}x${tilesetOfBaseMap.th}, this one has ${tileset.tw}x${tileset.th})`);
      }

      this.addPlane(name);
      this.setClass('.plane-add-dialog', 'hidden');
    };
    this.element('.plane-add-dialog .button-cancel').onclick = () =>
      this.setClass('.plane-add-dialog', 'hidden');
  }

  changeActivePlane(planeIndex) {
    this.elements('.plane').forEach((e, index) => {
      setClass(e, 'active', index === planeIndex);
    });
    this.activePlane = planeIndex;
    this.onactiveplanechange && this.onactiveplanechange();
  }
}

