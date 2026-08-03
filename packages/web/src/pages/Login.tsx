import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { requestOtp, verifyOtp } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.js";

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited:
    "Demasiados intentos. Espera unos minutos antes de volver a solicitar un código.",
  whatsapp_unavailable:
    "No se pudo enviar el código por WhatsApp. Inténtalo de nuevo en unos minutos.",
  invalid_code: "Código incorrecto o caducado.",
  unknown_error: "Ha ocurrido un error. Inténtalo de nuevo.",
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return ERROR_MESSAGES[err.code] ?? ERROR_MESSAGES.unknown_error;
  }
  return "No se pudo conectar con el servidor. Comprueba tu conexión.";
}

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoneSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await verifyOtp(phone.trim(), code.trim());
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          Iniciar sesión
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {step === "phone"
            ? "Introduce tu número de teléfono para recibir un código por WhatsApp."
            : `Introduce el código enviado por WhatsApp a ${phone}.`}
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoFocus
                placeholder="600000000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || phone.trim() === ""}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Código de 6 dígitos
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest focus:border-gray-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.trim() === ""}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar código"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-sm text-gray-500 hover:underline"
            >
              Usar otro número
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
