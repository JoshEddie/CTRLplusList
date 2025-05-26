import { BsArrowDownShort, BsArrowUpShort } from 'react-icons/bs';

interface ReorderInputGroupProps {
  index: number;
  itemId: string;
  totalItems: number;
  onReorder: (itemId: string, newPosition: number) => void;
}

export default function ReorderInputGroup({
  index,
  itemId,
  totalItems,
  onReorder,
}: ReorderInputGroupProps) {
  const handlePositionChange = (newPosition: number) => {
    try {
      onReorder(itemId, newPosition);
    } catch (error) {
      console.error('Error updating position:', error);
    }
  };

  return (
    <div className="reorder-input-group">
      <button
        className="position-stepper"
        onClick={() => {
          const newPos = index;
          if (newPos >= 0) handlePositionChange(newPos);
        }}
        disabled={index <= 0}
        aria-label="Move item up"
      >
        <BsArrowUpShort size={30} />
      </button>
      <div className="reorder-input">
        <input
          type="number"
          min="1"
          // max={totalItems}
          placeholder={`${index + 1}`}
          defaultValue={index + 1}
          className="position-input"
          aria-label={`Current position ${index + 1}, enter new position between 1 and ${totalItems}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newPos = parseInt((e.target as HTMLInputElement).value);
              if (newPos >= 1 && newPos <= totalItems) {
                handlePositionChange(newPos - 1);
              }
              (e.target as HTMLInputElement).value = '';
            }
          }}
          onBlur={(e) => {
            if (e.target.value) {
              const newPos = parseInt(e.target.value);
              if (newPos >= 1 && newPos <= totalItems) {
                handlePositionChange(newPos - 1);
              }
              e.target.value = '';
            }
          }}
        />
      </div>
      <button
        className="position-stepper"
        onClick={() => {
          const newPos = index + 2;
          if (newPos <= totalItems) handlePositionChange(newPos);
        }}
        disabled={index >= totalItems - 1}
        aria-label="Move item down"
      >
        <BsArrowDownShort size={30} />
      </button>
    </div>
  );
}
