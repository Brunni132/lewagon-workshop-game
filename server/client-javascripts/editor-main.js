import {CodeController} from "./controllers/code-controller";
import {PalettesController} from "./controllers/palettes-controller";
import {SpritesController} from "./controllers/sprites-controller";
import {MapsController} from "./controllers/maps-controller";
import {element, elements, isInputComponent, isMac, setClass, unsetClass} from "./page-utils";
import {registerTooltip} from "./components/tooltip";
import {
	editorConfig, fetchEditorConfig, saveEditorConfig,
	saveGameResources,
	updateGameCode,
	updateGameResourceData,
	updateMapBitmap,
	updatePaletteBitmap,
	updateSpriteBitmap
} from "./api";
import {setStatusText} from "./controller";

let currentController;
const controllers = {
  code: new CodeController(),
  palettes: new PalettesController(),
  sprites: new SpritesController(),
  maps: new MapsController()
};

function onSelectController(name, el) {
  const item = el.getBoundingClientRect();
  const rect = element('.top-menu .selection-rectangle');
  rect.style.left = `${item.left}px`;
  rect.style.top = `${item.top}px`;
  rect.style.width = `${item.width}px`;
  rect.style.height = `${item.height}px`;
  setClass(el, 'active');
  el.blur();

  if (currentController) {
    unsetClass(`#${currentController.itemClassName}-button`, 'active');
    currentController.onBlur();
    currentController.didBecomeInactive();
  }

  function controllerInitialized() {
    currentController = controllers[name];
    currentController.onFocus();
  }

  currentController = null;
  const promise = controllers[name].willBecomeActive(controllers[name].firstShown);
  if (promise) promise.then(controllerInitialized);
  else controllerInitialized();
}

async function runGame() {
  await saveGame();
  window.open('http://localhost:3000/', 'game');
}

export async function saveGame() {
  try {
    setStatusText(`Saving game…`);
    for (let c of Object.values(controllers)) await c.willSaveTheGame();
    await saveGameResources();
    setStatusText(`Game saved (${new Date()})`);
  } catch (e) {
    setStatusText(`Failed to save: ${e}`);
  }
}

// goingForward should be set to true for a non-really-undo but just a save point of the state
export function restoreFunction(goingForward) {
  currentController && currentController.onChangeState(goingForward);
}

window.addEventListener('focus', () => currentController && currentController.onFocus());
window.addEventListener('blur', () => currentController && currentController.onBlur());
window.addEventListener('keydown', e => {
  // Ctrl+R (run)
  if ((isMac() ? e.ctrlKey : e.altKey) && e.key === 'r') {
    runGame();
    return e.preventDefault();
  } else if ((isMac() ? e.metaKey : e.ctrlKey) && e.key === 's') {
    saveGame();
    return e.preventDefault();
  }
  // Ignore keystrokes destined to input boxes
  if (isInputComponent(e.target)) return;
  // Undo/redo
  if (isMac()) {
    if (e.metaKey && e.shiftKey && e.key === 'z') {
      return currentController && currentController.onRedo();
    } else if (e.metaKey && e.key === 'z') {
      return currentController && currentController.onUndo();
		} else if (e.metaKey && e.key === 'e') {
			currentController && currentController.onCopyOrExport(true);
			return e.preventDefault();
    }
  } else if (e.ctrlKey) {
    if (e.ctrlKey && e.key === 'z') {
      return currentController && currentController.onUndo();
    } else if (e.ctrlKey && e.key === 'y') {
      return currentController && currentController.onRedo();
		} else if (e.ctrlKey && e.key === 'e') {
			currentController && currentController.onCopyOrExport(true);
			return e.preventDefault();
    }
  }
  currentController && currentController.onKeyDown(e);
});
window.addEventListener('resize', () => currentController && currentController.onResize());
document.addEventListener('cut', () => currentController && currentController.onCut());
document.addEventListener('copy', () => currentController && currentController.onCopyOrExport(false));
document.addEventListener('paste', () => currentController && currentController.onPaste());
registerTooltip();

// Selection effects
elements('.top-menu .item').forEach(el => {
  const name = el.id.replace('-button', '');
  if (controllers[name]) {
    el.addEventListener('click', () => onSelectController(name, el));
  }
  el.addEventListener('mouseover', () => {
    const item = el.getBoundingClientRect();
    const rect = element('.top-menu .active-selection-rectangle');
    rect.style.left = `${item.left}px`;
    rect.style.top = `${item.top}px`;
    rect.style.width = `${item.width}px`;
    rect.style.height = `${item.height}px`;
  });
});

element('.top-menu').addEventListener('mouseout', () => {
  const rect = element('.top-menu .active-selection-rectangle');
  rect.style.left = rect.style.width = rect.style.top = rect.style.height = '0';
});

element('#game-button').onclick = runGame;
element('#settings-button').onclick = () => {
	unsetClass('.settings-dialog', 'hidden');
	element('#setting-use-clipboard').checked = editorConfig.useClipboard;
	element('#setting-use-pink').checked = editorConfig.usePinkTransparency;
	element('.settings-dialog .button-ok').onclick = () => {
		editorConfig.useClipboard = element('#setting-use-clipboard').checked;
		editorConfig.usePinkTransparency = element('#setting-use-pink').checked;
		saveEditorConfig();
		setClass('.settings-dialog', 'hidden');
	};
	element('.settings-dialog .button-cancel').onclick = () => {
		setClass('.settings-dialog', 'hidden');
	};
};

// Load data and save initial undo steps
updateGameResourceData()
  .then(() => updatePaletteBitmap())
  .then(() => updateSpriteBitmap())
  .then(() => updateMapBitmap())
  .then(() => updateGameCode())
	.then(() => fetchEditorConfig())
  .then(() => {
    onSelectController('code', element('#code-button'));
  });
