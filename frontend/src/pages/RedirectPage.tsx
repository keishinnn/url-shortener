import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

export default function RedirectPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function validateShortCode() {
      try {
        const response = await fetch(
          `${API_URL}/api/shorten-url/${shortCode}`,
          {
            method: "GET",
          },
        );

        const data = await response.json();

        if (data.originalUrl) {
          window.location.assign(data.originalUrl);
        } else {
          navigate("/");
        }
      } catch (error) {
        console.log(error);
      }
    }

    validateShortCode();
  }, [API_URL, navigate, shortCode]);

  return <></>;
}
