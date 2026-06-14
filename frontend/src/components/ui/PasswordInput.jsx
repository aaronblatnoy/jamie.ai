// Phase 1 stub — real content built in Phase 4.
import React from 'react';

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  label,
  name,
  autoComplete,
}) {
  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <input
        type="password"
        className="input-field"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        autoComplete={autoComplete}
      />
    </div>
  );
}
