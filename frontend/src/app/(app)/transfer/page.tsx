"use client";

import { Card, CardBody } from "@/components/ui";
import { TransferForm } from "@/components/TransferForm";

export default function TransferPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Transfer
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send money instantly using a UPI-style ID.
        </p>
      </div>

      <Card>
        <CardBody>
          <TransferForm />
        </CardBody>
      </Card>
    </div>
  );
}
