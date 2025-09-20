import { Select } from '@material-tailwind/react';
import React from 'react';

export default function SelectDropdown({
  value,
  onChange,
  options,
  disabled,
  label,
  placeholder,
  filterKey
}) {
  return (
    <div className="min-w-[100px] w-full">
      <Select
        onChange={(val) => onChange(filterKey, val)}
        onValueChange={(val) => onChange(filterKey, val)}
        disabled={disabled}
        label={label}
        size="md"
        variant="outlined"
        className="hover:border-none focus:border-none capitalize"
        labelProps={{
          className: "before:content-none after:content-none",
        }}
        containerProps={{
          className: "min-w-0 w-full capitalize",
        }}
      >
        <Select.Trigger
          className="capitalize hover:border-none focus:border-none"
          placeholder={placeholder}
          value={value || ''}
        />
        <Select.List>
          <Select.Option value="all" className="capitalize">
            All {filterKey}
          </Select.Option>
          {options?.map((option) => (
            <Select.Option
              key={option?.value}
              value={option?.value}
              className="capitalize"
            >
              {option?.label}
            </Select.Option>
          ))}
        </Select.List>
      </Select>
    </div>
  );
}
