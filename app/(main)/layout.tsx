import AppFrame from '../ui/components/AppFrame';
import '../ui/styles/app-frame.css';
import './items/ui/styles/item.css';
import './lists/ui/styles/following-and-history.css';
import './lists/ui/styles/list.css';
import './users/ui/styles/avatar.css';

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <AppFrame>
      {children}
      {modal}
    </AppFrame>
  );
}
