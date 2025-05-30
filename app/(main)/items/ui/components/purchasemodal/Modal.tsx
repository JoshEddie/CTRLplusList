import { LuX } from 'react-icons/lu';
import './modal.css';

export default function Modal({ 
  children, 
  className, 
  onClose,
}: { 
  children: React.ReactNode; 
  className?: string;
  onClose?: () => void;
}) {

  return (
    <div className={`modal-overlay ${className || ''}`}>
      <div 
        className="modal"
      >
        {children}
        <div className="close-button" onClick={onClose}><LuX /></div>
      </div>
    </div>
  );
}