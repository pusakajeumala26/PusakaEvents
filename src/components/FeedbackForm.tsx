'use client';

import { useEffect, useState } from 'react';
import { postJson } from '@/lib/api-client';
import { Ic } from './Ic';

const MAX_MESSAGE_LENGTH = 1500;

export function FeedbackForm() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const characterNotice = message.length >= 1490
    ? 'Tersisa 10 karakter atau kurang.'
    : message.length >= 1400
      ? 'Masukan mendekati batas 1500 karakter.'
      : '';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }
    if (!consent || rating === null || busy) return;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await postJson('/api/feedback', { name, role, company, rating, message, consent, website });
      setName('');
      setRole('');
      setCompany('');
      setRating(null);
      setMessage('');
      setConsent(false);
      setWebsite('');
      setSuccess(true);
    } catch (cause) {
      setError((cause as Error).message || 'Masukan belum dapat dikirim. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="feedback-card">
      <div className="feedback-intro">
        <span className="ico-b"><Ic n="i-chat" /></span>
        <div>
          <h2>Kirim masukan</h2>
          <p className="sub">Ceritakan pengalamanmu menggunakan PusakaEvent.</p>
        </div>
      </div>

      {success && (
        <div className="note neu" role="status">
          <Ic n="i-check" />
          <div>Terima kasih. Masukanmu sudah terkirim dan akan ditinjau sebelum ditampilkan di portfolio.</div>
        </div>
      )}
      {!online && <div className="note" role="status"><Ic n="i-alert" /><div>Koneksi internet tidak tersedia. Sambungkan kembali untuk mengirim masukan.</div></div>}
      {error && <div className="note" role="alert"><Ic n="i-alert" /><div>{error}</div></div>}

      <form className="feedback-form" onSubmit={submit} aria-busy={busy}>
        <div className="feedback-fields">
          <div className="f">
            <label className="lbl" htmlFor="feedback-name">Nama</label>
            <input className="inp" id="feedback-name" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" required />
          </div>
          <div className="f">
            <label className="lbl" htmlFor="feedback-role">Peran <i>(opsional)</i></label>
            <input className="inp" id="feedback-role" name="role" value={role} onChange={(event) => setRole(event.target.value)} maxLength={80} autoComplete="organization-title" />
          </div>
          <div className="f">
            <label className="lbl" htmlFor="feedback-company">Instansi <i>(opsional)</i></label>
            <input className="inp" id="feedback-company" name="company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={80} autoComplete="organization" />
          </div>
        </div>

        <fieldset className="feedback-rating">
          <legend className="lbl">Rating</legend>
          <div className="rating-options" role="radiogroup" aria-label="Rating dari 1 sampai 5">
            {[1, 2, 3, 4, 5].map((value) => (
              <label className={`rating-choice${rating === value ? ' selected' : ''}`} key={value}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  aria-label={`${value} dari 5`}
                  required
                />
                <span aria-hidden="true">★</span>
                <b>{value}</b>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="f">
          <label className="lbl" htmlFor="feedback-message">Isi masukan</label>
          <textarea
            className="inp feedback-message"
            id="feedback-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-describedby="feedback-message-hint feedback-character-count"
            required
          />
          <div className="feedback-message-meta">
            <span className="hint" id="feedback-message-hint">Jangan sertakan nomor telepon, data kas, atau foto struk.</span>
            <span className="hint num" id="feedback-character-count">{message.length}/{MAX_MESSAGE_LENGTH}</span>
          </div>
          <span className="sr" aria-live="polite">{characterNotice}</span>
        </div>

        <label className="feedback-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
          <span>Saya setuju masukan ini beserta nama dan peran saya ditampilkan di portfolio Alfiz Ilham.</span>
        </label>

        <div className="feedback-honeypot" aria-hidden="true">
          <label htmlFor="feedback-website">Website</label>
          <input id="feedback-website" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        <button className="btn pri feedback-submit" type="submit" disabled={!consent || busy || !online}>
          <Ic n="i-chat" />{busy ? 'Mengirim...' : 'Kirim masukan'}
        </button>
      </form>
    </section>
  );
}
