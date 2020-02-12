import {PNG} from 'pngjs/browser';
import {editorConfig, gameResourceData} from "./api";

export function pixels32ToPng(destPngData, pixels, usePinkTransparency = false) {
  for (let i = 0; i < pixels.length; i++) {
    let pix = pixels[i];
    if (usePinkTransparency && pixels[i] >> 24 === 0) {
      pix = 0xfffe00ff;
    }
    destPngData[i * 4] = pix & 0xff;
    destPngData[i * 4 + 1] = pix >> 8 & 0xff;
    destPngData[i * 4 + 2] = pix >> 16 & 0xff;
    destPngData[i * 4 + 3] = pix >> 24 & 0xff;
  }
}

export function pngToPixels32(pngData) {
  const result = new Array(pngData.length / 4);
  let j = 0;
  for (let i = 0; i < pngData.length; i += 4) {
    // Bitwise operators transform the result to a signed 32-bit number and that's not what we want
    result[j++] = pngData[i] + pngData[i + 1] * (1 << 8) + pngData[i + 2] * (1 << 16) + pngData[i + 3] * (1 << 24);
  }
  return result;
}

export function decodePng(arrayBuffer, usePinkTransparency) {
  // TODO -- Doesn't work with PNG.sync.read, debug
  // PNG.sync.read(arrayBuffer);
  return new Promise((resolve, reject) => {
    new PNG().parse(arrayBuffer, function (error, data) {
      if (error != null) {
        console.error('Failed to read image', error);
        return reject(error);
      }
      if (usePinkTransparency) {
        for (let i = 0; i < data.data.length; i += 4) {
          if (data.data[i] === 0xff && data.data[i + 1] === 0x00 && data.data[i + 2] === 0xfe) {
            data.data[i] = data.data[i + 1] = data.data[i + 2] = data.data[i + 3] = 0;
          }
        }
      }
      return resolve({
        width: data.width,
        height: data.height,
        data: data.data
      });
    });
  });
}

export function debouncer(delay) {
  let timer = null, runnable = null;
  const runPending = () => {
    timer = null;
    runnable();
  };
  return {
    run: fun => {
      if (timer) clearTimeout(timer);
      runnable = fun;
      timer = setTimeout(runPending, delay);
    },
    executePending: () => {
      if (timer) {
        clearTimeout(timer);
        runPending();
      }
    }
  };
}

export const isMac = () => window.navigator.platform.match("Mac");

export function makeCssColor(colorArray) {
  return colorArray.length === 3
    ? `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`
    : `rgba(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]}, ${colorArray[3]})`;
}

export function makeCssColor32(color32) {
  return `rgba(${color32 & 0xff}, ${color32 >> 8 & 0xff}, ${color32 >> 16 & 0xff}, ${(color32 >> 24 & 0xff) / 255})`;
}

export function mouseEventShouldMove(e) {
  return e.button === 1 || (e.shiftKey && e.button === 0);
}

export function element(selector_or_element) {
  if (typeof selector_or_element == 'string') return document.querySelector(selector_or_element);
  return selector_or_element;
}

export function elements(selector_or_elements) {
  if (typeof selector_or_elements == 'string') return document.querySelectorAll(selector_or_elements);
  else if (Array.isArray(selector_or_elements)) return selector_or_elements;
  return [selector_or_elements];
}

export function hasClass(selector_or_element, className) {
  return element(selector_or_element).classList.contains(className);
}

export function setClass(selector_or_elements, className, condition = true) {
  elements(selector_or_elements).forEach(e => {
    if (typeof condition == 'function' ? condition(e) : condition) {
      if (!e.classList.contains(className)) e.classList.add(className);
    }
    else {
      if (e.classList.contains(className)) e.classList.remove(className);
    }
  });
}

export function unsetClass(selector_or_element, className) {
  setClass(selector_or_element, className, false);
}

export function updateListCombo(element, key) {
  const index = element.selectedIndex;
  const sprites = Object.keys(gameResourceData[key]);
  for (let i = element.options.length - 1; i >= 0; i--) element.remove(i);
  for (const name of sprites) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.innerHTML = name;
    element.appendChild(opt);
  }
  // To restore the selected item after rebuild
  element.value = sprites[index] || sprites[0];
}

export function isInputComponent(domNode) {
  return ['textarea', 'input'].includes(domNode.tagName.toLowerCase());
}

export function createCanvas2DEmptyPattern() {
  const patternCanvas = document.createElement('canvas');
  const patternContext = patternCanvas.getContext('2d');

  // Give the pattern a width and height of 50
  patternCanvas.width = 6;
  patternCanvas.height = 6;

  // Give the pattern a background color and draw an arc
  patternContext.fillStyle = '#d0d0d0';
  patternContext.fillRect(0, 0, 6, 6);
  patternContext.strokeStyle = '#888';
  patternContext.moveTo(0, 6);
  patternContext.lineTo(6, 0);
  patternContext.moveTo(0, 0);
  patternContext.lineTo(6, 6);
  patternContext.stroke();
  return patternCanvas;
}

export const IMAGE_UPDATE_DELAY = 50;
