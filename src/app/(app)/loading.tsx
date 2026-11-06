/** Skeleton saat halaman memuat (sesuai desain). */
const S = ({ s }: { s: React.CSSProperties }) => <span className="skl" style={s} />;

export default function Loading() {
  return (
    <>
      <header className="top-m">
        <img className="logo" src="/brand/logo.webp" alt="" width={44} height={47} />
        <div className="tt"><h1>PusakaEvent</h1><div className="sub">Memuat data...</div></div>
      </header>
      <header className="top-d">
        <div className="tt"><h1>Memuat...</h1><div className="sub">Mohon tunggu sebentar</div></div>
      </header>
      <div className="content" aria-busy="true" aria-label="Memuat">
        <section className="stats">
          {[0, 1].map((i) => (
            <div className="stat" key={i}>
              <S s={{ width: '40%', height: 12 }} />
              <S s={{ width: '30%', height: 36 }} />
              <S s={{ width: '100%', height: 10 }} />
              <S s={{ width: '60%', height: 12 }} />
            </div>
          ))}
        </section>
        <div className="tools">
          <S s={{ flex: 1, height: 48, borderRadius: 99, minWidth: 160 }} />
          <S s={{ width: 150, height: 48, borderRadius: 99 }} />
        </div>
        <section className="list">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="mc" key={i}>
              <span className="skl c" style={{ width: 48, height: 48 }} />
              <div className="t" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <S s={{ width: '60%', height: 14 }} />
                <S s={{ width: '40%', height: 12 }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
