// Dark stage with chrome spheres and soft light blooms that show through the glass.
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1b22_0%,#0b0b0d_60%)]" />

      {/* light blooms */}
      <div className="orb orb-glow animate-float-c left-[-8%] top-[35%] h-[420px] w-[420px] bg-[#c9d2ff]" />
      <div className="orb orb-glow animate-float-a right-[-6%] top-[10%] h-[380px] w-[380px] bg-[#e8e8ee]" />
      <div className="orb orb-glow animate-float-b bottom-[-10%] left-[40%] h-[520px] w-[520px] bg-[#8fa3d9]" />

      {/* chrome spheres */}
      <div className="orb orb-chrome animate-float-a right-[8%] top-[18%] h-40 w-40" />
      <div className="orb orb-chrome animate-float-b left-[6%] top-[62%] h-24 w-24" />
      <div className="orb orb-chrome animate-float-c bottom-[8%] right-[22%] h-16 w-16" />
    </div>
  );
}
