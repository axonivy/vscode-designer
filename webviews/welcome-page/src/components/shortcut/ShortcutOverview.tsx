import { ShortcutCard, type Shortcut } from './Shortcut';
import './ShortcutOverview.css';

export const ShortcutOverview = ({ shortcuts, columns }: { shortcuts: Array<Shortcut>; columns: number }) => {
  const columnCount = { '--column-count': columns } as React.CSSProperties;
  return (
    <div className='shortcut-grid' style={columnCount}>
      {shortcuts.map(s => (
        <ShortcutCard {...s} key={s.title} />
      ))}
    </div>
  );
};
