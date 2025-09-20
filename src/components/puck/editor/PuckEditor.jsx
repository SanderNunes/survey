import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { config } from "../config";
import EditorHeaderButtons  from "../components/EditorHeaderButtons/EditorHeaderButtons";
import { useMemo } from "react";

export const PuckEditor = ({ data, onChange, setContentMode, ArticleID, originalData }) => {
  // Custom header actions with configuration controls


  
  const customHeaderActions = useMemo(() => {
    return () => (
      <EditorHeaderButtons
        dataArticle={data}
        ArticleID={ArticleID}
        setContentMode={setContentMode}
        originalData={originalData}
      />
    );
  }, [data, setContentMode, ArticleID, originalData]);



  return (
    <Puck
      config={config}
      data={data}
      onChange={onChange}
      overrides={{
          headerActions: customHeaderActions,
        }}
    />
  );
};
