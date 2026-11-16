import { useState, type FormEvent } from 'react';
import { BookOpen, LoaderCircle } from 'lucide-react';
import { authClient } from '../neon';

export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) setError('Ma’lumotlar tekshirilmadi. Iltimos, qayta urinib ko‘ring.');
    } catch {
      setError('Ma’lumotlar tekshirilmadi. Iltimos, qayta urinib ko‘ring.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2eee6] px-5 py-10 text-zinc-900">
      <section className="w-full max-w-md rounded-3xl border border-[#e2dacb] bg-[#fffdf8] p-7 shadow-[0_24px_70px_rgba(55,43,26,0.12)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-900 text-amber-100">
            <BookOpen size={23} aria-hidden="true" />
          </div>
          <div>
            <p className="font-editorial text-2xl font-semibold tracking-tight">Daftar Canvas</p>
            <p className="mt-1 text-sm text-zinc-500">Yozuvlaringiz Neon’da xavfsiz saqlanadi</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f3f0e9] p-1" role="tablist" aria-label="Kirish yoki ro‘yxatdan o‘tish">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-in'}
            onClick={() => { setMode('sign-in'); setError(''); }}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'sign-in' ? 'bg-white text-emerald-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >Kirish</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-up'}
            onClick={() => { setMode('sign-up'); setError(''); }}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'sign-up' ? 'bg-white text-emerald-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >Ro‘yxatdan o‘tish</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign-up' && (
            <label className="block text-sm font-medium text-zinc-700">
              Ismingiz
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10"
                placeholder="Ism Familiya"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-zinc-700">
            Elektron pochta
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10"
              placeholder="siz@example.com"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Parol
            <input
              type="password"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10"
              placeholder="Kamida 8 ta belgi"
            />
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}
            {mode === 'sign-in' ? 'Daftarimga kirish' : 'Hisob yaratish'}
          </button>
        </form>
      </section>
    </main>
  );
}
