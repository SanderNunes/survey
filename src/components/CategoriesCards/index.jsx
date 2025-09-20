import React from "react";

export default function CategoriesCards({category, titles, color}) {
  return (
    <div className="max-w-lg bg-white shadow rounded-2xl p-4 flex items-center justify-between space-x-4 my-4 py-6">
      <div className="bg-indigo-100 p-8 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: color }}>
        <svg
          className="w-8 h-8 text-indigo-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.121 17.804A9.003 9.003 0 0112 15c2.21 0 4.21.805 5.879 2.137M15 10a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      <div className="flex-1">
        <h3 className="text-md font-semibold text-gray-900">
          {category}
        </h3>
        {
          titles.map((title, index) => (<p key={`CATEGORY-TITLE-${index}`} className="text-sm text-gray-600">{title}</p>))
        }
      </div>
  </div>
  );
}
