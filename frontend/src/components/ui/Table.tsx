import * as React from "react";

export const Table = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`bg-muted/50 border-b border-border ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`divide-y divide-border ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`transition-colors duration-150 hover:bg-muted/30 ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className = "", children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className = "", children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-4 py-3 text-sm ${className}`} {...props}>
    {children}
  </td>
);
