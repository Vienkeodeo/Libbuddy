import { Suspense } from "react";
import { MyBooksPage } from "@/components/customer-experience";

export default function MyBooksRoute() {
  return (
    <Suspense fallback={null}>
      <MyBooksPage />
    </Suspense>
  );
}
