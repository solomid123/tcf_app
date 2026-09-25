export function TrafficLights() {
  const dot = "h-3 w-3 rounded-full shadow-[0_1px_3px_rgba(0,0,0,.6)]";
  return (
    <div className="flex gap-2">
      <span className={`${dot} bg-[radial-gradient(circle_at_35%_30%,#ff8a80,#e0261b_60%,#8a0e08)]`} />
      <span className={`${dot} bg-[radial-gradient(circle_at_35%_30%,#fff3a0,#e8c21a_60%,#8a6b05)]`} />
      <span className={`${dot} bg-[radial-gradient(circle_at_35%_30%,#b6ff9e,#2fbf2a_60%,#0d6a0a)]`} />
    </div>
  );
}
