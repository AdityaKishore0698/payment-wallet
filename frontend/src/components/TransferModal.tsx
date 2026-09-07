"use client";

import { Modal } from "@/components/Modal";
import { TransferForm } from "@/components/TransferForm";

export function TransferModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired after a successful transfer (modal stays open showing the result). */
  onDone?: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Send money">
      <TransferForm onSuccess={() => onDone?.()} />
    </Modal>
  );
}
