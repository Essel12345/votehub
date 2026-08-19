import { forwardRef, TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, ...props }, ref) => (
    <div className="space-y-2">

      <label className="font-medium">
        {label}
      </label>

      <textarea
        ref={ref}
        {...props}
        rows={5}
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
  )
);

Textarea.displayName = "Textarea";

export default Textarea;