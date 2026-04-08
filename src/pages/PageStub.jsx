export default function PageStub({ title, subtitle }) {
  return (
    <section
      style={{
        background: "rgba(17, 24, 39, 0.88)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 800 }}>{title}</h1>
      <p style={{ color: "#d1d5db", marginBottom: 0 }}>{subtitle}</p>
    </section>
  );
}
