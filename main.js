import { main } from './src/game-main'
import {startGame} from "./lib/vdp-lib";

if (!main) alert('Configuration error. Make sure that export function *main() is defined in game-main.js');
startGame('#glCanvas', vdp => main(vdp), {
  resourceDir: window['resourceDir'],
  onError: exception => {
    document.getElementById('error-box').classList.add('visible');
    document.getElementById('error-detail').innerText = exception.stack;
  },
});
