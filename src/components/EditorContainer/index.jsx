import React, { useState } from 'react';
import { PuckEditor } from '../puck/editor/PuckEditor';

const initialData = {
  content: [],
  root: {
    props: {
      title: "My Article"
    }
  }
};

export default function EditorContainer({
  data,
  setContentMode
}) {
  const [content] = useState(data?.ArticleContent ? JSON.parse(data?.ArticleContent) || initialData : initialData);

  const [dataContent, setDataContent] = useState(content || initialData);


  const handleChange = (newData) => {
    setDataContent(newData);
  };

  return (
    <div style={{ height: '100vh' }}>
      <PuckEditor
        data={dataContent}
        onChange={handleChange}
        ArticleID={data?.Id}
        originalData={data}
        setContentMode={setContentMode}
      />
    </div>
  );
}
