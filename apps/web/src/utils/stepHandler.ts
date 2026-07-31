class HandleStep {
  private _currentStep: React.ReactNode;
  private _steps: React.ReactNode[];

  constructor(current: React.ReactNode, all: React.ReactNode[]) {
    this._currentStep = current;
    this._steps = all;
  }

  get step() {
    return this._currentStep;
  }

  next() {
    const cur = this._steps.indexOf(this._currentStep);

    if (cur === this._steps.length - 1) {
      return;
    }
    this._currentStep = this._steps[cur + 1];

    return this._steps[cur + 1];
  }

  previous() {
    const cur = this._steps.indexOf(this._currentStep);

    if (cur === 0) {
      return;
    }
    this._currentStep =
    return this._steps[cur - 1];
  }
}

export default HandleStep;
