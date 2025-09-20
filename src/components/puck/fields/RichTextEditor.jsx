import React from 'react'
import TiptapRichTextEditor from './components/TiptapRichTextEditor ';

export const RichTextEditorField = ({ field, onChange, value }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
      </label>
      <TiptapRichTextEditor
        value={value}
        onChange={onChange}
      />
    </div>
  );
};



