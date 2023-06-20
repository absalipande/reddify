'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

const CloseModal = () => {
  const router = useRouter();

  return (
    <Button
      variant='subtle'
      className='h-6 w-6 p-0 rounded-md bg-zinc-900'
      onClick={() => router.back()}
    >
      <X aria-label='close modal' className='h-4 w-4 text-white' />
    </Button>
  );
};

export default CloseModal;
