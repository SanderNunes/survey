import { Render } from "@measured/puck";
import { config } from "../config";

export const PuckRenderer = ({ data }) => {
  return <Render config={config} data={data} />;
};
