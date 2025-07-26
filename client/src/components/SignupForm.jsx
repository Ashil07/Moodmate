import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TermsContent() {
  return (
    <div>
      <p className="text-sm mb-2">
        Welcome to MoodMate! Here's how we handle your data:
      </p>
      <ul className="list-disc pl-4 text-sm space-y-1">
        <li><strong>Email</strong> is stored securely and used for login and communication.</li>
        <li><strong>Password</strong> is hashed with bcrypt and never stored as plain text.</li>
        <li><strong>Consent</strong> is recorded when you agree to these terms.</li>
        <li>We use secure APIs (AWS Lambda & API Gateway) and do not share data without consent.</li>
        <li>You may request deletion or changes at any time.</li>
      </ul>
    </div>
  );
}

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  async function handleSignup(e) {
    e.preventDefault();
    setMessage('');
    if (!consent) {
      setMessage("❌ Please agree to the terms & conditions.");
      return;
    }

    setLoading(true);

    const payload = {
      email: email.trim(),
      password: password.trim(),
      consent
    };

    try {
      const res = await fetch("http://localhost:8000/signup", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ ${data.message} (ID: ${data.id})`);
        navigate('/dashboard'); // 🔁 Redirect to dashboard
      } else {
        setMessage(`❌ ${data.detail || "Signup failed"}`);
      }
    } catch (err) {
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <form
        onSubmit={handleSignup}
        className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-gray-200"
      >
        <h2 className="text-2xl font-semibold text-blue-600 mb-6 text-center">🧠 Create your MoodMate account</h2>

        <input
          type="email"
          placeholder="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 border border-gray-300 rounded-md p-3 w-full focus:outline-none focus:ring focus:ring-blue-200"
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 border border-gray-300 rounded-md p-3 w-full focus:outline-none focus:ring focus:ring-blue-200"
        />

        <label className="flex items-center mb-4 text-sm text-gray-700">
          <input
            type="checkbox"
            id="terms"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mr-2"
          />
          I agree to the Terms & Conditions
          <button
            type="button"
            className="ml-2 text-blue-500 hover:underline"
            onClick={() => setShowTerms(true)}
            aria-label="View Terms"
          >
            ℹ️
          </button>
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-md text-white transition duration-200 ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-500 hover:underline font-medium"
          >
            Login here
          </a>
        </div>
      </form>

      {/* ⬇️ Terms Pane */}
      {showTerms && (
        <div className="fixed top-0 left-0 w-80 h-full bg-white shadow-xl p-6 overflow-y-auto z-50 transition-transform duration-300">
          <h2 className="text-lg font-bold mb-4 text-blue-600">MoodMate Terms & Conditions</h2>
          <button
            className="absolute top-4 right-4 text-gray-500 text-xl"
            onClick={() => setShowTerms(false)}
            aria-label="Close Terms"
          >
            ✕
          </button>
          <TermsContent />
        </div>
      )}
    </div>
  );
}

export default SignupForm;
