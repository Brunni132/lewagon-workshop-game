import {element, setClass, unsetClass} from "../page-utils";

export function showYesNoDialog({ title = 'Confirm', text = 'Question', onYes, onNo, onCancel }) {
  const callbacks = [onYes, onNo, onCancel];
  unsetClass('.yesno-dialog', 'hidden');
  element('.yesno-dialog .title').innerHTML = title;
  element('.yesno-dialog .text').innerHTML = text;
  ['yes', 'no', 'cancel'].forEach((btn, index) => {
    element(`.yesno-dialog .button-${btn}`).onclick = () => {
      setClass('.yesno-dialog', 'hidden');
      if (callbacks[index]) callbacks[index]();
    };
  });
}
