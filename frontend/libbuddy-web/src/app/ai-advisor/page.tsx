import { Suspense } from "react";
import { AiAdvisorPage } from "@/components/customer-experience";

export default function AiAdvisorRoute() {
  return (
    <Suspense fallback={null}>
      <AiAdvisorPage />
    </Suspense>
  );
}
