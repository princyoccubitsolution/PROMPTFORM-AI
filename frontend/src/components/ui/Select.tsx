import * as React from "react";
import { CustomSelect, SelectOption } from "./CustomSelect";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  error?: string;
  label?: string;
  options?: (SelectOption | string)[];
  onChange?: (e: any) => void;
  size?: 'sm' | 'md' | 'lg';
  buttonClassName?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", buttonClassName = "", error, label, children, value, onChange, disabled, placeholder, size = 'md', id, name, ...props }, ref) => {
    // Parse <option> tags from children if options prop is not passed directly
    const parsedOptions: SelectOption[] = React.useMemo(() => {
      if (props.options) return props.options as any;
      const extracted: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && (child.type === "option" || (child as any).type?.name === "option")) {
          const optProps = child.props as any;
          extracted.push({
            value: String(optProps.value ?? optProps.children ?? ""),
            label: String(optProps.children ?? optProps.value ?? ""),
            disabled: Boolean(optProps.disabled)
          });
        }
      });
      return extracted;
    }, [children, props.options]);

    const handleCustomChange = (val: string) => {
      if (onChange) {
        // Create synthetic event for backward compatibility with standard form handlers
        const syntheticEvent = {
          target: { value: val, name: name || "" },
          currentTarget: { value: val, name: name || "" }
        };
        onChange(syntheticEvent as any);
      }
    };

    return (
      <CustomSelect
        id={id}
        label={label}
        error={error}
        options={parsedOptions}
        value={value as string}
        onChange={handleCustomChange}
        disabled={disabled}
        placeholder={placeholder || (parsedOptions[0]?.value === "" ? parsedOptions[0]?.label : undefined)}
        className={className}
        buttonClassName={buttonClassName}
        size={size}
      />
    );
  }
);
Select.displayName = "Select";
