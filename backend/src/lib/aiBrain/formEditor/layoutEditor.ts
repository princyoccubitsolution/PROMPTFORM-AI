export class LayoutEditor {
  static updateColumns(formConfig: any, columnsCount: number): any {
    if (formConfig.layoutConfig) {
      formConfig.layoutConfig.columns = columnsCount;
    }
    return formConfig;
  }
}
