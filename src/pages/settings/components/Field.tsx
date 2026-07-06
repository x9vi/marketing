import { type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, className = '', ...props }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      <input {...props} />
    </div>
  );
}
