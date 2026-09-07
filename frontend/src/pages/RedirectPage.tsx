import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";

export default function RedirectPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const controller = new AbortController();

    async function validateShortCode() {
      try {
        const response = await fetchWithTimeout(
          `${API_URL}/api/shorten-url/${shortCode}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (data.originalUrl) {
          window.location.assign(data.originalUrl);
        } else {
          navigate("/");
        }
      } catch (error) {
        // Unresolvable (unknown code, timeout, network failure) → home
        // instead of a blank page. Aborts from unmount are ignored.
        if (!controller.signal.aborted) {
          console.log(error);
          navigate("/");
        }
      }
    }

    validateShortCode();

    return () => {
      controller.abort();
    };
  }, [API_URL, navigate, shortCode]);

  return <></>;
}
