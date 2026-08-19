import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

const sizeClasses = {
  sm: "px-3 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  children,
  loading,
  variant = "primary",
  size = "md",
  href,
  className,
  ...props
}: ButtonProps) {
  const baseClasses = `
    rounded-lg
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    font-semibold
    disabled:opacity-50
    transition-colors
    inline-block
    text-center
    ${className || ""}
  `;

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={baseClasses}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}