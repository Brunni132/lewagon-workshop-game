import {Controller} from "../controller";
import {gameCode, postGameCode} from "../api";
import {saveGame} from "../editor-main";

export class CodeController extends Controller {
  constructor() {
    super('code');
  }

  // ------------------------------ PRIVATE ---------------------------------
  addTabSupportToTextArea(textarea) {
    textarea.onkeydown = function(e){
      if (e.keyCode === 9){
        e.preventDefault();
        const s = this.selectionStart;
        this.value = this.value.substring(0, this.selectionStart) + '\t' + this.value.substring(this.selectionEnd);
        this.selectionEnd = s + 1;
      }
    }
  }

  getCodeBox() {
    return this.element('#code-box');
  }

  async saveCode() {
    const code = this.getCodeBox().value;
    if (!code || this.initialCode === code) return;
    this.initialCode = code;
    await postGameCode(code);
  }

  // ------------------------------ OVERRIDE ---------------------------------
  async onLoad() {
    this.addTabSupportToTextArea(this.getCodeBox());
    this.element('.save-button').onclick = saveGame;
    this.getCodeBox().value = gameCode;
    this.initialCode = gameCode;
  }

  onFocus() {
    super.onFocus();
    this.getCodeBox().focus();
  }

  async willSaveTheGame() {
    await this.saveCode();
  }
}

