import {element, elements, setClass, unsetClass} from "./page-utils";


export class Component {
  constructor(itemSelector) {
    this.itemSelector = itemSelector;
  }

  addTextInputModifListener(selector, fn) {
    this.elements(selector).forEach(element => {
      element.onblur = fn;
      element.onkeydown = e => {
        if (e.keyCode === 13) {
          e.preventDefault();
          fn();
          return false;
        }
      };
    });
  }
  element(name) {
    return name ? element(`${this.itemSelector} ${name}`) : element(this.itemSelector);
  }
  elements(name) {
    return elements(`${this.itemSelector} ${name}`);
  }
  hasClass(name, className) {
    return this.element(name).classList.contains(className);
  }
  setClass(name, className, condition = true) {
    setClass(`${this.itemSelector} ${name}`, className, condition);
  }
  unsetClass(name, className) {
    unsetClass(`${this.itemSelector} ${name}`, className);
  }
}
