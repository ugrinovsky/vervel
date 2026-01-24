import { PropsWithChildren } from 'react';
import './styles.css';

export default function Screen({ children }: PropsWithChildren) {
  return <div className="screen flex flex-col md:flex-row items-stretch h-full">{children}</div>;
}
