"use client";

import React from "react";

type Props = {
  error: Error;
  reset: () => void;
};

export default function PostError({ error, reset }: Props) {
  return (
    <div className="mx-auto w-2/3 py-16">
      <div className="bg-background p-8 rounded-md border border-border">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">{error?.message || "An unexpected error occurred."}</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
