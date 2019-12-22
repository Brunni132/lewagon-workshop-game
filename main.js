import { main } from './src/game-main'
import {startGame} from "./lib/vdp-lib";

if (!main) alert('Configuration error. Make sure that export function *main() is defined in game-main.js');
startGame('#glCanvas', vdp => main(vdp));
