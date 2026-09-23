export class UndoRedoStack {
  private undoStack: any[] = [];
  private redoStack: any[] = [];

  pushState(formConfig: any): void {
    this.undoStack.push(JSON.parse(JSON.stringify(formConfig)));
    this.redoStack = []; // Clear redo stack on new state push
  }

  undo(currentState: any): any | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
    return this.undoStack.pop();
  }

  redo(currentState: any): any | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
    return this.redoStack.pop();
  }
}
