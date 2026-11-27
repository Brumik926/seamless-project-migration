import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  icon?: ReactNode | undefined;
  htmlFor: string;
  children: ReactNode;
  className?: string | undefined;
  inline?: boolean | undefined;
};

/** Dark input well with the label inside, matching the reference payment form. */
export function FieldShell({ label, required, error, hint, icon, htmlFor, children, className, inline }: FieldShellProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "bank-field relative flex min-h-[4.25rem] cursor-text gap-3 px-5 transition-shadow focus-within:ring-2 focus-within:ring-primary/70",
          inline ? "items-center" : "flex-col justify-center py-3",
          error && "ring-2 ring-negative/80",
        )}
      >
        <span className={cn("text-[0.95rem] text-muted-foreground", inline ? "shrink-0" : "text-[0.8rem]")}>
          {label}
          {required ? <span className="text-primary"> *</span> : null}
        </span>
        <div className={cn("flex min-w-0 flex-1 items-center gap-3", inline && "justify-end")}>{children}</div>
        {icon ? <span className="absolute top-1/2 right-5 -translate-y-1/2 text-primary">{icon}</span> : null}
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 px-1 text-sm text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 px-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full min-w-0 bg-transparent text-[1.05rem] text-field-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-60";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  icon?: ReactNode;
  inline?: boolean;
  shellClassName?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, icon, inline, required, className, shellClassName, ...props },
  ref,
) {
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      icon={icon}
      htmlFor={id}
      inline={inline}
      className={shellClassName}
    >
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(inputBase, inline && "text-right", icon && "pr-9", className)}
        {...props}
      />
    </FieldShell>
  );
});

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { id, label, error, hint, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <textarea
        ref={ref}
        id={id}
        rows={2}
        aria-invalid={error ? true : undefined}
        className={cn(inputBase, "resize-none", className)}
        {...props}
      />
    </FieldShell>
  );
});

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  error?: string | undefined;
  options: { value: string; label: string }[];
  inline?: boolean;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id, label, error, options, inline, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} htmlFor={id} inline={inline}>
      <select
        ref={ref}
        id={id}
        className={cn(inputBase, "cursor-pointer appearance-none bg-field", inline && "text-right", className)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

/** Search well used on lists ("Hľadať"). */
export function SearchField({
  value,
  onChange,
  placeholder = "Hľadať",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("bank-field flex h-14 items-center gap-4 px-5", className)}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-[1.05rem] text-field-foreground placeholder:text-muted-foreground outline-none"
      />
    </label>
  );
}
