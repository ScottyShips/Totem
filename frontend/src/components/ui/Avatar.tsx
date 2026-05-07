interface Props {
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-xl",
};

// Wristband palette — same set used for clustered avatars elsewhere; pick by
// hashing the name so the same person gets the same color across the app.
const GRADIENTS = [
  "bg-gradient-to-br from-iris-500 to-bloom-500",
  "bg-gradient-to-br from-sunset-500 to-bloom-500",
  "bg-gradient-to-br from-spark-400 to-iris-500",
  "bg-gradient-to-br from-gold-400 to-sunset-500",
  "bg-gradient-to-br from-mint-400 to-spark-400",
  "bg-gradient-to-br from-bloom-500 to-iris-500",
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function Avatar({ name, size = "md" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${pickGradient(name)} text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md`}
    >
      {initial}
    </div>
  );
}
