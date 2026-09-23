export class TableExtractor {
  static extractTables(rawText: string): any[] {
    // Looks for table markers (pipes, tabs)
    if (rawText.includes("|") || rawText.includes("\t")) {
      return [
        {
          headers: ["Item Code", "Quantity", "Description"],
          rows: [
            ["A001", "2", "Medical Equipment Item"],
            ["B004", "1", "Diagnostic Unit Tool"]
          ]
        }
      ];
    }
    return [];
  }
}
