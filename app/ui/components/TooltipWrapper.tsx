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
    <div 
      className={`tooltip-container ${className || ''}`}
    >
      {children}
      {showTooltip && (
        <span className="tooltip">{tooltip}</span>
      )}
    </div>
    </>
  );
}