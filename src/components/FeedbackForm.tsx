'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, MESSAGE_MAX, MESSAGE_MIN, NAME_MAX, ROLE_DEFS, ROLE_DETAIL_MAX, initialsOf } from '@/lib/feedback-input';
import { Dialog } from './MemberForms';
import { Ic } from './Ic';
import { Select } from './Select';

const ROLE_OPTIONS = ROLE_DEFS.map((def) => ({ value: def.value, label: def.value }));
type Errors = Partial<Record<'name' | 'roleDetail' | 'message' | 'rating' | 'consent' | 'avatar', string>>;

/** State + aksi form feedback; dipakai halaman penuh dan dialog. */
export function useFeedbackForm() {
  const [name, setName] = useState('');
  const [role, setRoleState] = useState('');
  const [roleDetail, setRoleDetail] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!avatar) { setPreview(''); return; }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const pickAvatar = (file: File | null) => {
    if (!file) return;
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setErrors((e) => ({ ...e, avatar: 'Foto harus berformat JPG, PNG, atau WebP.' }));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setErrors((e) => ({ ...e, avatar: 'Foto terlalu besar (maksimal 2 MB).' }));
      return;
    }
    setErrors((e) => ({ ...e, avatar: undefined }));
    setAvatar(file);
  };

  const setRole = (value: string) => {
    setRoleState(value);
    setRoleDetail('');
    setErrors((e) => ({ ...e, roleDetail: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Nama lengkap wajib diisi.';
    if (role && !roleDetail.trim()) next.roleDetail = 'Isi detail peran.';
    if (message.trim().length < MESSAGE_MIN) next.message = `Penilaian minimal ${MESSAGE_MIN} karakter.`;
    if (rating === null) next.rating = 'Pilih penilaian bintang 1 sampai 5.';
    if (!consent) next.consent = 'Centang persetujuan agar masukan dapat dikirim.';
    return next;
  };

  const submit = async () => {
    if (busy) return;
    const found = validate();
    setErrors((prev) => ({ ...found, avatar: prev.avatar }));
    if (Object.keys(found).length) return;
    if (!navigator.onLine) { setError('Koneksi internet tidak tersedia. Sambungkan kembali untuk mengirim masukan.'); return; }
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.set('name', name);
      body.set('role', role);
      body.set('roleDetail', roleDetail);
      body.set('message', message);
      body.set('rating', String(rating));
      body.set('consent', 'true');
      body.set('website', website);
      if (avatar) body.set('avatar', avatar);
      await api('/api/feedback', { method: 'POST', body });
      setSent(true);
    } catch (cause) {
      setError((cause as Error).message || 'Masukan belum dapat dikirim. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  return {
    name, setName, role, setRole, roleDetail, setRoleDetail, rating, setRating, message, setMessage, consent, setConsent,
    website, setWebsite, avatar, setAvatar, preview, pickAvatar, errors, busy, error, sent, submit,
  };
}
export type FeedbackFormState = ReturnType<typeof useFeedbackForm>;

const Err = ({ id, msg }: { id: string; msg?: string }) =>
  msg ? <span className="emsg" id={id} role="alert"><Ic n="i-alert" />{msg}</span> : null;

export function FeedbackFields({ form, first }: { form: FeedbackFormState; first?: boolean }) {
  const uid = useId();
  const file = useRef<HTMLInputElement>(null);
  const { errors } = form;
  const roleDef = ROLE_DEFS.find((def) => def.value === form.role);
  const remaining = MESSAGE_MAX - form.message.length;
  return (
    <div className="feedback-form">
      <div className="feedback-fields">
        <div className="f">
          <label className="lbl" htmlFor={`${uid}-name`}>Nama lengkap</label>
          <input
            className={`inp${errors.name ? ' bad' : ''}`}
            id={`${uid}-name`}
            name="name"
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${uid}-name-e` : undefined}
            data-autofocus={first ? '' : undefined}
          />
          <Err id={`${uid}-name-e`} msg={errors.name} />
        </div>
        <div className="f">
          <label className="lbl" htmlFor={`${uid}-role`}>Peran <i>(opsional)</i></label>
          <Select id={`${uid}-role`} value={form.role} options={ROLE_OPTIONS} onChange={form.setRole} placeholder="Pilih peran" />
        </div>
        {roleDef && (
          <div className="f">
            <label className="lbl" htmlFor={`${uid}-rd`}>{roleDef.detailLabel}</label>
            <input
              className={`inp${errors.roleDetail ? ' bad' : ''}`}
              id={`${uid}-rd`}
              name="roleDetail"
              value={form.roleDetail}
              onChange={(e) => form.setRoleDetail(e.target.value)}
              maxLength={ROLE_DETAIL_MAX}
              placeholder={`Contoh: ${roleDef.example}`}
              aria-required="true"
              aria-invalid={!!errors.roleDetail}
              aria-describedby={errors.roleDetail ? `${uid}-rd-e` : undefined}
            />
            <Err id={`${uid}-rd-e`} msg={errors.roleDetail} />
          </div>
        )}
        <div className="f">
          <span className="lbl" id={`${uid}-photo-l`}>Foto profil <i>(opsional)</i></span>
          <div className="fb-photo">
            {form.preview
              ? <img className="av fb-av" src={form.preview} alt="Pratinjau foto profil" width={48} height={48} />
              : <span className="av fb-av" aria-hidden="true">{initialsOf(form.name)}</span>}
            <div className="fb-photo-act">
              <input
                ref={file}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr"
                tabIndex={-1}
                aria-labelledby={`${uid}-photo-l`}
                onChange={(e) => { form.pickAvatar(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
              <button type="button" className="btn ghost sm" onClick={() => file.current?.click()} aria-describedby={`${uid}-photo-h`}>
                <Ic n="i-image" />{form.avatar ? 'Ganti foto' : 'Pilih foto'}
              </button>
              {form.avatar && <button type="button" className="btn ghost sm" onClick={() => form.setAvatar(null)}>Hapus</button>}
            </div>
          </div>
          <span className="hint" id={`${uid}-photo-h`}>JPG, PNG, atau WebP, maksimal 2 MB. Tanpa foto, tampil inisial.</span>
          <Err id={`${uid}-photo-e`} msg={errors.avatar} />
        </div>
      </div>

      <fieldset className="feedback-rating">
        <legend className="lbl">Penilaian bintang</legend>
        <div className="rating-options" role="radiogroup" aria-label="Penilaian dari 1 sampai 5 bintang">
          {[1, 2, 3, 4, 5].map((value) => (
            <label className={`rating-choice${form.rating === value ? ' selected' : ''}`} key={value}>
              <input type="radio" name={`${uid}-rating`} value={value} checked={form.rating === value} onChange={() => form.setRating(value)} aria-label={`${value} dari 5 bintang`} />
              <span aria-hidden="true">★</span>
              <b>{value}</b>
            </label>
          ))}
        </div>
        <Err id={`${uid}-rating-e`} msg={errors.rating} />
      </fieldset>

      <div className="f">
        <label className="lbl" htmlFor={`${uid}-msg`}>Penilaian</label>
        <textarea
          className={`inp feedback-message${errors.message ? ' bad' : ''}`}
          id={`${uid}-msg`}
          name="message"
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          maxLength={MESSAGE_MAX}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={`${uid}-msg-h ${uid}-msg-c${errors.message ? ` ${uid}-msg-e` : ''}`}
        />
        <div className="feedback-message-meta">
          <span className="hint" id={`${uid}-msg-h`}>Minimal {MESSAGE_MIN} karakter. Jangan sertakan nomor telepon atau data kas.</span>
          <span className="hint num" id={`${uid}-msg-c`}>{form.message.length}/{MESSAGE_MAX}</span>
        </div>
        <span className="sr" aria-live="polite">{remaining <= 100 ? `Sisa ${remaining} karakter.` : ''}</span>
        <Err id={`${uid}-msg-e`} msg={errors.message} />
      </div>

      <div>
        <label className="feedback-consent">
          <input type="checkbox" checked={form.consent} onChange={(e) => form.setConsent(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? `${uid}-consent-e` : undefined} />
          <span>Saya setuju masukan ini beserta nama dan peran saya ditampilkan di portfolio Alfiz Ilham.</span>
        </label>
        <Err id={`${uid}-consent-e`} msg={errors.consent} />
      </div>

      <div className="feedback-honeypot" aria-hidden="true">
        <label htmlFor={`${uid}-web`}>Website</label>
        <input id={`${uid}-web`} name="website" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>
    </div>
  );
}

const Thanks = () => (
  <div className="note neu" role="status">
    <Ic n="i-check" />
    <div>Terima kasih. Masukanmu sudah kami simpan dan akan diteruskan ke portfolio untuk ditinjau.</div>
  </div>
);

/** Halaman penuh /masukan. */
export function FeedbackForm() {
  const form = useFeedbackForm();
  return (
    <section className="feedback-card">
      <div className="feedback-intro">
        <span className="ico-b"><Ic n="i-chat" /></span>
        <div>
          <h2>Beri feedback</h2>
          <p className="sub">Ceritakan pengalamanmu menggunakan PusakaEvent.</p>
        </div>
      </div>
      {form.sent ? <Thanks /> : (
        <form onSubmit={(e) => { e.preventDefault(); void form.submit(); }} aria-busy={form.busy} noValidate>
          {form.error && <div className="note" role="alert"><Ic n="i-alert" /><div>{form.error}</div></div>}
          <FeedbackFields form={form} />
          <button className="btn pri feedback-submit" type="submit" disabled={form.busy}>
            <Ic n="i-chat" />{form.busy ? 'Mengirim...' : 'Kirim feedback'}
          </button>
        </form>
      )}
    </section>
  );
}

/** Modal feedback: dibuka otomatis di beranda atau dari menu samping. */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const form = useFeedbackForm();
  return (
    <Dialog
      title="Beri feedback"
      titleId="feedback-title"
      onClose={onClose}
      scrimClassName="feedback-scrim"
      footer={form.sent ? (
        <button type="button" className="btn pri" onClick={onClose}>Tutup</button>
      ) : (
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Lewati</button>
          <button type="button" className="btn pri" onClick={() => void form.submit()} disabled={form.busy}>{form.busy ? 'Mengirim...' : 'Kirim feedback'}</button>
        </>
      )}
    >
      {form.sent ? <Thanks /> : (
        <form onSubmit={(e) => { e.preventDefault(); void form.submit(); }} aria-busy={form.busy} noValidate>
          <p className="hint" style={{ marginBottom: 12 }}>Punya waktu sebentar? Ceritakan pengalamanmu memakai PusakaEvent. Boleh dilewati.</p>
          {form.error && <div className="note" role="alert"><Ic n="i-alert" /><div>{form.error}</div></div>}
          <FeedbackFields form={form} first />
          <button type="submit" className="sr" tabIndex={-1}>Kirim</button>
        </form>
      )}
    </Dialog>
  );
}
