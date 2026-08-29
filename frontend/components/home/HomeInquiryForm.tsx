"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function HomeInquiryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [request, setRequest] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (request.trim()) params.set("q", request.trim());
    router.push(`/explore${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-md">
      <label className="mb-8 block text-sm font-medium text-white">
        Name *
        <input
          required
          className="form-input-dark mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="mb-8 block text-sm font-medium text-white">
        Email *
        <input
          required
          type="email"
          className="form-input-dark mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mb-10 block text-sm font-medium text-white">
        What are you looking for?
        <input
          className="form-input-dark mt-2"
          placeholder="Street food tonight, a half-day safari..."
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark"
      >
        Find an experience
      </button>
    </form>
  );
}
