"use client";

import { FormEvent, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("بدون إزعاج. فقط تحديثات الإطلاق.");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setMessage("جاري التسجيل...");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, company }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "تعذر التسجيل الآن.");
      }

      setSubmitState("success");
      setEmail("");
      setMessage(data.message ?? "تم تسجيل اهتمامك. شكرًا لك.");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "تعذر التسجيل الآن.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.07] p-2 shadow-glow backdrop-blur"
      aria-label="BunnList waitlist form"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-14 flex-1 rounded-3xl border border-transparent bg-white/10 px-5 text-left text-base text-porcelain outline-none transition placeholder:text-porcelain/45 focus:border-crema/60 focus:bg-white/[0.13]"
        />
        <label className="hidden" htmlFor="company">
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className="hidden"
        />
        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="min-h-14 rounded-3xl bg-crema px-6 text-sm font-semibold text-espresso transition hover:-translate-y-0.5 hover:bg-[#d7b775] focus:outline-none focus:ring-2 focus:ring-crema/70 focus:ring-offset-2 focus:ring-offset-espresso disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitState === "submitting" ? "جاري الإرسال..." : "أبلغني عند الإطلاق"}
        </button>
      </div>
      <p
        className="px-3 pb-2 pt-3 text-center text-xs text-oat/58"
        role={submitState === "error" ? "alert" : "status"}
      >
        {message}
      </p>
    </form>
  );
}
