import {Component} from "../component";

export class ColorSelectorComponent extends Component {
  constructor(itemClassName) {
    super(itemClassName);
    this.colorComp = [0, 0, 0];

    this.element('.red').oninput = this.updateFromR.bind(this);
    this.element('.green').oninput = this.updateFromG.bind(this);
    this.element('.blue').oninput = this.updateFromB.bind(this);
    this.addTextInputModifListener('.hex', this.updateFromHex.bind(this));
    this.updateUI(true, true);
  }

  add12(...comps) {
    for (let i = 0; i < 3; i++)
      this.colorComp[i] = Math.max(0, Math.min(15, this.colorComp[i] + comps[i]));
    this.updateUI();
  }

  getColor32() {
    return this.colorComp[0] | this.colorComp[0] << 4
      | this.colorComp[1] << 8 | this.colorComp[1] << 12
      | this.colorComp[2] << 16 | this.colorComp[2] << 20
      | 0xff << 24;
  }

  setColor32(color) {
    this.colorComp = [color >> 4 & 0xf, color >> 12 & 0xf, color >> 20 & 0xf];
    this.updateUI();
  }

  updateFromR() {
    this.colorComp[0] = this.element('.red').value | 0;
    this.updateUI(false, true);
  }

  updateFromG() {
    this.colorComp[1] = this.element('.green').value | 0;
    this.updateUI(false, true);
  }

  updateFromB() {
    this.colorComp[2] = this.element('.blue').value | 0;
    this.updateUI(false, true);
  }

  updateFromHex() {
    try {
      const color = parseInt(this.element('.hex').value, 16);
      this.colorComp = [color >> 8 & 0xf, color >> 4 & 0xf, color & 0xf];
      this.updateUI(true, false);
    } catch (e) {
      console.log('Invalid color');
    }
  }

  updateUI(rgb = true, hex = true) {
    if (rgb) {
      this.element('.red').value = this.colorComp[0];
      this.element('.green').value = this.colorComp[1];
      this.element('.blue').value = this.colorComp[2];
    }
    const hexStr = this.colorComp[0].toString(16) + this.colorComp[1].toString(16) + this.colorComp[2].toString(16);
    if (hex) this.element('.hex').value = this.colorComp[0].toString(16) + this.colorComp[1].toString(16) + this.colorComp[2].toString(16);
    this.element('.color-preview').style.background = `#${hexStr}`;
  }
}
