import { Suspense } from "react";
import { CustomerBooksPage } from "@/components/customer-experience";

export default function BooksPage() {
  return (
    <Suspense fallback={null}>
      <CustomerBooksPage />
    </Suspense>
  );
}
