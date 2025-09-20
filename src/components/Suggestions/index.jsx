import moment from "moment";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function SearchSuggestions({ suggestions, searchTerm }) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { t, i18n } = useTranslation();

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // If language affects date formatting
  useEffect(() => {
    moment.locale(i18n.language);
  }, [i18n.language]);

  if (!(suggestions.length > 0 && searchTerm.trim() !== "")) return null;

  return (
    <div
      className="absolute bg-white mt-1 rounded-2xl w-full z-10 border border-gray-200 shadow-lg animate-fadeIn z-50"
      style={{ animation: "fadeIn 0.2s ease-out forwards" }}
    >
      {suggestions.map((item, i) => {
        const isHighlighted = i === highlightedIndex;

        return (
          <a
            key={i}
            href={item.Path || `/home/articles/${item.slug}`}
            rel="noopener noreferrer"
            className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 transition-colors duration-150
              ${isHighlighted ? "bg-indigo-50" : "hover:bg-gray-50"}`}
          >
            <div
              className="w-10 h-10 flex-shrink-0 rounded-lg bg-center bg-no-repeat bg-cover"
              style={{
                backgroundImage: `url(${
                  item.image || "/default-image.png"
                })`,
              }}
            ></div>

            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.Title}
              </p>
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                <span>
                  {t("searchSuggestions.extension")}: .{item.FileType}
                </span>
                <span>
                  {t("searchSuggestions.category")}:{" "}
                  {item.AfricellFileCategory || item.ContentType || t("searchSuggestions.noCategory")}
                </span>
                <span>
                  {t("searchSuggestions.lastModified")}:{" "}
                  {moment.utc(item.LastModifiedTime).local().fromNow()}
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
