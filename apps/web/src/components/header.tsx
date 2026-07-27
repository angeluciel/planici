import { ArrowLeft } from 'lucide-react';

export default function Header() {
  return (
    <div className='min-w-full py-3 flex justify-start items-center'>
      <button className='p-3 rounded-md bg-surface-raised hover:bg-surface-raised-hovered shadow-raised transition-all duration-100 active:bg-surface-raised-pressed lg:hidden'>
        <ArrowLeft />
      </button>
    </div>
  );
}
