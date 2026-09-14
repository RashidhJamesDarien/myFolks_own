"use client";

export function RadioGrid({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="radio-grid">
      {options.map(
        ([optionValue, label]) => (
          <label key={optionValue}>
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() =>
                onChange(optionValue)
              }
            />

            <span>{label}</span>
          </label>
        ),
      )}
    </div>
  );
}
