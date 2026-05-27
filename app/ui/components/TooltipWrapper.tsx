export default function TooltipWrapper({
  children,
  tooltip,
  showTooltip = true,
  className,
}: {
  children: React.ReactNode;
  tooltip?: string;
  showTooltip?: boolean;
  className?: string;
}) {
  return (
    <>
      <div className={['tooltip-container', className].filter(Boolean).join(' ')}>
        {children}
        {showTooltip && <span className="tooltip">{tooltip}</span>}
      </div>
    </>
  );
}
