// Soft stage behind the glass: light blooms, frosted spheres and a blurred maple leaf.

// Maple leaf silhouette — Font Awesome "canadian-maple-leaf" (CC BY 4.0, fontawesome.com/license/free)
const MAPLE =
  "M383.8 351.7c2.5-2.5 105.2-92.4 105.2-92.4l-17.5-7.5c-10-4.9-7.4-11.5-5-17.4 2.4-7.6 20.1-67.3 20.1-67.3s-47.7 10-57.7 12.5c-7.5 2.4-10-2.5-12.5-7.5s-15-32.4-15-32.4-52.6 59.9-55.1 62.3c-10 7.5-20.1 0-17.6-10 0-10 27.6-129.6 27.6-129.6s-30.1 17.4-40.1 22.4c-7.5 5-12.6 5-17.6-5C293.5 72.3 255.9 0 255.9 0s-37.5 72.3-42.5 79.8c-5 10-10 10-17.6 5-10-5-40.1-22.4-40.1-22.4S183.3 182 183.3 192c2.5 10-7.5 17.5-17.6 10-2.5-2.5-55.1-62.3-55.1-62.3S98.1 167 95.6 172s-5 9.9-12.5 7.5C73 177 25.4 167 25.4 167s17.6 59.7 20.1 67.3c2.4 6 5 12.5-5 17.4L23 259.3s102.6 89.9 105.2 92.4c5.1 5 10 7.5 5.1 22.5-5.1 15-10.1 35.1-10.1 35.1s95.2-20.1 105.3-22.6c8.7-.9 18.3 2.5 18.3 12.5S241 512 241 512h30s-5.8-102.7-5.8-112.8 9.5-13.4 18.4-12.5c10 2.5 105.2 22.6 105.2 22.6s-5-20.1-10-35.1 0-17.5 5-22.5z";

function Maple({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 512 512" className={`maple ${className}`}>
      <path d={MAPLE} fill="currentColor" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="stage absolute inset-0" />

      {/* light blooms */}
      <div className="orb orb-glow animate-float-c left-[-8%] top-[35%] h-[420px] w-[420px] bg-[#c9d2ff]" />
      <div className="orb orb-glow animate-float-a right-[-6%] top-[10%] h-[380px] w-[380px] bg-[#e8e8ee]" />
      <div className="orb orb-glow animate-float-b bottom-[-10%] left-[40%] h-[520px] w-[520px] bg-[#8fa3d9]" />

      {/* blurred maple leaves */}
      <Maple className="animate-float-b right-[-4%] top-[38%] h-[460px] w-[460px] rotate-[14deg]" />
      <Maple className="maple-soft animate-float-a left-[-5%] top-[4%] h-[220px] w-[220px] -rotate-[18deg]" />

      {/* frosted spheres */}
      <div className="orb orb-chrome animate-float-a right-[8%] top-[18%] h-36 w-36" />
      <div className="orb orb-chrome animate-float-b left-[6%] top-[62%] h-20 w-20" />
    </div>
  );
}
