import { renderToString } from "react-dom/server";
import { ConnectedConsultationRequest } from "../../src/features/consultations/connected-request";
export function form() {
  return renderToString(
    <ConnectedConsultationRequest
      categories={[
        { id: "mold-inspection", name: "Mold Testing / Inspectors" },
      ]}
    />,
  );
}
