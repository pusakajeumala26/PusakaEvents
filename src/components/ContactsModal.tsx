'use client';

import { ADMIN_CONTACTS } from '@/lib/constants';
import { idWa, initials } from '@/lib/format';
import { Dialog } from './MemberForms';
import { Ic } from './Ic';

export function ContactsModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="Hubungi pengurus"
      titleId="contacts-title"
      onClose={onClose}
      scrimClassName="contacts-scrim"
      footer={<button type="button" className="btn pri" onClick={onClose}>Tutup</button>}
    >
      <div className="cgrid contacts-grid">
        {ADMIN_CONTACTS.map((person) => (
          <div className="ct" key={person.phone}>
            <span className="av">{initials(person.name)}</span>
            <div className="t">
              <b>{person.name}</b>
              <span>{person.title} · <span className="num">{person.phone}</span></span>
            </div>
            <a className="ib ol" href={`https://wa.me/${idWa(person.phone)}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat WhatsApp ${person.name}, ${person.title}`}>
              <Ic n="i-chat" />
            </a>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
