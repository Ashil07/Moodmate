import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 🔀 Add this for navigation

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark'); // 🌞 Force light mode
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8001/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("userId", data.id); // 💾 Save session
        navigate("/dashboard"); // 🎉 Go to dashboard
      } else {
        setMessage(`❌ ${data.detail || "Login failed"}`);
      }
    } catch (err) {
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-gray-200"
      >
        <h2 className="text-2xl font-semibold text-blue-600 mb-6 text-center">🔐 Log in to your MoodMate account</h2>

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

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-md text-white transition duration-200 ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="mt-6 text-center text-sm text-gray-600">
          New to MoodMate?{" "}
          <a
            href="/signup"
            className="text-blue-500 hover:underline font-medium"
          >
            Sign up here
          </a>
        </div>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </form>
    </div>
  );
}

export default LoginForm;
