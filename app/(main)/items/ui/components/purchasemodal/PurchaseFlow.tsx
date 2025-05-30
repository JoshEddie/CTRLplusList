export default function PurchaseFlow({
    primary_text,
    secondary_text,
    children,
}: {
    primary_text: string;
    secondary_text?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="purchase-flow">
            <p>{primary_text}</p>
            {secondary_text && <p>{secondary_text}</p>}
            {children}
        </div>
    );
}