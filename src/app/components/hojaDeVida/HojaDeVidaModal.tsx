import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/app/components/ui/dialog';
import { X } from 'lucide-react';
import { useHojaDeVidaPorUsuario } from '@/hooks/useHojaDeVida';
import { HojaDeVidaView } from './HojaDeVidaView';

interface HojaDeVidaModalProps {
  idUsuario: number | null;
  isOpen: boolean;
  onClose: () => void;
  nombreUsuario?: string;
}

export function HojaDeVidaModal({
  idUsuario,
  isOpen,
  onClose,
  nombreUsuario = 'Usuario',
}: HojaDeVidaModalProps) {
  const { hoja, loading } = useHojaDeVidaPorUsuario(isOpen && idUsuario ? idUsuario : null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              Hoja de Vida - {nombreUsuario}
            </DialogTitle>
            <DialogClose className="opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <HojaDeVidaView hoja={hoja} loading={loading} puedeEditar={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
