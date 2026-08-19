import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl
        border
        bg-white
        p-8
        shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
}