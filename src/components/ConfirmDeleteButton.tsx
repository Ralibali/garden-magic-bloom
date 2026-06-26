import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDeleteButtonProps {
  itemName: string;
  description?: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export default function ConfirmDeleteButton({ itemName, description, onConfirm, disabled }: ConfirmDeleteButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Ta bort ${itemName}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort {itemName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description || 'Åtgärden går inte att ångra. Kontrollera att du verkligen vill ta bort uppgiften.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
