import {Component} from "../component";
import {makeCssColor32, setClass} from "../page-utils";

export class PaletteColorSelector extends Component {
  constructor(itemClassName) {
    super(itemClassName);
    this.selectedColorNo = 1;
    this.elements('.color-square').forEach((node, index) =>
      node.onclick = () => this._clickedOnNode(index));
  }

  get selectedColorNo() {
    return this._selectedColorNo;
  }

  set selectedColorNo(colorNo) {
    this._selectedColorNo = colorNo;
    this.elements('.color-square').forEach((node, index) => setClass(node, 'active', index === colorNo));
  }

  setColors32(colors) {
    this.elements('.color-square').forEach((node, index) => index > 0 &&
      (node.style.backgroundColor = makeCssColor32(colors[index] | 0xff000000)));
  }

  _clickedOnNode(index) {
    this.selectedColorNo = index;
  }
}
