export class UndoBuffer {
  constructor(restoreStateFn, maxSteps = 100) {
    this.totalActions = this.undoStep = 0;
    this.undoBuffer = new Array(maxSteps);
    this.onrestorestate = restoreStateFn;
  }

  saveStep(operation) {
    if (this.undoStep === this.undoBuffer.length) {
      this.undoBuffer.shift();
      this.undoStep -= 1;
    }
    this.undoBuffer[this.undoStep] = operation;
    this.totalActions = (this.undoStep += 1);
  }

  undo() {
    if (this.undoStep <= 0) return;
    this.undoBuffer[--this.undoStep].reverse();
    this.onrestorestate(false);
  }

  redo() {
    if (this.undoStep === this.totalActions) return;
    this.undoBuffer[this.undoStep++].execute();
    this.onrestorestate(false);
  }
}
