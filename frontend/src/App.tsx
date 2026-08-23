import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { Copy, ArrowRight, Link, RotateCcw } from "lucide-react";

export default function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  async function createShortenUrl() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/shorten-url`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          originalUrl: originalUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create short URL");
      }

      console.log(response);

      const data = await response.json();
      console.log(data);

      setShortUrl(data.shortenUrl);
      return;
    } catch (err) {
      console.error("Error submitting url: ", err);
      setError("Failed to shorten url.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    await createShortenUrl();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`https://${API_URL}/${shortUrl}`);
    setCopied(true);
  };

  return (
    <main
      className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.95)_0_2%,transparent_27%),#f5f4ef]"
      id="top"
    >
      <nav
        className="mx-auto flex h-[92px] w-[min(1180px,calc(100%-48px))] items-center justify-between border-b border-[#d9ddd7] max-[650px]:h-[76px]"
        aria-label="Main navigation"
      >
        <a
          className="flex items-center gap-[11px] text-[25px] font-bold tracking-[-1.2px] text-[#18241f] no-underline"
          href="#top"
          aria-label="Snip home"
        >
          <span>URL Shortener</span>
        </a>
        <div className="flex gap-10 max-[650px]:hidden">
          <a
            className="text-[13px] font-medium text-[#5f6863] no-underline transition-colors duration-200 hover:text-[#e86239]"
            href="#home"
          >
            Home
          </a>
          <a
            className="text-[13px] font-medium text-[#5f6863] no-underline transition-colors duration-200 hover:text-[#e86239]"
            href="#about"
          >
            Why Snip?
          </a>
        </div>
        <a
          className="flex items-center gap-2.5 text-[13px] font-semibold text-[#18241f] no-underline max-[650px]:text-[0px]"
          href="#shortener"
        >
          Get started <ArrowRight />
        </a>
      </nav>

      <section
        className="mx-auto mt-20 flex min-h-[620px] w-[min(1180px,calc(100%-48px))] flex-col items-center gap-8 px-0 pt-[72px] pb-22 max-[900px]:gap-12 max-[900px]:pt-15 max-[650px]:w-[min(calc(100%-30px),1180px)] max-[650px]:px-0 max-[650px]:pt-12.5 max-[650px]:pb-17.5"
        id="shortener"
      >
        <div className="text-center text-7xl font-bold tracking-wide">
          <h2>
            Free <span className="text-[#e86239]">URL</span>
          </h2>
          <p>Shortener</p>
        </div>

        <div className="relative w-full max-w-170">
          <form onSubmit={handleSubmit}>
            <div className="flex min-h-20 items-center rounded-4xl border border-[#d9ddd7] bg-[#fafbf9] p-[6px_6px_6px_18px] transition-[border-color,box-shadow] duration-200 focus-within:border-[#e86239] focus-within:shadow-[0_0_0_3px_rgba(232,98,57,0.1)] max-[650px]:flex-wrap max-[650px]:gap-2.5 max-[650px]:p-3.25">
              <span className="grid text-[#929a95]">
                <Link />
              </span>
              <input
                id="long-url"
                type="url"
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                placeholder="https://your-very-long-link.com/goes-here"
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[large] text-[#26312c] outline-0 placeholder:text-[large] placeholder:text-[#a7ada9] max-[650px]:h-9 max-[650px]:pr-0"
                required
              />
              <button
                className="flex h-16 items-center gap-3 rounded-4xl border-0 bg-[#e86239] px-5 text-[small] font-semibold text-white transition-[background,transform] duration-200 hover:bg-[#d7532d] active:scale-[0.98] max-[650px]:w-full max-[650px]:justify-center disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                type="submit"
                disabled={!!shortUrl || loading}
              >
                {loading ? "Shortening..." : "Shorten link"} <ArrowRight />
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-3 flex animate-[reveal_0.25s_ease-out] items-center justify-between border-l-[3px] border-red-500 bg-[#f4f6f2] p-3.5">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {shortUrl && (
            <div>
              <div
                className="mt-3 flex animate-[reveal_0.25s_ease-out] items-center justify-between border-l-[3px] border-[#e86239] bg-[#f4f6f2] p-3.5"
                aria-live="polite"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-[1px] text-[#8a928e]">
                    Your short link
                  </span>
                  <strong className="text-[12px] text-[#26312c]">
                    {`${API_URL}/${shortUrl}`}
                  </strong>
                </div>
                <button
                  className="flex items-center gap-1.5 border-0 bg-white px-2.5 py-1.75 text-[10px] font-semibold text-[#e86239]"
                  type="button"
                  onClick={handleCopy}
                >
                  <Copy /> {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="group mt-5 flex justify-end px-5 py-5 no-underline">
                <a href="/" className="flex items-center justify-center gap-4 rounded-4xl bg-white px-6 py-4 text-[#26312c] shadow-[0_4px_14px_rgba(24,36,31,0.06)] transition-[transform,background-color,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:bg-white/80 group-hover:shadow-[0_10px_24px_rgba(24,36,31,0.12)] group-active:translate-y-0 group-active:scale-[0.98] group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-[#e86239] motion-reduce:transform-none motion-reduce:transition-none cursor-pointer">
                  <p>Shorten another link</p>
                  <RotateCcw className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-180 motion-reduce:transform-none motion-reduce:transition-none" />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
