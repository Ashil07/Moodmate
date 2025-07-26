import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();

    const payload = { email, password };
    try {
      const res = await fetch("https://jqm4hddsm8.execute-api.ap-south-1.amazonaws.com/prod/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.status === 200) {
        setMessage(`✅ Welcome back, ${data.username}`);
      } else {
        setMessage(`❌ ${data.error || "Unexpected error"}`);
      }
    } catch (err) {
      setMessage("❌ Could not reach server");
      console.error(err);
    }
  }

  return (
    <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow max-w-md mx-auto mt-8">
      <h2 className="text-xl mb-4 font-bold">🔐 Login to MoodMate</h2>
      <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mb-2 border p-2 w-full"/>
      <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2 border p-2 w-full"/>
      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Login</button>
      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </form>
  );
}

export default LoginForm;
