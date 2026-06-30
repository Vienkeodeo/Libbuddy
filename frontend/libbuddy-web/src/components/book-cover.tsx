import { useState } from "react";
import { getBookPalette, type Book } from "@/lib/library-ui-data";

type BookCoverProps = {
  book: Pick<Book, "id" | "title" | "author" | "category" | "coverImageUrl">;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-20 w-14",
  md: "h-44 w-32",
  lg: "h-56 w-40",
};

export function BookCover({ book, size = "md" }: BookCoverProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const coverUrl = book.coverImageUrl ?? null;
  const showImage = Boolean(coverUrl) && !imageError;
  const [background, foreground, accent] = getBookPalette(book.id, book.category);

  return (
    <div
      className={`${sizes[size]} relative overflow-hidden rounded-[7px] border border-black/10 shadow-[0_16px_30px_rgba(15,23,42,0.14)] transition-shadow duration-300 ${
        showImage && imageLoaded ? "shadow-[0_20px_40px_rgba(15,23,42,0.22)]" : ""
      }`}
      style={showImage ? undefined : { background, color: foreground }}
      aria-hidden={showImage}
    >
      {showImage ? (
        <img
          src={coverUrl as string}
          alt={`Bìa sách ${book.title}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-y-0 left-0 w-2 bg-black/12" />
          <div className="absolute inset-x-0 top-0 h-1/3 bg-white/14" />
          <div className="absolute left-4 right-3 top-5 h-px bg-current opacity-35" />
          <div className="relative flex h-full flex-col justify-between p-3 pl-4">
            <div className="text-[10px] font-semibold uppercase leading-3 opacity-80">{book.category}</div>
            <div>
              <div className={size === "sm" ? "text-[10px] font-bold leading-3" : "text-base font-bold leading-5"}>
                {book.title}
              </div>
              <div className="mt-2 h-1 w-9 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <div className="text-[10px] font-medium leading-3 opacity-85">{book.author}</div>
          </div>
          <div className="absolute bottom-0 right-0 h-12 w-12 rounded-tl-full bg-white/18" />
        </>
      )}
    </div>
  );
}
