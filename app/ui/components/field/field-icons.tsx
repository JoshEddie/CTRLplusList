import { FaCalendarDays, FaEnvelope, FaLink } from 'react-icons/fa6';
import { MdSearch, MdTextFields } from 'react-icons/md';

export const FIELD_ICONS = {
  name: <MdTextFields aria-hidden="true" />,
  date: <FaCalendarDays aria-hidden="true" />,
  link: <FaLink aria-hidden="true" />,
  email: <FaEnvelope aria-hidden="true" />,
  search: <MdSearch aria-hidden="true" />,
} as const;
