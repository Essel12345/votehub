import { forwardRef, InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">

        <label className="font-medium">
          {label}
        </label>

        <input
          ref={ref}
          {...props}
          className="
            w-full
            rounded-lg
            border
            p-3
          "
        />

        {error && (
          <p className="text-red-500 text-sm">
            {error}
          </p>
        )}

      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;