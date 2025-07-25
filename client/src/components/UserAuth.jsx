import { useState } from 'react';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    if (!consent) return setMessage("❌ Please agree to the terms.");

    const payload = { email, password, consent };
    const res = await fetch("https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/signup", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setMessage(data.message || "🚨 Unexpected error");
  }

  return (
    <form onSubmit={handleSignup} className="bg-white p-6 rounded shadow max-w-md mx-auto">
      <h2 className="text-xl mb-4 font-bold">🧠 MoodMate Signup</h2>
      <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mb-2 border p-2 w-full"/>
      <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2 border p-2 w-full"/>
      <label className="flex items-center mb-2">
        <input type="checkbox" checked={consent} onChange={() => setConsent(!consent)} />
        <span className="ml-2">I agree to the Terms & Conditions</span>
      </label>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Sign Up</button>
      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </form>
  );
}

export default SignupForm;
