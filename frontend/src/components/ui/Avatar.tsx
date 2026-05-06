interface Props {
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-xl",
};

export default function Avatar({ name, size = "md" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initial}
    </div>
  );
}
