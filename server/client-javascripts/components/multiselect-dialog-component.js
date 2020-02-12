import {element, setClass, unsetClass} from "../page-utils";

export function showMultiSelectDialog(indicatorList, onSelect) {
  const el = element('.multiselect-dialog .item-list');
  const list = indicatorList.map(i =>
    i.text ? i.text : JSON.stringify(i));
  for (let i = el.options.length - 1; i >= 0; i--) el.remove(i);
  for (const text of list) {
    const opt = document.createElement('option');
    opt.value = text;
    opt.innerHTML = text;
    el.appendChild(opt);
  }
  unsetClass('.multiselect-dialog', 'hidden');
  element('.multiselect-dialog .button-select').onclick = () => {
    setClass('.multiselect-dialog', 'hidden');
    onSelect(el.selectedIndex);
  };
  element('.multiselect-dialog .button-cancel').onclick = () => {
    setClass('.multiselect-dialog', 'hidden');
  };
}
