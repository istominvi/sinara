import { InviteForm } from "@/components/teacher/invite-form";

export default function TeacherStudentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ученики и группы</h1>
      <p className="text-muted-foreground">
        TODO: создать группу, добавить ученика по email/телефону, инвайты.
      </p>
      <InviteForm />
    </div>
  );
}
