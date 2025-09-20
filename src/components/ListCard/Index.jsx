import { Check, PlayCircle } from "lucide-react";

const iconMap = {
  check: (
    <Check
      size={20}
      strokeWidth={1.25}
      className="text-green-600 flex-shrink-0"
    />
  ),
  play: (
    <PlayCircle
      size={20}
      strokeWidth={1.25}
      className="text-alternative flex-shrink-0"
    />
  ),
};

export default function ListCard({
  id,
  title,
  items,
  icon = "check",
  emptyMessage = "No items available.",
}) {
  // ✅ Always treat items as an array
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>

      {safeItems.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {safeItems.map((item, index) => (
            <li
              key={`list-card-item-${id}-${index}`}
              className={`gap-2 flex items-start text-gray-700 ${
                icon === "play" ? "border-b pb-2 last:border-b-0" : ""
              }`}
            >
              {iconMap[icon] || iconMap.check}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
